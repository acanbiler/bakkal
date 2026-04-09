<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import ProductCard from '$lib/components/shop/ProductCard.svelte';
  import { page } from '$app/stores';

  let { data }: { data: any } = $props();

  const sortOptions = [
    { value: '', label: tr.listing.sortNewest },
    { value: 'en_yeni', label: tr.listing.sortNewest },
    { value: 'fiyat_artan', label: tr.listing.sortPriceAsc },
    { value: 'fiyat_azalan', label: tr.listing.sortPriceDesc }
  ];

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(overrides)) {
      if (v == null || v === '') params.delete(k);
      else params.set(k, v);
    }
    params.delete('sayfa');
    return `/urunler?${params.toString()}`;
  }

  const totalPages = $derived(Math.ceil(data.total / 20));
</script>

<svelte:head>
  <title>Ürünler — {$page.url.searchParams.get('q') ? `"${$page.url.searchParams.get('q')}"` : 'Tüm Ürünler'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div class="flex flex-col gap-8 lg:flex-row">

    <!-- Sidebar filters -->
    <aside class="w-full shrink-0 lg:w-64">
      <form method="get" action="/urunler">
        <h2 class="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">{tr.listing.filters}</h2>

        <!-- Preserve search query -->
        {#if data.q}
          <input type="hidden" name="q" value={data.q} />
        {/if}

        <!-- Stock -->
        <label class="mb-4 flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" name="stokta" value="1" checked={data.params.stokta === '1'} />
          {tr.listing.inStockOnly}
        </label>

        <!-- Price range -->
        <div class="mb-4">
          <p class="mb-2 text-sm font-medium text-gray-700">{tr.listing.priceRange}</p>
          <div class="flex gap-2">
            <input
              name="min_fiyat"
              type="number"
              placeholder="Min"
              value={data.params.min_fiyat ?? ''}
              class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="max_fiyat"
              type="number"
              placeholder="Max"
              value={data.params.max_fiyat ?? ''}
              class="w-full rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
        </div>

        <!-- Brand facets -->
        {#if data.facets?.brand && Object.keys(data.facets.brand).length}
          <div class="mb-4">
            <p class="mb-2 text-sm font-medium text-gray-700">{tr.listing.brand}</p>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              {#each Object.entries(data.facets.brand) as [brand, count]}
                <label class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="marka" value={brand} checked={data.params.marka === brand} />
                  <span>{brand}</span>
                  <span class="ml-auto text-xs text-gray-400">({count})</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Vehicle filter -->
        <div class="mb-4">
          <p class="mb-2 text-sm font-medium text-gray-700">Araç Seçimi</p>
          <input name="arac_marka" type="text" placeholder={tr.listing.make} value={data.params.arac_marka ?? ''} class="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="arac_model" type="text" placeholder={tr.listing.model} value={data.params.arac_model ?? ''} class="mb-1 w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="arac_yil" type="number" placeholder={tr.listing.year} value={data.params.arac_yil ?? ''} class="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
        </div>

        <button type="submit" class="w-full rounded-lg bg-[--primary] py-2 text-sm font-semibold text-white hover:opacity-90">
          {tr.listing.filters} Uygula
        </button>
        <a href="/urunler" class="mt-2 block text-center text-xs text-gray-400 hover:underline">Filtreleri Temizle</a>
      </form>
    </aside>

    <!-- Main content -->
    <div class="flex-1">
      <!-- Toolbar -->
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-gray-500">
          {data.total} ürün bulundu
          {#if data.q}<span> — "<strong>{data.q}</strong>"</span>{/if}
        </p>
        <select
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          onchange={(e) => { window.location.href = buildUrl({ siralama: (e.target as HTMLSelectElement).value }); }}
        >
          {#each sortOptions as opt}
            <option value={opt.value} selected={data.siralama === opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      <!-- Results -->
      {#if data.hits.length === 0}
        <p class="py-16 text-center text-gray-500">{tr.listing.noResults}</p>
      {:else}
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {#each data.hits as product}
            <ProductCard {product} />
          {/each}
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
          <div class="mt-8 flex justify-center gap-2">
            {#if data.page > 1}
              <a href={buildUrl({ sayfa: String(data.page - 1) })} class="rounded border px-3 py-1 text-sm hover:bg-gray-100">‹</a>
            {/if}
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
              <a
                href={buildUrl({ sayfa: String(p) })}
                class="rounded border px-3 py-1 text-sm {p === data.page ? 'bg-[--primary] text-white border-[--primary]' : 'hover:bg-gray-100'}"
              >{p}</a>
            {/each}
            {#if data.page < totalPages}
              <a href={buildUrl({ sayfa: String(data.page + 1) })} class="rounded border px-3 py-1 text-sm hover:bg-gray-100">›</a>
            {/if}
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>
