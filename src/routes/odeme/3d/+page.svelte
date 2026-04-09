<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let container: HTMLDivElement;

  onMount(() => {
    const html = sessionStorage.getItem('tami_3d_html') ?? '';
    sessionStorage.removeItem('tami_3d_html');
    if (!html) {
      window.location.href = '/odeme/sonuc?durum=basarisiz';
      return;
    }
    container.innerHTML = html;
    const form = container.querySelector('form');
    form?.submit();
  });
</script>

<svelte:head>
  <title>3D Güvenli Ödeme</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center">
  <p class="text-sm text-gray-500">Bankanıza yönlendiriliyorsunuz...</p>
</div>
<div bind:this={container} class="hidden"></div>
