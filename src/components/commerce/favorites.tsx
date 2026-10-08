"use client";
import { useSyncExternalStore } from "react";
import { useFavorites } from "@/lib/commerce/favorites-store";
import type { Product } from "@/lib/commerce/types";
import { ProductGrid } from "./products";
const subscribe = () => () => {};
export function Favorites({ products }: { products: Product[] }) {
  const ids = useFavorites(s => s.ids);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const saved = mounted ? products.filter(p => ids.includes(p.id)) : [];
  return saved.length ? <ProductGrid products={saved} /> : <p className="empty-catalog">Salve seus produtos pelo coração para encontrá-los aqui.</p>;
}
