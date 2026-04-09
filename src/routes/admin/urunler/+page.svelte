<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';

  let { data, form }: { data: any; form: any } = $props();

  let csvFile: HTMLInputElement;
  const totalPages = $derived(Math.ceil(data.total / 25));

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    return `/admin/urunler?${params.toString()}`;
  }
</script>

<svelte:head>
  <title>{tr.admin.products} — Yönetim</title>
</svelte:head>

<div class="space-y-5">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h1 class="text-2xl font-bold text-gray-900">{tr.admin.products}</h1>
    <div class="flex gap-2">
      <!-- CSV import -->
      <form method="POST" action="?/csv-import" use:enhance enctype="multipart/form-data">
        <input bind:this={csvFile} type="file" name="csv" accept=".csv" class="hidden"
          onchange={(e) => (e.currentTarget.closest('form') as HTMLFormElement).requestSubmit()} />
        <button type="button" onclick={() => csvFile.click()}
          class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          {tr.admin.import}
        </button>
      </form>
      <a href="/admin/urunler/yeni"
        class="rounded-xl bg-[--primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
        {tr.admin.newProduct}
      </a>
    </div>
  </div>

  {#if form?.imported != null}
    <div class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
      {form.imported} ürün içe aktarıldı.
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
  {/if}

  <!-- Search -->
  <form method="get" class="flex gap-2">
    <input name="q" type="search" value={data.q} placeholder="Ürün adı veya SKU ara..."
      class="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
    <button type="submit" class="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Ara</button>
    {#if data.q}<a href="/admin/urunler" class="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Temizle</a>{/if}
  </form>

  <!-- Table -->
  <div class="overflow-x-auto rounded-xl border border-gray-200">
    <table class="min-w-full divide-y divide-gray-200 text-sm">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-gray-600">Ürün</th>
          <th class="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
          <th class="px-4 py-3 text-right font-medium text-gray-600">Fiyat</th>
          <th class="px-4 py-3 text-right font-medium text-gray-600">Stok</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Aktif</th>
          <th class="px-4 py-3 text-center font-medium text-gray-600">Öne Çıkan</th>
          <th class="px-4 py-3"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 bg-white">
        {#if data.products.length === 0}
          <tr><td colspan="7" class="py-10 text-center text-gray-500">Ürün bulunamadı.</td></tr>
        {/if}
        {#each data.products as product}
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium text-gray-900 max-w-xs">
              <span class="line-clamp-1">{product.name}</span>
              {#if product.brand}<span class="text-xs text-gray-400">{product.brand}</span>{/if}
            </td>
            <td class="px-4 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
            <td class="px-4 py-3 text-right font-semibold text-gray-900">{Number(product.price).toFixed(2)} ₺</td>
            <td class="px-4 py-3 text-right {product.stockQty === 0 ? 'text-red-600' : product.stockQty < 5 ? 'text-amber-600' : 'text-gray-700'} font-medium">
              {product.stockQty}
            </td>
            <td class="px-4 py-3 text-center">
              <span class="inline-block h-2.5 w-2.5 rounded-full {product.isActive ? 'bg-green-500' : 'bg-gray-300'}"></span>
            </td>
            <td class="px-4 py-3 text-center">
              <span class="inline-block h-2.5 w-2.5 rounded-full {product.isFeatured ? 'bg-[--primary]' : 'bg-gray-300'}"></span>
            </td>
            <td class="px-4 py-3 text-right">
              <a href="/admin/urunler/{product.id}" class="text-xs text-[--primary] hover:underline">{tr.admin.edit}</a>
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
