"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useCart } from "@/lib/commerce/cart-store";
import { money, type Product } from "@/lib/commerce/types";
import { variantPrice } from "@/lib/commerce/cart";
const subscribe = () => () => {};
export function CartLink({ products }: { products: Product[] }) {
  const items = useCart((s) => s.items);
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const count = mounted ? items.reduce((n, i) => n + i.quantity, 0) : 0;
  const total = mounted ? items.reduce((n, i) => {
    const v = products.flatMap(p => p.variants).find(v => v.id === i.variant_id && v.active);
    return n + (v ? variantPrice(v) * i.quantity : 0);
  }, 0) : 0;
  return <Link className="cart-link" href="/carrinho" aria-label="Meu carrinho"><span className="cart-icon"><ShoppingCart size={29} /><b>{count}</b></span><span><strong>Meu carrinho</strong><small>{money(total)}</small></span></Link>;
}
