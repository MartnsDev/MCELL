"use client";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { money, type Product } from "@/lib/commerce/types";
import { variantPrice } from "@/lib/commerce/cart";
import { CardCartActions } from "./card-cart-actions";
import { FavoriteButton } from "./favorite-button";
export function StorefrontProduct({ product: p }: { product: Product }) {
  const variants = p.variants.filter(v => v.active);
  const pricedVariant = [...variants].sort((a, b) => variantPrice(a) - variantPrice(b))[0];
  const price = pricedVariant ? variantPrice(pricedVariant) : 0;
  const available = variants.filter(v => v.stock > 0);
  return <article className="storefront-product">
    <FavoriteButton id={p.id} />
    <Link className="storefront-product-image" href={`/produto/${p.slug}`}>
      {p.images[0] ? <Image src={p.images[0]} alt={p.name} fill sizes="(max-width:640px) 45vw, (max-width:1000px) 30vw, 300px" /> : <Package size={45} />}
    </Link>
    <div className="storefront-product-copy"><Link href={`/produto/${p.slug}`}><h3>{p.name}</h3></Link><p>{p.compatibility || p.brand || p.product_type}</p>
      <small className="product-availability">{available.length ? "Disponível em estoque" : "Esgotado"}</small>
      {pricedVariant?.promo_cents != null && <s className="reference-price">{money(pricedVariant.price_cents)}</s>}
      <strong className="storefront-price">{price ? money(price) : "Indisponível"}</strong>
      <small>{variants.length > 1 ? "Escolha o modelo do seu aparelho" : p.catalog_only ? "Conheça os detalhes do produto" : "Consulte as condições no checkout"}</small>
      <CardCartActions product={p} />
    </div>
  </article>;
}
