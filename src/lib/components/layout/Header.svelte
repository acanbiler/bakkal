<script lang="ts">
  import { cart } from '$lib/stores/cart.js';
  import { tr } from '$lib/i18n/tr.js';

  let { user, settings }: { user: App.Locals['user']; settings: any } = $props();

  let cartCount = $derived($cart.reduce((sum, i) => sum + i.quantity, 0));
  let menuOpen = $state(false);
</script>

<header class="sticky top-0 z-50 bg-white shadow-sm">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between gap-4">
      <!-- Logo -->
      <a href="/" class="flex shrink-0 items-center gap-2">
        {#if settings?.logoUrl}
          <img src={settings.logoUrl} alt={settings.siteName ?? 'Otoparca'} class="h-8 w-auto" />
        {:else}
          <span class="text-xl font-bold text-[--primary]">{settings?.siteName ?? 'Otoparca'}</span>
        {/if}
      </a>

      <!-- Search -->
      <form action="/urunler" method="get" class="hidden flex-1 md:flex">
        <div class="relative w-full max-w-xl">
          <input
            name="q"
            type="search"
            placeholder={tr.hero.searchPlaceholder}
            class="w-full rounded-full border border-gray-300 py-2 pl-4 pr-10 text-sm focus:border-[--primary] focus:outline-none"
          />
          <button
            type="submit"
            aria-label={tr.nav.search}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[--primary]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          </button>
        </div>
      </form>

      <!-- Right actions -->
      <div class="flex items-center gap-3">
        <!-- Cart -->
        <a href="/sepet" class="relative flex items-center gap-1 text-sm text-gray-700 hover:text-[--primary]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm8 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" />
          </svg>
          <span class="hidden sm:inline">{tr.nav.cart}</span>
          {#if cartCount > 0}
            <span class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[--primary] text-xs font-bold text-white">
              {cartCount}
            </span>
          {/if}
        </a>

        <!-- Auth -->
        {#if user}
          <div class="relative hidden md:flex items-center gap-2">
            <a href="/hesabim" class="text-sm text-gray-700 hover:text-[--primary]">{tr.nav.account}</a>
            {#if user.role === 'ADMIN'}
              <a href="/admin" class="text-sm text-gray-700 hover:text-[--primary]">{tr.nav.admin}</a>
            {/if}
            <form action="/hesabim?/logout" method="post">
              <button type="submit" class="text-sm text-gray-500 hover:text-[--primary]">{tr.nav.logout}</button>
            </form>
          </div>
        {:else}
          <a href="/giris" class="hidden md:inline-flex items-center gap-1 rounded-full bg-[--primary] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">
            {tr.nav.login}
          </a>
        {/if}

        <!-- Mobile menu toggle -->
        <button
          class="md:hidden p-1 text-gray-600"
          onclick={() => (menuOpen = !menuOpen)}
          aria-label="Menü"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile search + nav -->
    {#if menuOpen}
      <div class="border-t pb-4 pt-2 md:hidden">
        <form action="/urunler" method="get" class="mb-3">
          <input
            name="q"
            type="search"
            placeholder={tr.hero.searchPlaceholder}
            class="w-full rounded-full border border-gray-300 py-2 px-4 text-sm focus:outline-none"
          />
        </form>
        <nav class="flex flex-col gap-2 text-sm text-gray-700">
          {#if user}
            <a href="/hesabim" class="hover:text-[--primary]">{tr.nav.account}</a>
            {#if user.role === 'ADMIN'}
              <a href="/admin" class="hover:text-[--primary]">{tr.nav.admin}</a>
            {/if}
            <form action="/hesabim?/logout" method="post">
              <button type="submit" class="text-left hover:text-[--primary]">{tr.nav.logout}</button>
            </form>
          {:else}
            <a href="/giris" class="hover:text-[--primary]">{tr.nav.login}</a>
          {/if}
        </nav>
      </div>
    {/if}
  </div>
</header>
