<script lang="ts">
  let { images, productName }: {
    images: Array<{ id: string; url: string; altText?: string | null; isPrimary: boolean; sortOrder: number }>;
    productName: string;
  } = $props();

  const sorted = $derived([...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.sortOrder - b.sortOrder;
  }));

  let activeIndex = $state(0);
  const activeImage = $derived(sorted[activeIndex]);
</script>

{#if sorted.length === 0}
  <div class="flex h-80 items-center justify-center rounded-xl bg-gray-100 text-gray-400 text-sm">
    Görsel yok
  </div>
{:else}
  <div class="flex flex-col gap-3">
    <!-- Main image -->
    <div class="overflow-hidden rounded-xl bg-gray-50">
      <img
        src={activeImage.url}
        alt={activeImage.altText ?? productName}
        class="h-80 w-full object-contain p-4"
      />
    </div>

    <!-- Thumbnails -->
    {#if sorted.length > 1}
      <div class="flex gap-2 overflow-x-auto pb-1">
        {#each sorted as img, i}
          <button
            onclick={() => activeIndex = i}
            class="shrink-0 overflow-hidden rounded-lg border-2 transition {i === activeIndex ? 'border-[--primary]' : 'border-transparent hover:border-gray-300'}"
          >
            <img
              src={img.url}
              alt={img.altText ?? productName}
              class="h-16 w-16 object-contain p-1"
              loading="lazy"
            />
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
