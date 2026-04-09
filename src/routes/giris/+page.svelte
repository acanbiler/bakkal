<script lang="ts">
  import { enhance } from '$app/forms';
  import { tr } from '$lib/i18n/tr.js';

  let { form }: { form: { error?: string } | null } = $props();
</script>

<svelte:head>
  <title>{tr.auth.loginTitle} — Otoparca</title>
</svelte:head>

<div class="flex min-h-[70vh] items-center justify-center px-4 py-12">
  <div class="w-full max-w-sm">
    <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">{tr.auth.loginTitle}</h1>

    {#if form?.error}
      <div class="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
    {/if}

    <form method="post" use:enhance class="space-y-4">
      <div>
        <label for="email" class="mb-1 block text-sm font-medium text-gray-700">{tr.auth.email}</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[--primary] focus:outline-none"
        />
      </div>

      <div>
        <label for="password" class="mb-1 block text-sm font-medium text-gray-700">{tr.auth.password}</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[--primary] focus:outline-none"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-[--primary] py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        {tr.auth.loginButton}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-gray-600">
      {tr.auth.noAccount}
      <a href="/kayit" class="font-medium text-[--primary] hover:underline">{tr.auth.registerButton}</a>
    </p>
  </div>
</div>
