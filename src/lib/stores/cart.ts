// src/lib/stores/cart.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type CartItem = {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  imageUrl: string;
  quantity: number;
  stockQty: number;
};

function createCart() {
  const initial: CartItem[] = browser
    ? JSON.parse(localStorage.getItem('cart') ?? '[]')
    : [];
  const { subscribe, set, update } = writable<CartItem[]>(initial);

  if (browser) {
    subscribe(items => localStorage.setItem('cart', JSON.stringify(items)));
  }

  return {
    subscribe,
    add(item: Omit<CartItem, 'quantity'>) {
      update(items => {
        const existing = items.find(i => i.productId === item.productId);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + 1, item.stockQty);
          return [...items];
        }
        return [...items, { ...item, quantity: 1 }];
      });
    },
    remove(productId: string) {
      update(items => items.filter(i => i.productId !== productId));
    },
    updateQty(productId: string, qty: number) {
      update(items => items.map(i =>
        i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(qty, i.stockQty)) } : i
      ));
    },
    clear() { set([]); }
  };
}

export const cart = createCart();
