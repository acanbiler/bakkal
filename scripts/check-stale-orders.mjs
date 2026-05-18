// scripts/check-stale-orders.mjs
// Polls iyzico for orders stuck in ISLENIYOR past their expires_at.
// Run periodically (e.g. every 5 minutes via cron or docker healthcheck).
// Usage: node scripts/check-stale-orders.mjs
import postgres from 'postgres';
import { createHmac } from 'crypto';

const sql = postgres(process.env.DATABASE_URL);
const baseUrl = process.env.IYZICO_API_BASE_URL ?? 'https://sandbox-api.iyzipay.com';

function buildAuthorization(path, body, randomKey) {
  const requestBody = JSON.stringify(body ?? {});
  const signature = createHmac('sha256', process.env.IYZICO_SECRET_KEY)
    .update(`${randomKey}${path}${requestBody}`)
    .digest('hex');
  const authorization = `apiKey:${process.env.IYZICO_API_KEY}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authorization, 'utf8').toString('base64')}`;
}

async function iyzicoRequest(path, body) {
  const randomKey = `${Date.now()}${Math.random().toString().slice(2, 11)}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: buildAuthorization(path, body, randomKey),
      'x-iyzi-rnd': randomKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body ?? {})
  });
  if (!res.ok) throw new Error(`iyzico ${path} HTTP ${res.status}`);
  return res.json();
}

const staleOrders = await sql`
  SELECT id, iyzico_payment_id, iyzico_conversation_id, total_amount
  FROM orders
  WHERE payment_status = 'ISLENIYOR' AND expires_at < now()
`;

console.log(JSON.stringify({ level: 'info', msg: 'stale orders found', count: staleOrders.length }));

for (const order of staleOrders) {
  try {
    let result;
    try {
      result = await iyzicoRequest('/payment/detail', {
        locale: 'tr',
        paymentId: order.iyzico_payment_id,
        paymentConversationId: order.iyzico_conversation_id
      });
    } catch (e) {
      console.log(JSON.stringify({ level: 'warn', msg: 'iyzico query failed', orderId: order.id, error: String(e) }));
      continue;
    }

    if (result?.paymentStatus !== 'SUCCESS' || result?.fraudStatus === -1) {
      await sql`
        UPDATE orders
        SET payment_status = 'ZAMAN_ASIMI', updated_at = now()
        WHERE id = ${order.id}
      `;
      console.log(JSON.stringify({ level: 'info', msg: 'order timed out', orderId: order.id }));
    } else {
      await sql.begin(async (tx) => {
        const items = await tx`
          SELECT oi.product_id, oi.quantity
          FROM order_items oi
          WHERE oi.order_id = ${order.id}
        `;

        for (const item of items) {
          const [prod] = await tx`
            SELECT stock_qty FROM products WHERE id = ${item.product_id} FOR UPDATE
          `;
          if (!prod || prod.stock_qty < item.quantity) {
            throw new Error('STOCK_INSUFFICIENT');
          }
          await tx`
            UPDATE products SET stock_qty = stock_qty - ${item.quantity} WHERE id = ${item.product_id}
          `;
        }

        await tx`
          UPDATE orders
          SET status = 'ODEME_ALINDI',
              payment_status = 'BASARILI',
              bank_auth_code = ${result.authCode ?? null},
              bank_ref_number = ${result.hostReference ?? null},
              notes = ${result.itemTransactions ? JSON.stringify({ iyzicoItemTransactions: result.itemTransactions }) : null},
              updated_at = now()
          WHERE id = ${order.id}
        `;

        await tx`
          UPDATE payment_attempts
          SET status = 'BASARILI', resolved_at = now()
          WHERE order_id = ${order.id} AND iyzico_payment_id = ${order.iyzico_payment_id}
        `;
      });

      console.log(JSON.stringify({ level: 'info', msg: 'stale order completed (paid edge case)', orderId: order.id }));
    }
  } catch (e) {
    console.log(JSON.stringify({ level: 'error', msg: 'failed to process stale order', orderId: order.id, error: String(e) }));
  }
}

console.log(JSON.stringify({ level: 'info', msg: 'check-stale-orders done' }));
await sql.end();
