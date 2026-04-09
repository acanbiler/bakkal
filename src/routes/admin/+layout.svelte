<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { page } from '$app/stores';

  let { children }: { children: any } = $props();

  const navLinks = [
    { href: '/admin', label: tr.admin.dashboard },
    { href: '/admin/urunler', label: tr.admin.products },
    { href: '/admin/siparisler', label: tr.admin.orders },
    { href: '/admin/kategoriler', label: tr.admin.categories },
    { href: '/admin/ayarlar', label: tr.admin.settings }
  ];
</script>

<div class="flex min-h-screen bg-gray-100">
  <!-- Sidebar -->
  <aside class="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
    <div class="px-5 py-4 border-b border-gray-200">
      <a href="/" class="text-sm font-bold text-[--primary]">← Siteye Dön</a>
    </div>
    <nav class="flex-1 px-3 py-4 space-y-1">
      {#each navLinks as link}
        <a
          href={link.href}
          class="flex items-center rounded-lg px-3 py-2 text-sm font-medium transition
            {$page.url.pathname === link.href || ($page.url.pathname.startsWith(link.href) && link.href !== '/admin')
              ? 'bg-[--primary] text-white'
              : 'text-gray-700 hover:bg-gray-100'}"
        >
          {link.label}
        </a>
      {/each}
    </nav>
  </aside>

  <!-- Main content -->
  <main class="flex-1 overflow-auto p-8">
    {@render children()}
  </main>
</div>
