"use client";
import { Heart } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useFavorites } from "@/lib/commerce/favorites-store";

const subscribe = () => () => {};
export function FavoriteButton({ id }: { id: string }) {
  const ids = useFavorites(s => s.ids);
  const toggle = useFavorites(s => s.toggle);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const saved = mounted && ids.includes(id);
  return <button className={`favorite-button ${saved ? "saved" : ""}`} aria-label={saved ? "Remover dos favoritos" : "Salvar nos favoritos"} aria-pressed={saved} onClick={() => toggle(id)}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>;
}
