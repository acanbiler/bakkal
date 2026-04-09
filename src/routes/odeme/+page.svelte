<script lang="ts">
  import { tr } from '$lib/i18n/tr.js';
  import { cart } from '$lib/stores/cart.js';
  import { toasts } from '$lib/stores/toast.js';
  import { goto } from '$app/navigation';

  let { data }: { data: any } = $props();

  // Step management
  let step = $state(1); // 1=address, 2=payment, 3=review

  // Address form
  let fullName = $state('');
  let phone = $state('');
  let address = $state('');
  let district = $state('');
  let city = $state('');
  let zipCode = $state('');
  let selectedSavedAddress = $state('');

  // Card form
  let cardNumber = $state('');
  let cardHolder = $state('');
  let expiry = $state('');
  let cvv = $state('');
  let installments: any[] = $state([]);
  let selectedInstallment = $state(1);
  let binLoading = $state(false);

  // Derived totals
  const cartTotal = $derived($cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0));

  function applySavedAddress(id: string) {
    const saved = data.savedAddresses.find((a: any) => a.id === id);
    if (!saved) return;
    fullName = saved.fullName;
    phone = saved.phone;
    address = saved.address;
    district = saved.district;
    city = saved.city;
    zipCode = saved.zipCode ?? '';
  }

  $effect(() => {
    if (selectedSavedAddress) applySavedAddress(selectedSavedAddress);
  });

  async function lookupBin() {
    const digits = cardNumber.replace(/\s/g, '');
    if (digits.length < 6) { installments = []; return; }
    binLoading = true;
    try {
      const res = await fetch('/api/bin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bin: digits.slice(0, 8) })
      });
      if (res.ok) {
        const json = await res.json();
        installments = json.installments ?? [];
      }
    } catch {
      // non-fatal
    } finally {
      binLoading = false;
    }
  }

  let submitting = $state(false);

  async function submitOrder() {
    submitting = true;
    try {
      const res = await fetch('/api/odeme/baslat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: $cart,
          shippingAddress: { fullName, phone, address, district, city, zipCode },
          card: {
            cardNumber: cardNumber.replace(/\s/g, ''),
            cardHolder,
            expiry,
            cvv
          },
          installmentCount: selectedInstallment
        })
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json.code === 'STOCK_ERROR' ? tr.checkout.stockError : tr.checkout.paymentError;
        toasts.add(msg, 'error');
        return;
      }

      // Store 3D HTML in sessionStorage for the 3D page to pick up
      sessionStorage.setItem('tami_3d_html', json.html);
      goto('/odeme/3d');
    } catch {
      toasts.add(tr.checkout.paymentError, 'error');
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>{tr.checkout.title}</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
  <h1 class="mb-8 text-2xl font-bold text-gray-900">{tr.checkout.title}</h1>

  <!-- Step indicators -->
  <div class="mb-8 flex items-center gap-2 text-sm">
    {#each [
      { n: 1, label: tr.checkout.stepDelivery },
      { n: 2, label: tr.checkout.stepPayment },
      { n: 3, label: tr.checkout.stepReview }
    ] as s}
      <div class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold {step >= s.n ? 'bg-[--primary] text-white' : 'bg-gray-200 text-gray-500'}">
          {s.n}
        </span>
        <span class="{step === s.n ? 'font-semibold text-gray-900' : 'text-gray-400'}">{s.label}</span>
      </div>
      {#if s.n < 3}<div class="h-px flex-1 bg-gray-200"></div>{/if}
    {/each}
  </div>

  <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
    <!-- Left: form steps -->
    <div class="lg:col-span-2">

      <!-- Step 1: Address -->
      {#if step === 1}
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <h2 class="mb-4 text-base font-semibold text-gray-800">{tr.checkout.stepDelivery}</h2>

          {#if data.savedAddresses.length > 0}
            <div class="mb-4">
              <label class="mb-1 block text-sm font-medium text-gray-700">Kayıtlı Adresler</label>
              <select
                bind:value={selectedSavedAddress}
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Yeni adres gir</option>
                {#each data.savedAddresses as addr}
                  <option value={addr.id}>{addr.label ?? addr.fullName} — {addr.city}</option>
                {/each}
              </select>
            </div>
          {/if}

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.fullName}</label>
              <input bind:value={fullName} type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.phone}</label>
              <input bind:value={phone} type="tel" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div class="sm:col-span-2">
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.address}</label>
              <textarea bind:value={address} rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.district}</label>
              <input bind:value={district} type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.city}</label>
              <input bind:value={city} type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.zipCode}</label>
              <input bind:value={zipCode} type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <button
            onclick={() => step = 2}
            disabled={!fullName || !phone || !address || !district || !city}
            class="mt-6 w-full rounded-xl bg-[--primary] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
          >
            Devam Et →
          </button>
        </div>

      <!-- Step 2: Card -->
      {:else if step === 2}
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <h2 class="mb-4 text-base font-semibold text-gray-800">{tr.checkout.stepPayment}</h2>

          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.cardNumber}</label>
              <input
                bind:value={cardNumber}
                type="text"
                maxlength="19"
                placeholder="0000 0000 0000 0000"
                oninput={(e) => {
                  let v = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16);
                  cardNumber = v.replace(/(.{4})/g, '$1 ').trim();
                  lookupBin();
                }}
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.cardHolder}</label>
              <input bind:value={cardHolder} type="text" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.expiryDate}</label>
                <input
                  bind:value={expiry}
                  type="text"
                  maxlength="5"
                  placeholder="MM/YY"
                  oninput={(e) => {
                    let v = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4);
                    expiry = v.length > 2 ? v.slice(0,2) + '/' + v.slice(2) : v;
                  }}
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.cvv}</label>
                <input
                  bind:value={cvv}
                  type="password"
                  maxlength="4"
                  placeholder="•••"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>

            <!-- Installment -->
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">{tr.checkout.installment}</label>
              {#if binLoading}
                <p class="text-xs text-gray-400">Taksit seçenekleri yükleniyor...</p>
              {:else}
                <select bind:value={selectedInstallment} class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value={1}>{tr.checkout.singlePayment}</option>
                  {#each installments as inst}
                    <option value={inst.count}>{inst.count} Taksit — {inst.monthlyAmount} ₺/ay</option>
                  {/each}
                </select>
              {/if}
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button onclick={() => step = 1} class="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ← Geri
            </button>
            <button
              onclick={() => step = 3}
              disabled={!cardNumber || !cardHolder || !expiry || !cvv}
              class="flex-1 rounded-xl bg-[--primary] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Devam Et →
            </button>
          </div>
        </div>

      <!-- Step 3: Review -->
      {:else}
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <h2 class="mb-4 text-base font-semibold text-gray-800">{tr.checkout.stepReview}</h2>

          <!-- Address summary -->
          <div class="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p class="font-medium">{fullName} · {phone}</p>
            <p>{address}, {district}, {city} {zipCode}</p>
          </div>

          <!-- Card summary -->
          <div class="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p class="font-medium">{tr.checkout.cardNumber}: •••• •••• •••• {cardNumber.replace(/\s/g,'').slice(-4)}</p>
            {#if selectedInstallment > 1}
              <p>{selectedInstallment} taksit</p>
            {/if}
          </div>

          <!-- Items -->
          <div class="mb-4 space-y-2">
            {#each $cart as item}
              <div class="flex justify-between text-sm">
                <span class="text-gray-700">{item.name} × {item.quantity}</span>
                <span class="font-medium">{(Number(item.price) * item.quantity).toFixed(2)} ₺</span>
              </div>
            {/each}
          </div>

          <div class="flex gap-3 border-t pt-4">
            <button onclick={() => step = 2} class="rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ← Geri
            </button>
            <button
              onclick={submitOrder}
              disabled={submitting}
              class="flex-1 rounded-xl bg-[--primary] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {submitting ? 'İşleniyor...' : tr.checkout.submit}
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Right: order summary -->
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-5 h-fit">
      <h2 class="mb-3 text-sm font-semibold text-gray-700">{tr.checkout.stepReview}</h2>
      <div class="space-y-2">
        {#each $cart as item}
          <div class="flex justify-between text-sm">
            <span class="text-gray-600 line-clamp-1">{item.name} ×{item.quantity}</span>
            <span class="shrink-0 font-medium text-gray-900">{(Number(item.price) * item.quantity).toFixed(2)} ₺</span>
          </div>
        {/each}
      </div>
      <div class="mt-4 border-t pt-3 flex justify-between font-bold text-gray-900">
        <span>{tr.cart.total}</span>
        <span>{cartTotal.toFixed(2)} ₺</span>
      </div>
    </div>
  </div>
</div>
