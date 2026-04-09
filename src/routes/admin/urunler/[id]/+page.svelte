<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { enhance } from '$app/forms';

  let { data, form }: { data: any; form: any } = $props();
  const p = data.product;
</script>

<svelte:head>
  <title>{data.isNew ? tr.admin.newProduct : p?.name} — Yönetim</title>
</svelte:head>

<div class="space-y-6 max-w-4xl">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <a href="/admin/urunler" class="text-sm text-gray-500 hover:underline">← {tr.admin.products}</a>
      <h1 class="text-2xl font-bold text-gray-900">{data.isNew ? tr.admin.newProduct : p?.name}</h1>
    </div>
    {#if !data.isNew}
      <div class="flex gap-2">
        <form method="POST" action="?/toggle-active" use:enhance>
          <button class="rounded-xl border px-3 py-2 text-sm {p?.isActive ? 'border-green-400 text-green-700 bg-green-50' : 'border-gray-300 text-gray-600'} hover:opacity-80">
            {p?.isActive ? '✓ Aktif' : 'Pasif'}
          </button>
        </form>
        <form method="POST" action="?/toggle-featured" use:enhance>
          <button class="rounded-xl border px-3 py-2 text-sm {p?.isFeatured ? 'border-[--primary] text-[--primary] bg-red-50' : 'border-gray-300 text-gray-600'} hover:opacity-80">
            {p?.isFeatured ? '★ Öne Çıkan' : '☆ Öne Çıkar'}
          </button>
        </form>
        <form method="POST" action="?/delete" use:enhance>
          <button
            type="submit"
            onclick={(e) => { if (!confirm('Bu ürün silinsin mi?')) e.preventDefault(); }}
            class="rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >{tr.admin.delete}</button>
        </form>
      </div>
    {/if}
  </div>

  {#if form?.error}
    <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
  {/if}
  {#if form?.success}
    <div class="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Kaydedildi.</div>
  {/if}

  <!-- Main product form -->
  <form method="POST" action="?/save" use:enhance class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
    <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ürün Bilgileri</h2>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="sm:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600">Ad *</label>
        <input name="name" type="text" required value={p?.name ?? ''} minlength="2" maxlength="255"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Slug (boş bırakılırsa otomatik)</label>
        <input name="slug" type="text" value={p?.slug ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">SKU *</label>
        <input name="sku" type="text" required value={p?.sku ?? ''} maxlength="100"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Fiyat (₺) *</label>
        <input name="price" type="number" required step="0.01" min="0.01" value={p?.price ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Karşılaştırma Fiyatı (₺)</label>
        <input name="comparePrice" type="number" step="0.01" value={p?.comparePrice ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Stok Adedi *</label>
        <input name="stockQty" type="number" min="0" required value={p?.stockQty ?? 0}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Marka</label>
        <input name="brand" type="text" value={p?.brand ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Kategori *</label>
        <select name="categoryId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">— Seçin —</option>
          {#each data.categories as cat}
            <option value={cat.id} selected={cat.id === p?.categoryId}>{cat.name}</option>
          {/each}
        </select>
      </div>
      <div class="sm:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600">Açıklama</label>
        <textarea name="description" rows="3" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">{p?.description ?? ''}</textarea>
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Meta Başlık</label>
        <input name="metaTitle" type="text" value={p?.metaTitle ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600">Meta Açıklama</label>
        <input name="metaDescription" type="text" value={p?.metaDescription ?? ''}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </div>
    </div>

    <button type="submit" class="rounded-xl bg-[--primary] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
      {tr.admin.save}
    </button>
  </form>

  {#if !data.isNew}
    <!-- Images -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">Görseller</h2>

      {#if data.images.length > 0}
        <div class="flex flex-wrap gap-3">
          {#each data.images.sort((a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)) as img}
            <div class="relative rounded-lg border {img.isPrimary ? 'border-[--primary]' : 'border-gray-200'} p-1">
              <img src={img.url} alt={img.altText ?? ''} class="h-24 w-24 object-contain" />
              {#if img.isPrimary}
                <span class="absolute top-1 left-1 rounded bg-[--primary] px-1 py-0.5 text-xs text-white">Ana</span>
              {/if}
              <form method="POST" action="?/remove-image" use:enhance class="mt-1 text-center">
                <input type="hidden" name="imageId" value={img.id} />
                <button type="submit" class="text-xs text-red-500 hover:underline">{tr.admin.delete}</button>
              </form>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-gray-500">Henüz görsel yok.</p>
      {/if}

      <form method="POST" action="?/add-image" use:enhance class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input name="url" type="text" placeholder="Görsel URL" required
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input name="altText" type="text" placeholder="Alt metin"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" name="isPrimary" value="true" class="rounded" /> Ana görsel
          </label>
          <button type="submit" class="rounded-xl bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:opacity-90">Ekle</button>
        </div>
      </form>
    </div>

    <!-- Fitments -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide">{tr.product.compatibleVehicles}</h2>

      {#if data.fitments.length > 0}
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 text-left font-medium text-gray-600">Marka</th>
              <th class="px-3 py-2 text-left font-medium text-gray-600">Model</th>
              <th class="px-3 py-2 text-left font-medium text-gray-600">Yıl</th>
              <th class="px-3 py-2 text-left font-medium text-gray-600">Not</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each data.fitments as f}
              <tr>
                <td class="px-3 py-2">{f.make}</td>
                <td class="px-3 py-2">{f.model}</td>
                <td class="px-3 py-2">{f.yearFrom} – {f.yearTo}</td>
                <td class="px-3 py-2 text-gray-500">{f.notes ?? ''}</td>
                <td class="px-3 py-2 text-right">
                  <form method="POST" action="?/remove-fitment" use:enhance>
                    <input type="hidden" name="fitmentId" value={f.id} />
                    <button type="submit" class="text-xs text-red-500 hover:underline">{tr.admin.delete}</button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="text-sm text-gray-500">Araç uyumu eklenmemiş.</p>
      {/if}

      <form method="POST" action="?/add-fitment" use:enhance class="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <input name="make" type="text" placeholder="Marka *" required class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input name="model" type="text" placeholder="Model *" required class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input name="yearFrom" type="number" placeholder="Yıldan *" required class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input name="yearTo" type="number" placeholder="Yıla *" required class="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <div class="flex gap-2 items-center">
          <input name="notes" type="text" placeholder="Not" class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" class="rounded-xl bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:opacity-90">Ekle</button>
        </div>
      </form>
    </div>
  {/if}
</div>
