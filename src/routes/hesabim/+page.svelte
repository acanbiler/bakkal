<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';

  let { data }: { data: any } = $props();
</script>

<svelte:head>
  <title>{tr.account.title}</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
  <h1 class="mb-6 text-2xl font-bold text-gray-900">{tr.account.title}</h1>

  <h2 class="mb-4 text-base font-semibold text-gray-700">{tr.account.orders}</h2>

  {#if data.orders.length === 0}
    <p class="py-12 text-center text-gray-500">{tr.account.noOrders}</p>
  {:else}
    <div class="overflow-x-auto rounded-xl border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Sipariş No</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">{tr.account.orderDate}</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">{tr.account.orderStatus}</th>
            <th class="px-4 py-3 text-right font-medium text-gray-600">{tr.account.orderTotal}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          {#each data.orders as order}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8).toUpperCase()}</td>
              <td class="px-4 py-3 text-gray-700">
                {new Date(order.createdAt).toLocaleDateString('tr-TR')}
              </td>
              <td class="px-4 py-3">
                <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium
                  {order.status === 'TESLIM_EDILDI' ? 'bg-green-100 text-green-700' :
                   order.status === 'IPTAL' || order.status === 'IADE' ? 'bg-red-100 text-red-700' :
                   'bg-amber-100 text-amber-700'}">
                  {tr.orderStatus[order.status as keyof typeof tr.orderStatus] ?? order.status}
                </span>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900">
                {Number(order.totalAmount).toFixed(2)} ₺
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
