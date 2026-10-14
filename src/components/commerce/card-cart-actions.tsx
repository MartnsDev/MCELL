"use client";
import Link from "next/link";
import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/commerce/cart-store";
import type { Product } from "@/lib/commerce/types";

export function CardCartActions({ product }: { product: Product }) {
  const variants = product.variants.filter(v => v.active);
  const [selected, setSelected] = useState("");
  const [added, setAdded] = useState(false);
  const variant = variants.length === 1 ? variants[0] : variants.find(v => v.id === selected);
  const available = variants.some(v => v.stock > 0);
  const add = useCart(s => s.add);
  return <div className="card-cart-actions">
    {variants.length > 1 && available && <label className="card-variant-label">Escolha o modelo
      <select aria-label={`Modelo de ${product.name}`} value={selected} onChange={e => { setSelected(e.target.value); setAdded(false); }}>
        <option value="">Selecione</option>
        {variants.map(v => <option key={v.id} value={v.id} disabled={v.stock <= 0}>{v.label}{v.stock <= 0 ? " · Esgotado" : ""}</option>)}
      </select>
    </label>}
    <button type="button" className="button compact-cart" disabled={!variant || variant.stock <= 0} aria-label={`${available ? "Adicionar ao carrinho" : "Esgotado"}: ${product.name}`} onClick={() => {
      if (!variant || variant.stock <= 0) return;
      add(variant.id, 1, variant.stock);
      setAdded(true);
    }}>{added ? <Check size={15} /> : <ShoppingCart size={15} />}<span>{!available ? "Esgotado" : added ? "Adicionado" : "Adicionar ao carrinho"}</span></button>
    <Link className="card-details-link" href={`/produto/${product.slug}`}>Ver detalhes</Link>
    <span className="sr-only" role="status">{added ? `${product.name} adicionado ao carrinho` : ""}</span>
  </div>;
}
