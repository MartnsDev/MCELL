"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./types";
type Cart = {
  items: CartLine[];
  add: (id: string, quantity: number, max: number) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
};
export const useCart = create<Cart>()(
  persist(
    (set) => ({
      items: [],
      add: (id, quantity, max) =>
        set((s) => {
          const old = s.items.find((i) => i.variant_id === id);
          const q = Math.min(max, (old?.quantity ?? 0) + quantity);
          return {
            items:
              q > 0
                ? [
                    ...s.items.filter((i) => i.variant_id !== id),
                    { variant_id: id, quantity: q },
                  ]
                : s.items,
          };
        }),
      update: (id, quantity) =>
        set((s) => ({
          items:
            quantity > 0
              ? s.items.map((i) =>
                  i.variant_id === id
                    ? { ...i, quantity: Math.min(99, quantity) }
                    : i,
                )
              : s.items.filter((i) => i.variant_id !== id),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "martins-cell-cart-v1", version: 1 },
  ),
);
