import Image from "next/image";
import { FavoriteButton } from "./favorite-button";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { money, type Product } from "@/lib/commerce/types";
import { variantPrice } from "@/lib/commerce/cart";
export function ProductCard({ product: p }: { product: Product }) {
  const variants = p.variants.filter((v) => v.active);
  const pricedVariant = [...variants].sort((a, b) => variantPrice(a) - variantPrice(b))[0];
  const price = pricedVariant ? variantPrice(pricedVariant) : 0;
  const stock = variants.some((v) => v.stock > 0);
  return (
    <article className="product-card">
      <FavoriteButton id={p.id} />
      <Link href={`/produto/${p.slug}`}>
        <div className="product-image">
          {p.images[0] ? (
            <Image
              src={p.images[0]}
              alt={p.name}
              fill
              sizes="(max-width:640px) 45vw, 25vw"
            />
          ) : (
            <Package size={48} />
          )}
          <span className={`badge ${stock ? "" : "sold"}`}>
            {stock ? (p.featured ? "Destaque" : "Disponível") : "Esgotado"}
          </span>
        </div>
        <div className="product-copy">
          <small>{p.brand || p.product_type}</small>
          <h3>{p.name}</h3>
          <p>{p.compatibility || "Confira as especificações do produto"}</p>
          <div className="product-price">
            <span>{pricedVariant?.promo_cents != null && <s className="reference-price">{money(pricedVariant.price_cents)}</s>}<strong>{price ? money(price) : "Indisponível"}</strong></span>
            <ArrowUpRight size={19} />
          </div>
          <small>
            {variants.length > 1
              ? `${variants.length} versões · escolha a sua`
              : "Ver detalhes"}
          </small>
        </div>
      </Link>
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
