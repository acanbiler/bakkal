// src/lib/stores/toast.ts
import { writable } from 'svelte/store';

export type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' };

const { subscribe, update } = writable<Toast[]>([]);

export const toasts = {
  subscribe,
  add(message: string, type: Toast['type'] = 'info') {
    const id = Math.random().toString(36).slice(2);
    update(t => [...t, { id, message, type }]);
    setTimeout(() => update(t => t.filter(i => i.id !== id)), 4000);
  },
  remove(id: string) { update(t => t.filter(i => i.id !== id)); }
};
