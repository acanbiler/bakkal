<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { cart } from '$lib/stores/cart.js';
</script>

<svelte:head>
  <title>{tr.cart.title}</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
  <h1 class="mb-6 text-2xl font-bold text-gray-900">{tr.cart.title}</h1>

  {#if $cart.length === 0}
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <p class="text-gray-500">{tr.cart.empty}</p>
      <a href="/urunler" class="rounded-xl bg-[--primary] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        {tr.cart.continueShopping}
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each $cart as item}
        <div class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <!-- Image -->
          <a href="/urunler/{item.slug}" class="shrink-0">
            {#if item.imageUrl}
              <img src={item.imageUrl} alt={item.name} class="h-20 w-20 rounded-lg object-contain p-1 bg-gray-50" />
            {:else}
              <div class="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 text-gray-400 text-xs">{tr.cart.noImage}</div>
            {/if}
          </a>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <a href="/urunler/{item.slug}" class="block text-sm font-semibold text-gray-900 hover:text-[--primary] line-clamp-2">
              {item.name}
            </a>
            <p class="mt-0.5 text-xs text-gray-400">{tr.product.sku}: {item.sku}</p>
            <p class="mt-1 text-sm font-bold text-[--primary]">{Number(item.price).toFixed(2)} ₺</p>
          </div>

          <!-- Quantity -->
          <div class="flex items-center rounded-lg border border-gray-300 shrink-0">
            <button
              onclick={() => {
                if (item.quantity <= 1) cart.remove(item.productId);
                else cart.updateQty(item.productId, item.quantity - 1);
              }}
              class="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-l-lg text-sm"
            >−</button>
            <span class="w-8 text-center text-sm font-medium">{item.quantity}</span>
            <button
              onclick={() => cart.updateQty(item.productId, item.quantity + 1)}
              class="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-r-lg text-sm"
            >+</button>
          </div>

          <!-- Line total -->
          <p class="w-20 shrink-0 text-right text-sm font-semibold text-gray-900">
            {(Number(item.price) * item.quantity).toFixed(2)} ₺
          </p>

          <!-- Remove -->
          <button
            onclick={() => cart.remove(item.productId)}
            class="shrink-0 text-gray-400 hover:text-red-500 transition"
            aria-label={tr.cart.remove}
          >✕</button>
        </div>
      {/each}

      <!-- Summary -->
      <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div class="flex items-center justify-between">
          <span class="text-base font-semibold text-gray-700">{tr.cart.total}</span>
          <span class="text-xl font-bold text-gray-900">
            {$cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0).toFixed(2)} ₺
          </span>
        </div>
        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <a href="/urunler" class="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 text-center">
            {tr.cart.continueShopping}
          </a>
          <a href="/odeme" class="rounded-xl bg-[--primary] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 text-center">
            {tr.cart.checkout}
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>
