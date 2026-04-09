<script lang="ts">
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';
  import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
  import type { Snippet } from 'svelte';

  let { data, children }: { data: App.PageData; children: Snippet } = $props();
</script>

<svelte:head>
  <html lang="tr" />
  {@html `<style>:root{--primary:${data.settings?.primaryColor ?? '#e11d48'}}</style>`}
</svelte:head>

<Header user={data.user} settings={data.settings} />
<main>
  {@render children()}
</main>
<Footer settings={data.settings} />
<ToastContainer />
