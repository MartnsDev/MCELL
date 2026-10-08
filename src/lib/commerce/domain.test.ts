import { describe, it, expect, vi, afterEach } from "vitest";
import { cartSchema, productSchema, variantSchema, orderSchema, cep } from "./validation";
import { resolveCart, subtotal, searchProduct } from "./cart";
import { emptySettings, type Product } from "./types";
import { MelhorEnvio, parcel } from "./shipping";
import { preferenceBody, validSignature } from "./payment";
import { createHmac } from "node:crypto";
const v = {
  id: "00000000-0000-4000-8000-000000000011",
  product_id: "00000000-0000-4000-8000-000000000010",
  label: "Samsung A15 azul",
  sku: "CASE-A15",
  attributes: { cor: "Azul" },
  image: null,
  price_cents: 1990,
  promo_cents: 1500,
  stock: 2,
  active: true,
  weight_g: 100,
  height_cm: 2,
  width_cm: 11,
  length_cm: 16,
};
const p: Product = {
  id: v.product_id,
  category_id: "00000000-0000-4000-8000-000000000001",
  name: "Capinha",
  slug: "capinha",
  description: "Capa de proteção",
  brand: "Marca",
  product_type: "Capa",
  compatibility: "Samsung A15",
  specs: { material: "TPU" },
  images: [],
  featured: true,
  active: true,
  created_at: "2026-10-07",
  variants: [v],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("catalog and cart", () => {
  it("validates progressive product creation and individual stock", () => {
    const { id, created_at, ...draft } = p;
    void id;
    void created_at;
    const { product_id, ...version } = v;
    void product_id;
    expect(
      productSchema.parse({
        ...draft,
        variants: [{ ...version, cost_cents: 500 }],
      }).variants[0].sku,
    ).toBe("CASE-A15");
  });
  it("accepts prepared local photos and rejects unsafe public paths", () => {
    const { product_id, ...version } = v;
    void product_id;
    expect(variantSchema.safeParse({ ...version, image: "/produtos/fone-lehmox-i11.webp" }).success).toBe(true);
    for (const image of ["/produtos/../../private.webp", "//evil.test/photo.webp", "/produtos/photo.webp?cost=1700"]) {
      expect(variantSchema.safeParse({ ...version, image }).success).toBe(false);
    }
  });
  it("rejects duplicate combinations and promotional prices above retail", () => {
    const { created_at, ...draft } = p;
    void created_at;
    const { product_id, ...version } = v;
    void product_id;
    expect(
      productSchema.safeParse({ ...draft, variants: [version, version] })
        .success,
    ).toBe(false);
    expect(
      productSchema.safeParse({
        ...draft,
        variants: [{ ...version, promo_cents: 2500 }],
      }).success,
    ).toBe(false);
  });
  it("finds SKU, brand and compatible phone, ignoring accents", () => {
    expect(searchProduct(p, "case-a15")).toBe(true);
    expect(searchProduct(p, "Samsung A15")).toBe(true);
    expect(searchProduct(p, "marca")).toBe(true);
    expect(searchProduct(p, "iphone")).toBe(false);
  });
  it("calculates exact cents using the selected version", () => {
    const lines = resolveCart([{ variant_id: v.id, quantity: 2 }], [p]);
    expect(subtotal(lines)).toBe(3000);
  });
  it("rejects nonexistent combinations and insufficient stock", () => {
    expect(() =>
      resolveCart([{ variant_id: "missing", quantity: 1 }], [p]),
    ).toThrow("combinação");
    expect(() => resolveCart([{ variant_id: v.id, quantity: 3 }], [p])).toThrow(
      "Estoque",
    );
  });
  it("rejects duplicate variants and prices supplied by a browser", () => {
    expect(
      cartSchema.safeParse([
        { variant_id: v.id, quantity: 1 },
        { variant_id: v.id, quantity: 1 },
      ]).success,
    ).toBe(false);
    expect(
      cartSchema.safeParse([{ variant_id: v.id, quantity: 1, price_cents: 1 }])
        .success,
    ).toBe(false);
  });
  it("pickup does not require a delivery address; shipping requires a quote", () => {
    const data = {
      items: [{ variant_id: v.id, quantity: 1 }],
      customer: {
        name: "Cliente",
        phone: "11988887777",
        email: "cliente@example.test",
      },
      delivery: "pickup",
      payment_method: "manual",
      expected_subtotal_cents: 1990,
      request_key: p.id,
      token: "a".repeat(64),
    };
    expect(orderSchema.safeParse(data).success).toBe(true);
    expect(
      orderSchema.safeParse({ ...data, delivery: "shipping" }).success,
    ).toBe(false);
    expect(orderSchema.safeParse({ ...data, total_cents: 1 }).success).toBe(
      false,
    );
  });
});
describe("shipping integration", () => {
  it("validates CEP and packs quantity plus packaging in cm and kg", () => {
    expect(cep.safeParse("123").success).toBe(false);
    const box = parcel(
      [{ quantity: 2, unit_cents: 1500, variant: v }],
      emptySettings,
    );
    expect(box.weight).toBe(0.3);
    expect(box.height).toBe(6);
  });
  it("provides a clear unavailable state without credentials", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "");
    await expect(
      new MelhorEnvio().quote("01001000", "20040020", [], emptySettings),
    ).rejects.toThrow("Cotação automática indisponível");
  });
  it("uses actual provider price and prioritizes SEDEX", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "test-token");
    const fetch = vi.fn().mockResolvedValue(
      Response.json([
        { id: 1, price: "10.00", delivery_time: 8 },
        {
          id: 2,
          price: "28.90",
          custom_price: "27.90",
          delivery_time: 3,
          custom_delivery_time: 2,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetch);
    const quotes = await new MelhorEnvio().quote(
      "01001000",
      "20040020",
      [{ quantity: 1, unit_cents: 1500, variant: v }],
      emptySettings,
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      service: "SEDEX",
      price_cents: 2790,
      days: 2,
    });
    expect(JSON.parse(fetch.mock.calls[0][1].body).services).toBe("2");
  });
  it("handles API failures and unserviceable parcels", async () => {
    vi.stubEnv("MELHOR_ENVIO_TOKEN", "test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(
      new MelhorEnvio().quote(
        "01001000",
        "20040020",
        [{ quantity: 1, unit_cents: 1500, variant: v }],
        emptySettings,
      ),
    ).rejects.toThrow("não respondeu");
    expect(() =>
      parcel([{ quantity: 99, unit_cents: 1500, variant: v }], emptySettings),
    ).toThrow("cotação manual");
  });
});
describe("payments", () => {
  it("does not enable automatic return on localhost", () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(
      preferenceBody({
        id: p.id,
        protocol: "MC-TEST",
        total_cents: 1990,
        expires_at: "2026-10-07T20:00:00Z",
      }),
    ).not.toHaveProperty("auto_return");
  });
  it("uses the persisted amount and public callback", () => {
    vi.stubEnv("APP_URL", "https://martins.example");
    const body = preferenceBody({
      id: p.id,
      protocol: "MC-TEST",
      total_cents: 1990,
      expires_at: "2026-10-07T20:00:00Z",
    });
    expect(body.items[0].unit_price).toBe(19.9);
    expect(body.external_reference).toBe(p.id);
    expect(body.auto_return).toBe("approved");
  });
  it("authenticates webhook signatures and rejects tampering and stale requests", () => {
    const now = Date.now();
    const ts = String(now);
    const canonical = `id:123;request-id:req;ts:${ts};`;
    const sig = createHmac("sha256", "secret").update(canonical).digest("hex");
    expect(
      validSignature(`ts=${ts},v1=${sig}`, "req", "123", "secret", now),
    ).toBe(true);
    expect(
      validSignature(`ts=${ts},v1=${sig}`, "req", "124", "secret", now),
    ).toBe(false);
    expect(
      validSignature(
        `ts=${ts},v1=${sig}`,
        "req",
        "123",
        "secret",
        now + 700000,
      ),
    ).toBe(false);
    expect(
      validSignature(`ts=${ts},v1=invalid`, "req", "123", "secret", now),
    ).toBe(false);
  });
});
