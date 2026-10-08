"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useFavorites = create<{ ids: string[]; toggle: (id: string) => void }>()(persist((set) => ({ ids: [], toggle: id => set(s => ({ ids: s.ids.includes(id) ? s.ids.filter(v => v !== id) : [...s.ids, id] })) }), { name: "mcell-favorites-v1" }));
