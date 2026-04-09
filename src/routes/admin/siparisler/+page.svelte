<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { page } from '$app/stores';

  let { data }: { data: any } = $props();

  const totalPages = $derived(Math.ceil(data.total / 25));

  const ORDER_STATUSES = [
    'BEKLEMEDE', 'ODEME_BEKLENIYOR', 'ODEME_ALINDI',
    'HAZIRLANIYOR', 'KARGOLANDI', 'TESLIM_EDILDI', 'IPTAL', 'IADE'
  ];

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    return `/admin/siparisler?${params.toString()}`;
  }

  function statusBadgeClass(status: string) {
    switch (status) {
      case 'ODEME_ALINDI': case 'HAZIRLANIYOR': return 'bg-blue-100 text-blue-800';
      case 'KARGOLANDI': case 'TESLIM_EDILDI': return 'bg-green-100 text-green-800';
      case 'IPTAL': case 'IADE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function paymentBadgeClass(status: string) {
    switch (status) {
      case 'BASARILI': return 'bg-green-100 text-green-800';
      case 'BASARISIZ': case 'ZAMAN_ASIMI': return 'bg-red-100 text-red-800';
      case 'ISLENIYOR': return 'bg-yellow-100 text-yellow-800';
      case 'IADE': case 'IPTAL': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  const paymentStatusLabels: Record<string, string> = {
    BEKLEMEDE: 'Beklemede', ISLENIYOR: 'İşleniyor', BASARILI: 'Başarılı',
    BASARISIZ: 'Başarısız', ZAMAN_ASIMI: 'Zaman Aşımı',
    IPTAL: 'İptal', IADE: 'İade', EYLEM_GEREKLI: 'Eylem Gerekli'
  };
</script>

<svelte:head>
  <title>{tr.admin.orders} — Yönetim</title>
</svelte:head>

<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-bold text-gray-900">{tr.admin.orders}</h1>
    <span class="text-sm text-gray-500">{data.total} sipariş</span>
  </div>

  <!-- Filters -->
  <form method="get" class="flex flex-wrap gap-2 items-end">
    <div class="flex flex-col gap-1">
      <label for="durum" class="text-xs font-medium text-gray-600">Durum</label>
      <select id="durum" name="durum" value={data.status}
        class="rounded-xl border border-gray-300 px-3 py-2 text-sm bg-white">
        <option value="">Tümü</option>
        {#each ORDER_STATUSES as s}
          <option value={s} selected={data.status === s}>{tr.orderStatus[s as keyof typeof tr.orderStatus]}</option>
        {/each}
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label for="tarih_baslangic" class="text-xs font-medium text-gray-600">Başlangıç Tarihi</label>
      <input id="tarih_baslangic" name="tarih_baslangic" type="date" value={data.dateFrom}
        class="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
    </div>
    <div class="flex flex-col gap-1">
      <label for="tarih_bitis" class="text-xs font-medium text-gray-600">Bitiş Tarihi</label>
      <input id="tarih_bitis" name="tarih_bitis" type="date" value={data.dateTo}
        class="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
    </div>
    <button type="submit" class="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Filtrele</button>
    {#if data.status || data.dateFrom || data.dateTo}
      <a href="/admin/siparisler" class="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Temizle</a>
    {/if}
  </form>

  <!-- Table -->
  <div class="overflow-x-auto rounded-xl border border-gray-200">
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Sipariş ID</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Müşteri</th>
          <th class="px-4 py-3 text-right font-medium text-gray-600">Tutar</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Durum</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Ödeme</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Tarih</th>
          <th class="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        {#if data.orders.length === 0}
          <tr><td colspan="7" class="py-10 text-center text-gray-500">Sipariş bulunamadı.</td></tr>
        {/if}
        {#each data.orders as order}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}…</td>
            <td class="px-4 py-3 text-gray-700 max-w-xs">
              <span class="line-clamp-1">{order.guestEmail ?? '—'}</span>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-gray-900">
              {Number(order.totalAmount).toFixed(2)} ₺
            </td>
            <td class="px-4 py-3 text-center">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadgeClass(order.status)}">
                {tr.orderStatus[order.status as keyof typeof tr.orderStatus]}
              </span>
            </td>
            <td class="px-4 py-3 text-center">
              <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {paymentBadgeClass(order.paymentStatus)}">
                {paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
              {new Date(order.createdAt).toLocaleDateString('tr-TR')}
            </td>
            <td class="px-4 py-3 text-right">
              <a href="/admin/siparisler/{order.id}" class="text-xs text-[--primary] hover:underline">Detay</a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  {#if totalPages > 1}
    <div class="flex justify-center gap-1">
      {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
        <a href={buildUrl({ sayfa: String(p) })}
          class="rounded border px-3 py-1 text-sm {p === data.page ? 'bg-[--primary] text-white border-[--primary]' : 'hover:bg-gray-100'}">{p}</a>
      {/each}
    </div>
  {/if}
</div>
