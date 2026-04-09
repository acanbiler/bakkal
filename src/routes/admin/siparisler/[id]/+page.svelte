<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { enhance } from '$app/forms';

  let { data, form }: { data: any; form: any } = $props();

  const o = data.order;

  const paymentStatusLabels: Record<string, string> = {
    BEKLEMEDE: 'Beklemede', ISLENIYOR: 'İşleniyor', BASARILI: 'Başarılı',
    BASARISIZ: 'Başarısız', ZAMAN_ASIMI: 'Zaman Aşımı',
    IPTAL: 'İptal', IADE: 'İade', EYLEM_GEREKLI: 'Eylem Gerekli'
  };

  const shippingAddr = o.shippingAddress as any;
  const billingAddr = o.billingAddress as any;

  const subtotal = data.items.reduce((sum: number, item: any) => sum + Number(item.unitPrice) * item.quantity, 0);

  const canShip = o.status === 'ODEME_ALINDI' || o.status === 'HAZIRLANIYOR';
  const canCancel = o.paymentStatus === 'BASARILI' && o.status !== 'IPTAL' && o.status !== 'IADE';
  const canRefund = o.paymentStatus === 'BASARILI' && o.status !== 'IPTAL' && o.status !== 'IADE';

  let refundAmount = $state(String(Number(o.totalAmount).toFixed(2)));
</script>

<svelte:head>
  <title>Sipariş {o.id.slice(0, 8)} — Yönetim</title>
</svelte:head>

<div class="space-y-6 max-w-4xl">
  <!-- Header -->
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <a href="/admin/siparisler" class="text-sm text-gray-500 hover:underline">← {tr.admin.orders}</a>
      <h1 class="mt-1 text-2xl font-bold text-gray-900">Sipariş #{o.id.slice(0, 8)}</h1>
      <p class="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString('tr-TR')}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      {#if canShip}
        <form method="POST" action="?/mark-shipped" use:enhance>
          <button class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            {tr.admin.markShipped}
          </button>
        </form>
      {/if}
      {#if canCancel}
        <form method="POST" action="?/cancel" use:enhance>
          <button
            type="submit"
            onclick={(e) => { if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) e.preventDefault(); }}
            class="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >{tr.admin.cancelOrder}</button>
        </form>
      {/if}
    </div>
  </div>

  {#if form?.error}
    <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
      {#if form.action === 'mark-shipped'}Sipariş kargolandı olarak işaretlendi.
      {:else if form.action === 'cancel'}Sipariş iptal edildi.
      {:else if form.action === 'refund'}İade işlemi tamamlandı.
      {:else}İşlem başarılı.{/if}
    </div>
  {/if}

  <!-- Status & Payment -->
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <p class="text-xs text-gray-500 mb-1">Sipariş Durumu</p>
      <p class="font-semibold text-gray-900">{tr.orderStatus[o.status as keyof typeof tr.orderStatus]}</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <p class="text-xs text-gray-500 mb-1">Ödeme Durumu</p>
      <p class="font-semibold text-gray-900">{paymentStatusLabels[o.paymentStatus] ?? o.paymentStatus}</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <p class="text-xs text-gray-500 mb-1">Toplam Tutar</p>
      <p class="font-semibold text-gray-900">{Number(o.totalAmount).toFixed(2)} ₺</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <p class="text-xs text-gray-500 mb-1">Taksit</p>
      <p class="font-semibold text-gray-900">{o.installmentCount === 1 ? 'Tek Çekim' : `${o.installmentCount} Taksit`}</p>
    </div>
  </div>

  <!-- Order Items -->
  <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
    <div class="px-5 py-3 border-b border-gray-100">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ürünler</h2>
    </div>
    <table class="min-w-full divide-y divide-gray-100 text-sm">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-2 text-left font-medium text-gray-600">Ürün</th>
          <th class="px-4 py-2 text-right font-medium text-gray-600">Birim Fiyat</th>
          <th class="px-4 py-2 text-right font-medium text-gray-600">Adet</th>
          <th class="px-4 py-2 text-right font-medium text-gray-600">Ara Toplam</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        {#each data.items as item}
          {@const snapshot = item.productSnapshot as any}
          <tr>
            <td class="px-4 py-3">
              <p class="font-medium text-gray-900">{snapshot?.name ?? '—'}</p>
              <p class="text-xs text-gray-400 font-mono">{snapshot?.sku ?? ''}</p>
            </td>
            <td class="px-4 py-3 text-right text-gray-700">{Number(item.unitPrice).toFixed(2)} ₺</td>
            <td class="px-4 py-3 text-right text-gray-700">{item.quantity}</td>
            <td class="px-4 py-3 text-right font-semibold text-gray-900">
              {(Number(item.unitPrice) * item.quantity).toFixed(2)} ₺
            </td>
          </tr>
        {/each}
      </tbody>
      <tfoot class="bg-gray-50">
        <tr>
          <td colspan="3" class="px-4 py-2 text-right text-sm text-gray-600">Ara Toplam</td>
          <td class="px-4 py-2 text-right font-semibold">{subtotal.toFixed(2)} ₺</td>
        </tr>
        <tr>
          <td colspan="3" class="px-4 py-2 text-right text-sm font-bold text-gray-900">Toplam</td>
          <td class="px-4 py-2 text-right text-base font-bold text-gray-900">{Number(o.totalAmount).toFixed(2)} ₺</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Addresses -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div class="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Teslimat Adresi</h2>
      {#if shippingAddr}
        <p class="font-medium text-gray-900">{shippingAddr.fullName}</p>
        <p class="text-sm text-gray-600">{shippingAddr.phone}</p>
        <p class="text-sm text-gray-600">{shippingAddr.address}</p>
        <p class="text-sm text-gray-600">{shippingAddr.district}, {shippingAddr.city} {shippingAddr.zipCode ?? ''}</p>
      {/if}
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Fatura Adresi</h2>
      {#if billingAddr}
        <p class="font-medium text-gray-900">{billingAddr.fullName}</p>
        <p class="text-sm text-gray-600">{billingAddr.phone}</p>
        <p class="text-sm text-gray-600">{billingAddr.address}</p>
        <p class="text-sm text-gray-600">{billingAddr.district}, {billingAddr.city} {billingAddr.zipCode ?? ''}</p>
      {/if}
    </div>
  </div>

  <!-- Tami Reference Fields -->
  <div class="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
    <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Tami / Banka Referans Bilgileri</h2>
    <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
      <div class="flex flex-col gap-0.5">
        <dt class="text-xs text-gray-500">Tami Sipariş ID</dt>
        <dd class="font-mono text-gray-800">{o.tamiOrderId ?? '—'}</dd>
      </div>
      <div class="flex flex-col gap-0.5">
        <dt class="text-xs text-gray-500">Tami Korelasyon ID</dt>
        <dd class="font-mono text-gray-800">{o.tamiCorrelId ?? '—'}</dd>
      </div>
      <div class="flex flex-col gap-0.5">
        <dt class="text-xs text-gray-500">Banka Yetkilendirme Kodu</dt>
        <dd class="font-mono text-gray-800">{o.bankAuthCode ?? '—'}</dd>
      </div>
      <div class="flex flex-col gap-0.5">
        <dt class="text-xs text-gray-500">Banka Referans Numarası</dt>
        <dd class="font-mono text-gray-800">{o.bankRefNumber ?? '—'}</dd>
      </div>
    </dl>
  </div>

  <!-- Refund -->
  {#if canRefund}
    <div class="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">{tr.admin.refund}</h2>
      <form method="POST" action="?/refund" use:enhance class="flex gap-2 items-end">
        <div class="flex flex-col gap-1">
          <label for="refund-amount" class="text-xs font-medium text-gray-600">İade Tutarı (₺)</label>
          <input id="refund-amount" name="amount" type="number" step="0.01" min="0.01" bind:value={refundAmount}
            class="rounded-lg border border-gray-300 px-3 py-2 text-sm w-40" />
        </div>
        <button
          type="submit"
          onclick={(e) => { if (!confirm('Bu tutarı iade etmek istediğinize emin misiniz?')) e.preventDefault(); }}
          class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >{tr.admin.refund}</button>
      </form>
    </div>
  {/if}

  {#if o.notes}
    <div class="rounded-xl border border-gray-200 bg-white p-5">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Notlar</h2>
      <p class="text-sm text-gray-700">{o.notes}</p>
    </div>
  {/if}
</div>
