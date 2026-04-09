// scripts/check-stale-orders.mjs
// Polls Tami for orders stuck in ISLENIYOR past their expires_at.
// Run periodically (e.g. every 5 minutes via cron or docker healthcheck).
// Usage: node scripts/check-stale-orders.mjs
import postgres from 'postgres';
import { createHash } from 'crypto';

const sql = postgres(process.env.DATABASE_URL);

function buildAuthToken() {
  const merchant = process.env.TAMI_MERCHANT_NUMBER;
  const terminal = process.env.TAMI_TERMINAL_NUMBER;
  const secret = process.env.TAMI_SECRET_KEY;
  const hash = createHash('sha256').update(merchant + terminal + secret).digest('base64');
  return `${merchant}:${terminal}:${hash}`;
}

function newCorrelId() {
  return `Corr${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

async function tamiQuery(tamiOrderId) {
  const correlId = newCorrelId();
  const res = await fetch(`${process.env.TAMI_API_BASE_URL}/payment/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      CorrelationId: correlId,
      'PG-Auth-Token': buildAuthToken()
    },
    body: JSON.stringify({ orderId: tamiOrderId })
  });
  if (!res.ok) throw new Error(`Tami query HTTP ${res.status}`);
  return res.json();
}

const staleOrders = await sql`
  SELECT id, tami_order_id, total_amount
  FROM orders
  WHERE payment_status = 'ISLENIYOR' AND expires_at < now()
`;

console.log(JSON.stringify({ level: 'info', msg: 'stale orders found', count: staleOrders.length }));

for (const order of staleOrders) {
  try {
    let result;
    try {
      result = await tamiQuery(order.tami_order_id);
    } catch (e) {
      console.log(JSON.stringify({ level: 'warn', msg: 'tami query failed', orderId: order.id, error: String(e) }));
      continue;
    }

    if (!result?.paid) {
      // Not paid — mark as timed out
      await sql`
        UPDATE orders
        SET payment_status = 'ZAMAN_ASIMI', updated_at = now()
        WHERE id = ${order.id}
      `;
      console.log(JSON.stringify({ level: 'info', msg: 'order timed out', orderId: order.id }));
    } else {
      // Edge case: Tami says paid but we haven't processed it yet
      // Complete in a single transaction: lock/decrement stock, update order + payment_attempts
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
              bank_auth_code = ${result.bankAuthCode ?? null},
              bank_ref_number = ${result.bankReferenceNumber ?? null},
              updated_at = now()
          WHERE id = ${order.id}
        `;

        await tx`
          UPDATE payment_attempts
          SET status = 'BASARILI', resolved_at = now()
          WHERE order_id = ${order.id} AND tami_order_id = ${order.tami_order_id}
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
