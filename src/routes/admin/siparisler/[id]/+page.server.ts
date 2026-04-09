import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { orders, orderItems, products } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { tamiRequest, newCorrelId } from '$lib/server/tami.js';

export const load: PageServerLoad = async ({ params }) => {
  const [order] = await db.select().from(orders).where(eq(orders.id, params.id));
  if (!order) redirect(302, '/admin/siparisler');

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, params.id));

  return { order, items };
};

export const actions: Actions = {
  'mark-shipped': async ({ params }) => {
    await db
      .update(orders)
      .set({ status: 'KARGOLANDI', updatedAt: new Date() })
      .where(eq(orders.id, params.id));
    return { success: true, action: 'mark-shipped' };
  },

  cancel: async ({ params }) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, params.id));
    if (!order) return fail(404, { error: 'Sipariş bulunamadı.' });
    if (order.paymentStatus !== 'BASARILI') return fail(409, { error: 'Bu sipariş iptal edilemez (ödeme başarılı değil).' });

    const correlId = newCorrelId();
    let res: any;
    try {
      res = await tamiRequest('/payment/cancel', { orderId: order.tamiOrderId }, correlId);
    } catch {
      return fail(502, { error: 'Tami ile iletişim kurulamadı.' });
    }
    if (!res?.success) return fail(502, { error: res?.errorMessage ?? 'Tami iptal hatası.' });

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, params.id));
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      await tx
        .update(orders)
        .set({ status: 'IPTAL', paymentStatus: 'IPTAL', updatedAt: new Date() })
        .where(eq(orders.id, params.id));
    });

    return { success: true, action: 'cancel' };
  },

  refund: async ({ request, params }) => {
    const data = await request.formData();
    const amount = String(data.get('amount') ?? '').trim() || undefined;

    const [order] = await db.select().from(orders).where(eq(orders.id, params.id));
    if (!order) return fail(404, { error: 'Sipariş bulunamadı.' });
    if (order.paymentStatus !== 'BASARILI') return fail(409, { error: 'Bu sipariş iade edilemez (ödeme başarılı değil).' });

    const refundAmount = amount ?? String(order.totalAmount);
    const isFullRefund = refundAmount === String(order.totalAmount);

    const correlId = newCorrelId();
    let res: any;
    try {
      res = await tamiRequest('/payment/refund', { orderId: order.tamiOrderId, amount: refundAmount }, correlId);
    } catch {
      return fail(502, { error: 'Tami ile iletişim kurulamadı.' });
    }
    if (!res?.success) return fail(502, { error: res?.errorMessage ?? 'Tami iade hatası.' });

    await db.transaction(async (tx) => {
      if (isFullRefund) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, params.id));
        for (const item of items) {
          await tx
            .update(products)
            .set({ stockQty: sql`${products.stockQty} + ${item.quantity}` })
            .where(eq(products.id, item.productId));
        }
      }
      await tx
        .update(orders)
        .set({ status: 'IADE', paymentStatus: 'IADE', updatedAt: new Date() })
        .where(eq(orders.id, params.id));
    });

    return { success: true, action: 'refund' };
  }
};
