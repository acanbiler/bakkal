<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { enhance } from '$app/forms';

  let { data, form }: { data: any; form: any } = $props();

  const s = data.settings;
  const social = (s.socialLinks ?? {}) as any;

  let primaryColor = $state(s.primaryColor ?? '#e11d48');
</script>

<svelte:head>
  <title>{tr.admin.settings} — Yönetim</title>
</svelte:head>

<div class="space-y-6 max-w-3xl">
  <h1 class="text-2xl font-bold text-gray-900">{tr.admin.settings}</h1>

  {#if form?.error}
    <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Ayarlar kaydedildi.</div>
  {/if}

  <form method="POST" action="?/save" use:enhance enctype="multipart/form-data" class="space-y-6">

    <!-- Branding -->
    <section class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Marka</h2>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Site Adı *</label>
        <input name="siteName" type="text" required value={s.siteName ?? ''} minlength="1" maxlength="100"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>

      <div class="flex gap-4 items-end">
        <div class="flex-1">
          <label class="mb-1 block text-xs font-medium text-gray-600">Ana Renk *</label>
          <input name="primaryColor" type="text" bind:value={primaryColor}
            placeholder="#e11d48" pattern="^#[0-9a-fA-F]{6}$"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Önizleme</label>
          <div class="h-9 w-16 rounded-lg border border-gray-200" style="background-color: {primaryColor}"></div>
        </div>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Logo (PNG veya SVG, maks. 2MB)</label>
        {#if s.logoUrl}
          <img src={s.logoUrl} alt="Logo" class="mb-2 h-12 object-contain" />
        {/if}
        <input name="logo" type="file" accept=".png,.svg,image/png,image/svg+xml"
          class="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200" />
      </div>
    </section>

    <!-- Hero -->
    <section class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ana Sayfa (Hero)</h2>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Başlık</label>
        <input name="heroTitle" type="text" value={s.heroTitle ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Alt Başlık</label>
        <input name="heroSubtitle" type="text" value={s.heroSubtitle ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Hero Görseli (JPEG, PNG veya WebP)</label>
        {#if s.heroImageUrl}
          <img src={s.heroImageUrl} alt="Hero" class="mb-2 h-24 w-full object-cover rounded-lg" />
        {/if}
        <input name="heroImage" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          class="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200" />
      </div>
    </section>

    <!-- Contact -->
    <section class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">İletişim</h2>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">E-posta</label>
          <input name="contactEmail" type="email" value={s.contactEmail ?? ''}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Telefon</label>
          <input name="contactPhone" type="tel" value={s.contactPhone ?? ''}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Adres</label>
          <textarea name="address" rows="2" value={s.address ?? ''}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"></textarea>
        </div>
      </div>
    </section>

    <!-- Social -->
    <section class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sosyal Medya</h2>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Facebook URL</label>
          <input name="facebook" type="url" value={social.facebook ?? ''}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Instagram URL</label>
          <input name="instagram" type="url" value={social.instagram ?? ''}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Twitter/X URL</label>
          <input name="twitter" type="url" value={social.twitter ?? ''}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>
    </section>

    <div class="flex justify-end">
      <button type="submit"
        class="rounded-xl bg-[--primary] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90">
        {tr.admin.save}
      </button>
    </div>
  </form>
</div>
