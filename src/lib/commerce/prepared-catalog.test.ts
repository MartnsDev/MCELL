import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { preparedCatalog } from "./prepared-catalog";
const records = JSON.parse(readFileSync("data/catalog/products.json", "utf8"));
describe("merchant catalog before database setup", () => {
  it("shows supplied products with confirmed quantities and selling prices", () => {
    const view = preparedCatalog(records, "2026-10-07T00:00:00Z");
    expect(view.products).toHaveLength(records.filter((r: typeof records[number]) => r.confirmed_stock !== null).length);
    expect(view.products.reduce((sum, p) => sum + p.variants[0].stock, 0)).toBe(records.reduce((sum: number, r: typeof records[number]) => sum + (r.confirmed_stock ?? 0), 0));
    for (const p of view.products) {
      const source = records.find((r: typeof records[number]) => r.product.id === p.id);
      expect(p.variants[0].price_cents).toBe(source.product.variants[0].price_cents);
      expect(p.catalog_only).toBe(true);
      expect(p.sold_count).toBe(0);
    }
  });
  it("does not expose private costs, proposals or unknown quantities", () => {
    const source = structuredClone(records);
    source[0].confirmed_stock = null;
    source[1].product.variants[0].internal_secret = "private-value";
    source[1].product.variants[0].cost_cents = 1700;
    const view = preparedCatalog(source, "2026-10-07T00:00:00Z");
    expect(view.products).toHaveLength(source.filter((r: typeof records[number]) => r.confirmed_stock !== null).length);
    const publicJSON = JSON.stringify(view);
    for (const field of ["cost_cents", "suggested_reference_cents", "reference_confirmed", "internal_secret", "private-value"]) expect(publicJSON).not.toContain(field);
  });
});
