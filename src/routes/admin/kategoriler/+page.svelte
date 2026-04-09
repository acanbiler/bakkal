<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { enhance } from '$app/forms';

  let { data, form }: { data: any; form: any } = $props();

  let editing = $state<any>(null);
  let creating = $state(false);

  // Build parent map for display
  const parentMap = $derived(
    Object.fromEntries(data.categories.map((c: any) => [c.id, c.name]))
  );

  // Top-level only (no parent)
  const roots = $derived(data.categories.filter((c: any) => !c.parentId));
  const children = $derived((parentId: string) =>
    data.categories.filter((c: any) => c.parentId === parentId)
  );
</script>

<svelte:head>
  <title>{tr.admin.categories} — Yönetim</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-gray-900">{tr.admin.categories}</h1>
    <button
      onclick={() => { creating = true; editing = null; }}
      class="rounded-xl bg-[--primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
    >
      + Yeni Kategori
    </button>
  </div>

  {#if form?.error}
    <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
  {/if}

  <!-- Create form -->
  {#if creating}
    <div class="rounded-xl border border-gray-200 bg-white p-5">
      <h2 class="mb-4 text-sm font-semibold text-gray-700">Yeni Kategori</h2>
      <form method="POST" action="?/create" use:enhance class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Ad *</label>
          <input name="name" type="text" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Üst Kategori</label>
          <select name="parentId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">— Yok —</option>
            {#each data.categories as cat}
              <option value={cat.id}>{cat.name}</option>
            {/each}
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Görsel URL</label>
          <input name="imageUrl" type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="/uploads/..." />
        </div>
        <div class="sm:col-span-2 flex gap-2">
          <button type="submit" class="rounded-xl bg-[--primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{tr.admin.save}</button>
          <button type="button" onclick={() => creating = false} class="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">{tr.admin.cancel}</button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Edit form -->
  {#if editing}
    <div class="rounded-xl border border-[--primary] bg-white p-5">
      <h2 class="mb-4 text-sm font-semibold text-gray-700">Kategori Düzenle</h2>
      <form method="POST" action="?/update" use:enhance class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={editing.id} />
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Ad *</label>
          <input name="name" type="text" required value={editing.name} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Üst Kategori</label>
          <select name="parentId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">— Yok —</option>
            {#each data.categories.filter((c: any) => c.id !== editing.id) as cat}
              <option value={cat.id} selected={cat.id === editing.parentId}>{cat.name}</option>
            {/each}
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600">Görsel URL</label>
          <input name="imageUrl" type="text" value={editing.imageUrl ?? ''} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="sm:col-span-2 flex gap-2">
          <button type="submit" class="rounded-xl bg-[--primary] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">{tr.admin.save}</button>
          <button type="button" onclick={() => editing = null} class="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">{tr.admin.cancel}</button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Category tree -->
  <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
    {#if data.categories.length === 0}
      <p class="py-10 text-center text-sm text-gray-500">Henüz kategori yok.</p>
    {:else}
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Ad</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Üst</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each data.categories as cat}
            <tr class="hover:bg-gray-50 {cat.parentId ? 'pl-8' : ''}">
              <td class="px-4 py-3 font-medium text-gray-900 {cat.parentId ? 'pl-8' : ''}">
                {cat.parentId ? '└ ' : ''}{cat.name}
              </td>
              <td class="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
              <td class="px-4 py-3 text-gray-600 text-xs">{cat.parentId ? (parentMap[cat.parentId] ?? '—') : '—'}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-3">
                  <button
                    onclick={() => { editing = cat; creating = false; }}
                    class="text-xs text-[--primary] hover:underline"
                  >{tr.admin.edit}</button>
                  <form method="POST" action="?/delete" use:enhance>
                    <input type="hidden" name="id" value={cat.id} />
                    <button
                      type="submit"
                      onclick={(e) => { if (!confirm('Silinsin mi?')) e.preventDefault(); }}
                      class="text-xs text-red-500 hover:underline"
                    >{tr.admin.delete}</button>
                  </form>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
