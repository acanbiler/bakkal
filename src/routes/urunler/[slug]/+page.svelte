<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { cart } from '$lib/stores/cart.js';
  import { toasts } from '$lib/stores/toast.js';
  import ImageGallery from '$lib/components/shop/ImageGallery.svelte';
  import FitmentTable from '$lib/components/shop/FitmentTable.svelte';
  import ProductCard from '$lib/components/shop/ProductCard.svelte';

  let { data }: { data: any } = $props();

  let qty = $state(1);

  const primaryImage = $derived(
    data.images.find((i: any) => i.isPrimary)?.url ?? data.images[0]?.url ?? ''
  );

  const canonicalUrl = $derived(`/urunler/${data.product.slug}`);

  const jsonLd = $derived(JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.product.name,
    description: data.product.description ?? '',
    sku: data.product.sku,
    brand: data.product.brand ? { '@type': 'Brand', name: data.product.brand } : undefined,
    image: primaryImage,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TRY',
      price: data.product.price,
      availability: data.product.stockQty > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock'
    }
  }));

  function addToCart() {
    cart.add({
      productId: data.product.id,
      name: data.product.name,
      slug: data.product.slug,
      sku: data.product.sku,
      price: Number(data.product.price),
      imageUrl: primaryImage,
      stockQty: data.product.stockQty
    });
    toasts.add(data.product.name + ' sepete eklendi.', 'success');
  }

  const stockLabel = $derived(
    data.product.stockQty === 0
      ? tr.product.outOfStock
      : data.product.stockQty <= 5
        ? tr.product.lowStock
        : tr.product.inStock
  );

  const stockColor = $derived(
    data.product.stockQty === 0
      ? 'text-red-600'
      : data.product.stockQty <= 5
        ? 'text-amber-600'
        : 'text-green-600'
  );
</script>

<svelte:head>
  <title>{data.product.metaTitle ?? data.product.name}</title>
  <meta name="description" content={data.product.metaDescription ?? data.product.description ?? ''} />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:title" content={data.product.metaTitle ?? data.product.name} />
  <meta property="og:description" content={data.product.metaDescription ?? data.product.description ?? ''} />
  {#if primaryImage}
    <meta property="og:image" content={primaryImage} />
  {/if}
  <meta property="og:type" content="product" />
  <!-- svelte-ignore svelte_element_invalid_self_closing_tag -->
  <script type="application/ld+json">{@html jsonLd}</script>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <!-- Breadcrumb -->
  <nav class="mb-6 text-sm text-gray-500">
    <a href="/" class="hover:underline">Ana Sayfa</a>
    <span class="mx-2">›</span>
    <a href="/urunler" class="hover:underline">Ürünler</a>
    {#if data.category}
      <span class="mx-2">›</span>
      <a href="/urunler?kategori={data.category.slug}" class="hover:underline">{data.category.name}</a>
    {/if}
    <span class="mx-2">›</span>
    <span class="text-gray-900">{data.product.name}</span>
  </nav>

  <!-- Main product section -->
  <div class="grid grid-cols-1 gap-10 lg:grid-cols-2">
    <!-- Left: Gallery -->
    <ImageGallery images={data.images} productName={data.product.name} />

    <!-- Right: Details -->
    <div class="flex flex-col gap-4">
      {#if data.product.brand}
        <p class="text-sm font-medium uppercase tracking-wider text-gray-400">{data.product.brand}</p>
      {/if}

      <h1 class="text-2xl font-bold text-gray-900 leading-tight">{data.product.name}</h1>

      <p class="text-sm text-gray-500">{tr.product.sku}: <span class="font-mono text-gray-700">{data.product.sku}</span></p>

      <!-- Price -->
      <div class="flex items-end gap-3">
        {#if data.product.comparePrice && Number(data.product.comparePrice) > Number(data.product.price)}
          <span class="text-xl text-gray-400 line-through">{Number(data.product.comparePrice).toFixed(2)} ₺</span>
        {/if}
        <span class="text-3xl font-bold text-[--primary]">{Number(data.product.price).toFixed(2)} ₺</span>
      </div>

      <!-- Stock -->
      <p class="text-sm font-medium {stockColor}">{stockLabel}</p>

      <!-- Quantity + Add to Cart -->
      {#if data.product.stockQty > 0}
        <div class="flex items-center gap-3">
          <div class="flex items-center rounded-lg border border-gray-300">
            <button
              onclick={() => qty = Math.max(1, qty - 1)}
              class="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-l-lg"
            >−</button>
            <span class="w-10 text-center text-sm font-medium">{qty}</span>
            <button
              onclick={() => qty = Math.min(data.product.stockQty, qty + 1)}
              class="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-r-lg"
            >+</button>
          </div>

          <button
            onclick={() => { for (let i = 0; i < qty; i++) addToCart(); }}
            class="flex-1 rounded-xl bg-[--primary] py-3 text-sm font-semibold text-white hover:opacity-90 transition"
          >
            {tr.product.addToCart}
          </button>
        </div>
      {:else}
        <button disabled class="rounded-xl bg-gray-300 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed">
          {tr.product.outOfStock}
        </button>
      {/if}

      <!-- Description -->
      {#if data.product.description}
        <div class="mt-4 border-t pt-4">
          <h2 class="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">{tr.product.description}</h2>
          <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{data.product.description}</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Fitment table -->
  <FitmentTable fitments={data.fitments} />

  <!-- Related products -->
  {#if data.related.length > 0}
    <section class="mt-12">
      <h2 class="mb-4 text-lg font-semibold text-gray-900">{tr.product.relatedProducts}</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {#each data.related as product}
          <ProductCard {product} />
        {/each}
      </div>
    </section>
  {/if}
</div>
