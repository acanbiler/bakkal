<script lang="ts">
  let { settings }: { settings: any } = $props();
</script>

<footer class="mt-16 border-t bg-gray-900 text-gray-300">
  <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <!-- Brand -->
      <div>
        {#if settings?.logoUrl}
          <img src={settings.logoUrl} alt={settings?.siteName ?? 'Otoparca'} class="h-8 w-auto brightness-0 invert" />
        {:else}
          <span class="text-lg font-bold text-white">{settings?.siteName ?? 'Otoparca'}</span>
        {/if}
        <p class="mt-2 text-sm">Orijinal ve yedek otomobil parçaları.</p>
      </div>

      <!-- Contact -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-white">İletişim</h3>
        <ul class="space-y-1 text-sm">
          {#if settings?.contactEmail}
            <li><a href="mailto:{settings.contactEmail}" class="hover:text-white">{settings.contactEmail}</a></li>
          {/if}
          {#if settings?.contactPhone}
            <li><a href="tel:{settings.contactPhone}" class="hover:text-white">{settings.contactPhone}</a></li>
          {/if}
          {#if settings?.address}
            <li>{settings.address}</li>
          {/if}
        </ul>
      </div>

      <!-- Social -->
      <div>
        <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Sosyal Medya</h3>
        <div class="flex gap-4 text-sm">
          {#if settings?.socialLinks?.instagram}
            <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" class="hover:text-white">Instagram</a>
          {/if}
          {#if settings?.socialLinks?.facebook}
            <a href={settings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" class="hover:text-white">Facebook</a>
          {/if}
          {#if settings?.socialLinks?.twitter}
            <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" class="hover:text-white">Twitter</a>
          {/if}
        </div>
      </div>
    </div>

    <div class="mt-8 border-t border-gray-700 pt-6 text-center text-xs text-gray-500">
      &copy; {new Date().getFullYear()} {settings?.siteName ?? 'Otoparca'}. Tüm hakları saklıdır.
    </div>
  </div>
</footer>
