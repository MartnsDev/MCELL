"use client";
import Image from "next/image";
import Link from "next/link";
import { Package, ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { money, type Product } from "@/lib/commerce/types";
import { variantPrice } from "@/lib/commerce/cart";
import { useCart } from "@/lib/commerce/cart-store";
import { FavoriteButton } from "./favorite-button";
export function StorefrontProduct({ product: p }: { product: Product }) {
  const variants = p.variants.filter(v => v.active);
  const pricedVariant = [...variants].sort((a, b) => variantPrice(a) - variantPrice(b))[0];
  const price = pricedVariant ? variantPrice(pricedVariant) : 0;
  const available = variants.filter(v => v.stock > 0);
  const add = useCart(s => s.add);
  const [added, setAdded] = useState(false);
  return <article className="storefront-product">
    <FavoriteButton id={p.id} />
    <Link className="storefront-product-image" href={`/produto/${p.slug}`}>
      {p.images[0] ? <Image src={p.images[0]} alt={p.name} fill sizes="(max-width:640px) 45vw, (max-width:1000px) 15vw, 120px" /> : <Package size={45} />}
    </Link>
    <div className="storefront-product-copy"><Link href={`/produto/${p.slug}`}><h3>{p.name}</h3></Link><p>{p.compatibility || p.brand || p.product_type}</p>
      <small className="product-availability">{available.length ? "Disponível em estoque" : "Esgotado"}</small>
      {pricedVariant?.promo_cents != null && <s className="reference-price">{money(pricedVariant.price_cents)}</s>}
      <strong className="storefront-price">{price ? money(price) : "Indisponível"}</strong>
      <small>{variants.length > 1 ? "Escolha o modelo do seu aparelho" : "Consulte as condições no checkout"}</small>
      {p.catalog_only ? <Link className="button compact-cart" href={`/produto/${p.slug}`}>Ver produto</Link> : available.length === 1 && variants.length === 1 ? <button className="button compact-cart" onClick={() => { add(available[0].id, 1, available[0].stock); setAdded(true); }}><span>{added ? <Check size={13} /> : <ShoppingCart size={13} />}</span>{added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}</button> : <Link className="button compact-cart" href={`/produto/${p.slug}`}><ShoppingCart size={13} />{available.length ? "Adicionar ao carrinho" : "Ver produto"}</Link>}
      <span className="sr-only" role="status">{added ? `${p.name} adicionado ao carrinho` : ""}</span>
    </div>
  </article>;
}
