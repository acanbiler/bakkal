<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';

  let { data }: { data: any } = $props();
</script>

<svelte:head>
  <title>{tr.admin.dashboard} — Yönetim</title>
</svelte:head>

<div class="space-y-8">
  <h1 class="text-2xl font-bold text-gray-900">{tr.admin.dashboard}</h1>

  <!-- KPI cards -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-gray-500">{tr.admin.revenueToday}</p>
      <p class="mt-1 text-2xl font-bold text-gray-900">{Number(data.revenueToday ?? 0).toFixed(2)} ₺</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-gray-500">{tr.admin.revenueMonth}</p>
      <p class="mt-1 text-2xl font-bold text-gray-900">{Number(data.revenueMonth ?? 0).toFixed(2)} ₺</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-gray-500">{tr.admin.lowStock}</p>
      <p class="mt-1 text-2xl font-bold text-amber-600">{data.lowStock.length}</p>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p class="text-sm text-gray-500">Toplam Sipariş</p>
      <p class="mt-1 text-2xl font-bold text-gray-900">{data.recentOrders.length}</p>
    </div>
  </div>

  <!-- Low stock list -->
  {#if data.lowStock.length > 0}
    <div>
      <h2 class="mb-3 text-base font-semibold text-gray-800">{tr.admin.lowStock} Ürünler</h2>
      <div class="overflow-x-auto rounded-xl border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-600">Ürün</th>
              <th class="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
              <th class="px-4 py-3 text-right font-medium text-gray-600">Stok</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            {#each data.lowStock as product}
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
                <td class="px-4 py-3 text-right font-semibold {product.stockQty === 0 ? 'text-red-600' : 'text-amber-600'}">
                  {product.stockQty}
                </td>
                <td class="px-4 py-3 text-right">
                  <a href="/admin/urunler/{product.id}" class="text-xs text-[--primary] hover:underline">{tr.admin.edit}</a>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Recent orders -->
  <div>
    <h2 class="mb-3 text-base font-semibold text-gray-800">Son Siparişler</h2>
    <div class="overflow-x-auto rounded-xl border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Sipariş No</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Tarih</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Durum</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">Tutar</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          {#each data.recentOrders as order}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0,8).toUpperCase()}</td>
              <td class="px-4 py-3 text-gray-700">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</td>
              <td class="px-4 py-3">
                <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium
                  {order.status === 'TESLIM_EDILDI' ? 'bg-green-100 text-green-700' :
                   order.status === 'IPTAL' || order.status === 'IADE' ? 'bg-red-100 text-red-700' :
                   'bg-amber-100 text-amber-700'}">
                  {tr.orderStatus[order.status as keyof typeof tr.orderStatus] ?? order.status}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">{Number(order.totalAmount).toFixed(2)} ₺</td>
              <td class="px-4 py-3 text-right">
                <a href="/admin/siparisler/{order.id}" class="text-xs text-[--primary] hover:underline">{tr.admin.edit}</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>
