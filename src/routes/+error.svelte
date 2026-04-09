<script lang="ts">
  import { page } from '$app/stores';
  import { tr } from '$lib/i18n/tr.js';
</script>

<svelte:head>
  <title>{$page.status === 404 ? 'Sayfa Bulunamadı' : 'Hata'} — Otoparca</title>
</svelte:head>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
  <p class="text-8xl font-black text-gray-200">{$page.status}</p>
  <h1 class="text-2xl font-bold text-gray-900">
    {$page.status === 404 ? tr.errors.notFound : $page.status === 403 ? tr.errors.forbidden : tr.errors.serverError}
  </h1>
  {#if $page.error?.message && $page.status !== 404}
    <p class="text-sm text-gray-500 max-w-md">{$page.error.message}</p>
  {/if}
  <a href="/" class="rounded-xl bg-[--primary] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90">
    Ana Sayfaya Dön
  </a>
</div>
