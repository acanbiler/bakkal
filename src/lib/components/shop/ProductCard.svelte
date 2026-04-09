<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { cart } from '$lib/stores/cart.js';
  import { toasts } from '$lib/stores/toast.js';

  let { product }: { product: any } = $props();

  function addToCart() {
    cart.add({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      imageUrl: product.primary_image_url,
      stockQty: product.stock_qty
    });
    toasts.add(product.name + ' sepete eklendi.', 'success');
  }
</script>

<div class="group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md">
  <a href="/urunler/{product.slug}" class="overflow-hidden rounded-t-xl">
    {#if product.primary_image_url}
      <img
        src={product.primary_image_url}
        alt={product.name}
        class="h-48 w-full object-contain p-4 transition group-hover:scale-105"
        loading="lazy"
      />
    {:else}
      <div class="flex h-48 items-center justify-center bg-gray-100 text-gray-400 text-sm">Görsel yok</div>
    {/if}
  </a>

  <div class="flex flex-1 flex-col gap-1 p-4">
    {#if product.brand}
      <p class="text-xs font-medium uppercase tracking-wide text-gray-400">{product.brand}</p>
    {/if}
    <a href="/urunler/{product.slug}" class="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-[--primary]">
      {product.name}
    </a>
    <p class="text-xs text-gray-400">{tr.product.sku}: {product.sku}</p>

    <div class="mt-auto flex items-end justify-between pt-2">
      <div class="flex flex-col">
        {#if product.compare_price && product.compare_price > product.price}
          <span class="text-xs text-gray-400 line-through">{Number(product.compare_price).toFixed(2)} ₺</span>
        {/if}
        <span class="text-base font-bold text-[--primary]">{Number(product.price).toFixed(2)} ₺</span>
      </div>

      <button
        onclick={addToCart}
        disabled={product.stock_qty < 1}
        class="rounded-lg bg-[--primary] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {product.stock_qty < 1 ? tr.product.outOfStock : tr.listing.addToCart}
      </button>
    </div>
  </div>
</div>
