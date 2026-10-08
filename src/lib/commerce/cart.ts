import type { CartLine, Product, Variant } from "./types";
export function resolveCart(items: CartLine[], products: Product[]) {
  return items.map((line) => {
    const product = products.find((p) =>
      p.variants.some((v) => v.id === line.variant_id),
    );
    const variant = product?.variants.find((v) => v.id === line.variant_id);
    if (!product || !variant || !product.active || !variant.active)
      throw new Error("Produto ou combinação indisponível.");
    if (line.quantity > variant.stock)
      throw new Error(
        `Estoque insuficiente: ${product.name} — ${variant.label}.`,
      );
    return {
      ...line,
      product,
      variant,
      unit_cents: variant.promo_cents ?? variant.price_cents,
    };
  });
}
export function subtotal(lines: { unit_cents: number; quantity: number }[]) {
  return lines.reduce((n, l) => n + l.unit_cents * l.quantity, 0);
}
export function searchProduct(product: Product, query: string) {
  const text = [
    product.name,
    product.brand,
    product.product_type,
    product.compatibility,
    ...product.variants.flatMap((v) => [
      v.sku,
      v.label,
      ...Object.values(v.attributes),
    ]),
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/\s+/)
    .every((q) => text.includes(q));
}
export const variantPrice = (v: Variant) => v.promo_cents ?? v.price_cents;
