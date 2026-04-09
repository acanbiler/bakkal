<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import ProductCard from '$lib/components/shop/ProductCard.svelte';

  let { data }: { data: any } = $props();
</script>

<svelte:head>
  <title>{data.settings?.siteName ?? 'Otoparca'} — {tr.home.tagline}</title>
  <meta name="description" content="Türkiye'nin güvenilir otomobil yedek parça mağazası." />
</svelte:head>

<!-- Hero -->
<section class="bg-gradient-to-br from-gray-900 to-gray-700 py-20 text-white">
  <div class="mx-auto max-w-3xl px-4 text-center">
    <h1 class="mb-4 text-4xl font-extrabold leading-tight sm:text-5xl">
      {data.settings?.heroTitle ?? 'Doğru Parça, Hızlı Teslimat'}
    </h1>
    {#if data.settings?.heroSubtitle}
      <p class="mb-8 text-lg text-gray-300">{data.settings.heroSubtitle}</p>
    {/if}
    <form action="/urunler" method="get" class="flex gap-2">
      <input
        name="q"
        type="search"
        placeholder={tr.hero.searchPlaceholder}
        class="flex-1 rounded-full px-5 py-3 text-gray-900 focus:outline-none"
      />
      <button
        type="submit"
        class="rounded-full bg-[--primary] px-6 py-3 font-semibold hover:opacity-90"
      >
        {tr.hero.searchButton}
      </button>
    </form>
  </div>
</section>

<!-- Trust badges -->
<section class="border-b bg-white py-6">
  <div class="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:grid-cols-4">
    {#each [
      { icon: '🔒', label: tr.trustBadges.securePayment },
      { icon: '🚚', label: tr.trustBadges.fastShipping },
      { icon: '✅', label: tr.trustBadges.originalParts },
      { icon: '↩️', label: tr.trustBadges.easyReturns }
    ] as badge}
      <div class="flex items-center gap-3 text-sm font-medium text-gray-700">
        <span class="text-2xl">{badge.icon}</span>
        {badge.label}
      </div>
    {/each}
  </div>
</section>

<!-- Categories -->
{#if data.categories.length > 0}
  <section class="py-12">
    <div class="mx-auto max-w-7xl px-4">
      <h2 class="mb-6 text-xl font-bold text-gray-900">{tr.listing.category}</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {#each data.categories as cat}
          <a
            href="/urunler?kategori={cat.id}"
            class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-700 shadow-sm hover:border-[--primary] hover:text-[--primary] transition"
          >
            {#if cat.imageUrl}
              <img src={cat.imageUrl} alt={cat.name} class="h-10 w-10 rounded object-contain" />
            {/if}
            {cat.name}
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- Featured products -->
{#if data.featured.length > 0}
  <section class="pb-16">
    <div class="mx-auto max-w-7xl px-4">
      <h2 class="mb-6 text-xl font-bold text-gray-900">{tr.home.featuredProducts}</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {#each data.featured as product}
          <ProductCard {product} />
        {/each}
      </div>
      <div class="mt-8 text-center">
        <a
          href="/urunler"
          class="inline-block rounded-full border border-[--primary] px-8 py-2.5 text-sm font-semibold text-[--primary] hover:bg-[--primary] hover:text-white transition"
        >
          {tr.home.viewAll}
        </a>
      </div>
    </div>
  </section>
{/if}
