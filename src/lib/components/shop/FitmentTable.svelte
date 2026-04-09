<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  let { fitments }: { fitments: Array<{make: string; model: string; yearFrom: number; yearTo: number; notes?: string | null}> } = $props();
</script>

{#if fitments.length}
  <section class="mt-8">
    <h2 class="mb-3 text-lg font-semibold text-gray-900">{tr.product.compatibleVehicles}</h2>
    <div class="overflow-x-auto rounded-xl border border-gray-200">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Marka</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Model</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Yıl</th>
            <th class="px-4 py-3 text-left font-medium text-gray-600">Not</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          {#each fitments as f}
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{f.make}</td>
              <td class="px-4 py-3 text-gray-700">{f.model}</td>
              <td class="px-4 py-3 text-gray-700">{f.yearFrom} – {f.yearTo}</td>
              <td class="px-4 py-3 text-gray-500">{f.notes ?? ''}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
{/if}
