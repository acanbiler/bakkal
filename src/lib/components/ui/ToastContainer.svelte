<script lang="ts">
  import { toasts } from '$lib/stores/toast.js';
</script>

<div class="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
  {#each $toasts as toast (toast.id)}
    <div
      class="pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 shadow-lg text-sm text-white
        {toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}"
    >
      <span class="flex-1">{toast.message}</span>
      <button onclick={() => toasts.remove(toast.id)} class="shrink-0 opacity-70 hover:opacity-100" aria-label="Kapat">✕</button>
    </div>
  {/each}
</div>
