"use client";
import Link from "next/link";
import { Check, ShoppingCart, Minus, Plus } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useCart } from "@/lib/commerce/cart-store";
import type { Product } from "@/lib/commerce/types";

const subscribe = () => () => {};
export function CardCartActions({ product }: { product: Product }) {
  const variants = product.variants.filter(v => v.active);
  const [selected, setSelected] = useState("");
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const items = useCart(s => s.items);
  const variant = variants.length === 1 ? variants[0] : variants.find(v => v.id === selected);
  const available = variants.some(v => v.stock > 0);
  const add = useCart(s => s.add);
  const inCart = mounted ? items.find(i => i.variant_id === variant?.id)?.quantity ?? 0 : 0;
  const remaining = variant ? Math.max(0, Math.min(99, variant.stock) - inCart) : 0;
  const count = Math.max(1, Math.min(quantity, remaining));
  const changeQuantity = (value: number) => { setQuantity(Math.max(1, Math.min(Math.floor(value) || 1, remaining))); setAdded(false); };
  return <div className="card-cart-actions">
    {variants.length > 1 && available && <label className="card-variant-label">Escolha o modelo
      <select aria-label={`Modelo de ${product.name}`} value={selected} onChange={e => { setSelected(e.target.value); setQuantity(1); setAdded(false); }}>
        <option value="">Selecione</option>
        {variants.map(v => <option key={v.id} value={v.id} disabled={v.stock <= 0}>{v.label}{v.stock <= 0 ? " · Esgotado" : ""}</option>)}
      </select>
    </label>}
    <div className="card-quantity"><span>Quantidade</span><div className="card-quantity-control">
      <button type="button" aria-label={`Diminuir quantidade de ${product.name}`} disabled={remaining <= 0 || count <= 1} onClick={() => changeQuantity(count - 1)}><Minus size={14} /></button>
      <input type="number" inputMode="numeric" min="1" max={Math.max(1, remaining)} value={count} disabled={remaining <= 0} aria-label={`Quantidade de ${product.name}`} onChange={e => changeQuantity(Number(e.target.value))} />
      <button type="button" aria-label={`Aumentar quantidade de ${product.name}`} disabled={remaining <= 0 || count >= remaining} onClick={() => changeQuantity(count + 1)}><Plus size={14} /></button>
    </div></div>
    <button type="button" className="button compact-cart" disabled={!variant || remaining <= 0} aria-label={`${available ? "Adicionar ao carrinho" : "Esgotado"}: ${product.name}`} onClick={() => {
      if (!variant || remaining <= 0) return;
      add(variant.id, count, Math.min(99, variant.stock));
      setAdded(true);
    }}>{added ? <Check size={15} /> : <ShoppingCart size={15} />}<span>{!available ? "Esgotado" : added ? "Adicionado" : remaining <= 0 && variant ? "Já no carrinho" : "Adicionar ao carrinho"}</span></button>
    <Link className="card-details-link" href={`/produto/${product.slug}`}>Ver detalhes</Link>
    <span className="sr-only" role="status">{added ? `${product.name} adicionado ao carrinho` : ""}</span>
  </div>;
}
