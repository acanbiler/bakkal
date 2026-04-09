<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { cart } from '$lib/stores/cart.js';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  const success = $derived($page.url.searchParams.get('durum') === 'basarili');

  onMount(() => {
    if (success) cart.clear();
  });
</script>

<svelte:head>
  <title>{success ? tr.payment.successTitle : tr.payment.failureTitle}</title>
</svelte:head>

<div class="mx-auto max-w-md px-4 py-20 text-center">
  {#if success}
    <div class="mb-6 text-5xl">✅</div>
    <h1 class="mb-2 text-2xl font-bold text-gray-900">{tr.payment.successTitle}</h1>
    <p class="mb-8 text-gray-600">{tr.payment.successMessage}</p>
    <a href="/hesabim" class="rounded-xl bg-[--primary] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
      {tr.payment.viewOrders}
    </a>
  {:else}
    <div class="mb-6 text-5xl">❌</div>
    <h1 class="mb-2 text-2xl font-bold text-gray-900">{tr.payment.failureTitle}</h1>
    <p class="mb-8 text-gray-600">{tr.payment.failureMessage}</p>
    <div class="flex justify-center gap-3">
      <a href="/odeme" class="rounded-xl bg-[--primary] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">
        Tekrar Dene
      </a>
      <a href="/sepet" class="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Sepete Dön
      </a>
    </div>
  {/if}
</div>
