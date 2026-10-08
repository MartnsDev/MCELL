import { createHash } from "node:crypto";
import { emptySettings, type Catalog, type Product, type Variant } from "./types";
type Prepared = {
  category_name: string;
  category_slug: string;
  confirmed_stock: number | null;
  product: Omit<Product, "created_at">;
};
// Explicit public projection: never spread a private import record or variant.
export function preparedCatalog(records: Prepared[], updatedAt: string): Catalog {
  const categories = [...new Map(records.map(r => [r.category_slug, {
    id: createHash("sha256").update(`mcell-category:${r.category_slug}`).digest("hex").slice(0, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5"),
    name: r.category_name, slug: r.category_slug, active: true, sort_order: 0,
  }])).values()];
  const products: Product[] = records.filter(r => r.confirmed_stock !== null).map(r => {
    const p = r.product;
    const variants: Variant[] = p.variants.map(v => ({
      id: v.id, product_id: p.id, label: v.label, sku: v.sku,
      attributes: v.attributes, image: v.image, price_cents: v.price_cents,
      promo_cents: v.promo_cents, stock: r.confirmed_stock!, active: v.active,
      weight_g: v.weight_g, height_cm: v.height_cm, width_cm: v.width_cm, length_cm: v.length_cm,
    }));
    return {
      id: p.id, category_id: categories.find(c => c.slug === r.category_slug)!.id,
      name: p.name, slug: p.slug, description: p.description, brand: p.brand,
      product_type: p.product_type, compatibility: p.compatibility, specs: p.specs,
      images: p.images, featured: p.featured, active: true, variants,
      created_at: updatedAt, sold_count: 0, catalog_only: true,
    };
  });
  return { products, categories, services: [], settings: emptySettings, unavailable: !products.length };
}
