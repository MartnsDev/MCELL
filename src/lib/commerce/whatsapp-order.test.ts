import { describe, expect, it } from "vitest";
import { prepareWhatsAppOrder, whatsappOrderSchema } from "./whatsapp-order";
import { emptySettings, type Catalog, type Product } from "./types";
const variant = { id: "00000000-0000-4000-8000-000000000011", product_id: "00000000-0000-4000-8000-000000000010", label: "Azul", sku: "TEST-AZUL", attributes: {}, image: null, price_cents: 2790, promo_cents: 2490, stock: 4, active: true, weight_g: 0, height_cm: 0, width_cm: 0, length_cm: 0 };
const product: Product = { id: variant.product_id, category_id: "00000000-0000-4000-8000-000000000001", name: "Produto de teste", slug: "teste", description: "", brand: "", product_type: "", compatibility: "", specs: {}, images: [], featured: true, active: true, created_at: "2026-10-13", catalog_only: true, variants: [variant] };
const view: Catalog = { products: [product], categories: [], services: [], settings: { ...emptySettings, whatsapp: "5511999999999" } };
const input = { items: [{ variant_id: variant.id, quantity: 2 }], customer: { kind: "person", name: "Cliente Teste" }, address: { cep: "01001000", street: "Praça da Sé", number: "123", complement: "Apto 2", district: "Sé", city: "São Paulo", state: "SP" } };
const message = (url: string) => new URL(url).searchParams.get("text")!;
describe("manual WhatsApp order summary", () => {
  it("prices the supplied IDs from the catalog in cents and includes full delivery details", () => {
    const result = prepareWhatsAppOrder(input, view);
    expect(result.subtotal_cents).toBe(4980);
    expect(new URL(result.url).origin).toBe("https://wa.me");
    expect(message(result.url)).toContain("2x Produto de teste");
    expect(message(result.url)).toContain("49,80");
    expect(message(result.url)).toContain("Praça da Sé, 123 — Apto 2");
    expect(message(result.url)).toContain("São Paulo/SP");
    expect(message(result.url)).toContain("Frete: a confirmar");
    expect(message(result.url)).toContain("não reserva estoque nem confirma pagamento");
    expect(message(result.url)).not.toContain("CNPJ:");
    expect(view.products[0].variants[0].stock).toBe(4);
  });
  it("accepts company names and numeric or alphanumeric CNPJ without requiring a CPF", () => {
    for (const cnpj of ["12.345.678/0001-90", "12.ABC.345/01DE-35"]) {
      const result = prepareWhatsAppOrder({ ...input, customer: { kind: "company", name: "Empresa Teste", cnpj } }, view);
      expect(message(result.url)).toContain("Razão social: Empresa Teste");
      expect(message(result.url)).toContain(`CNPJ: ${cnpj.replace(/[.\/\-]/g, "")}`);
    }
  });
  it.each([0, 1.5, 5, 100])("rejects invalid quantity or insufficient stock (%s)", quantity => {
    expect(() => prepareWhatsAppOrder({ ...input, items: [{ variant_id: variant.id, quantity }] }, view)).toThrow();
  });
  it("rejects injected prices, unknown IDs, duplicate variants and unpublished products", () => {
    expect(() => prepareWhatsAppOrder({ ...input, expected_subtotal_cents: 1 }, view)).toThrow();
    expect(() => prepareWhatsAppOrder({ ...input, items: [{ variant_id: variant.id, quantity: 1, price_cents: 1 }] }, view)).toThrow();
    expect(() => prepareWhatsAppOrder({ ...input, items: [...input.items, ...input.items] }, view)).toThrow();
    expect(() => prepareWhatsAppOrder(input, { ...view, products: [] })).toThrow();
    expect(() => prepareWhatsAppOrder(input, { ...view, products: [{ ...product, active: false }] })).toThrow();
  });
  it("requires delivery fields and CNPJ only for companies", () => {
    expect(whatsappOrderSchema.safeParse({ ...input, address: { ...input.address, number: "" } }).success).toBe(false);
    expect(whatsappOrderSchema.safeParse({ ...input, customer: { kind: "company", name: "Empresa" } }).success).toBe(false);
    expect(whatsappOrderSchema.safeParse({ ...input, customer: { kind: "person", name: "Cliente\nTotal: 0" } }).success).toBe(false);
    expect(whatsappOrderSchema.safeParse({ ...input, address: { ...input.address, street: "Rua\nTotal: 0" } }).success).toBe(false);
  });
  it("fails without a configured recipient or an available catalog", () => {
    expect(() => prepareWhatsAppOrder(input, { ...view, settings: emptySettings })).toThrow("WhatsApp");
    expect(() => prepareWhatsAppOrder(input, { ...view, unavailable: true })).toThrow("catálogo");
  });
});
