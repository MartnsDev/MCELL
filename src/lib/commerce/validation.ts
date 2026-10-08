import { z } from "zod";
export const uuid = z.string().uuid();
const text = (max = 200) => z.string().trim().min(1).max(max);
export const cep = z.string().regex(/^\d{8}$/, "Informe um CEP com 8 números.");
export const cartSchema = z
  .array(
    z
      .object({ variant_id: uuid, quantity: z.number().int().min(1).max(99) })
      .strict(),
  )
  .min(1)
  .max(50)
  .refine(
    (items) => new Set(items.map((i) => i.variant_id)).size === items.length,
    "Variações duplicadas.",
  );
export const customerSchema = z
  .object({
    name: text(120),
    phone: z.string().regex(/^\d{10,13}$/),
    email: z.email().max(254),
    document: z
      .string()
      .regex(/^\d{11}$|^\d{14}$/)
      .optional(),
  })
  .strict();
export const addressSchema = z
  .object({
    cep,
    street: text(),
    number: text(20),
    complement: z.string().max(100).default(""),
    district: text(),
    city: text(),
    state: z.string().regex(/^[A-Z]{2}$/),
  })
  .strict();
export const quoteSchema = z.object({ items: cartSchema, cep }).strict();
export const orderSchema = z
  .object({
    items: cartSchema,
    customer: customerSchema,
    delivery: z.enum(["pickup", "shipping"]),
    address: addressSchema.optional(),
    quote_id: uuid.optional(),
    payment_method: z.enum(["mercadopago", "manual"]),
    expected_subtotal_cents: z.number().int().positive().max(2000000000),
    request_key: uuid,
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .refine(
    (x) => x.delivery !== "shipping" || (!!x.address && !!x.quote_id),
    "Selecione uma cotação válida.",
  );
export const lookupSchema = z
  .object({
    kind: z.enum(["order", "repair"]),
    protocol: text(30),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const decisionSchema = z
  .object({
    id: uuid,
    token: z.string().regex(/^[a-f0-9]{64}$/),
    version: z.number().int().min(1),
    approve: z.boolean(),
  })
  .strict();
export const repairSchema = z
  .object({
    customer: customerSchema.omit({ document: true }),
    service_id: uuid,
    brand: text(80),
    model: text(100),
    defect: text(200),
    description: text(4000),
    modality: z.enum(["in_person", "mail"]),
    photos: z
      .array(z.string().regex(/^[a-f0-9-]{36}\/\d+\.(jpg|png|webp)$/))
      .max(5)
      .default([]),
    token: z.string().regex(/^[a-f0-9]{64}$/),
    terms: z.literal(true),
  })
  .strict();
const cents = z.number().int().min(0).max(100000000);
const uploadedImage = z
  .string()
  .url()
  .refine((s) => {
    if (!URL.canParse(s)) return false;
    const u = new URL(s);
    return (
      u.protocol === "https:" &&
      u.hostname.endsWith(".supabase.co") &&
      u.pathname.includes("/mc-products/")
    );
  }, "Use imagens enviadas pelo painel.");
const image = z.union([uploadedImage, z.string().regex(/^\/produtos\/[a-z0-9-]+\.webp$/, "Use uma imagem de produto preparada ou enviada pelo painel.")]);
export const variantSchema = z
  .object({
    id: uuid.optional(),
    label: text(150),
    sku: text(80),
    attributes: z.record(z.string(), z.string().max(100)).default({}),
    image: image.nullable().default(null),
    price_cents: cents.refine((n) => n > 0),
    promo_cents: cents.nullable().default(null),
    stock: z.number().int().min(0).max(1000000),
    active: z.boolean(),
    weight_g: z.number().int().min(1).max(30000),
    height_cm: z.number().int().min(1).max(100),
    width_cm: z.number().int().min(1).max(100),
    length_cm: z.number().int().min(1).max(100),
    cost_cents: cents.default(0),
  })
  .strict()
  .refine(
    (v) =>
      v.promo_cents === null ||
      (v.promo_cents > 0 && v.promo_cents < v.price_cents),
    "Promoção deve ser menor que o preço normal.",
  );
export const productSchema = z
  .object({
    id: uuid.optional(),
    category_id: uuid,
    name: text(180),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(180),
    description: text(8000),
    brand: z.string().max(100),
    product_type: z.string().max(100),
    compatibility: z.string().max(1000),
    specs: z.record(z.string(), z.string().max(500)),
    images: z.array(image).max(12),
    featured: z.boolean(),
    active: z.boolean(),
    variants: z.array(variantSchema).min(1).max(100),
  })
  .strict()
  .refine(
    (p) =>
      new Set(p.variants.map((v) => v.sku)).size === p.variants.length &&
      new Set(p.variants.map((v) => v.label)).size === p.variants.length,
    "SKU e combinação devem ser únicos.",
  );
export const categorySchema = z
  .object({
    id: uuid.optional(),
    name: text(100),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    active: z.boolean(),
    sort_order: z.number().int().min(0),
  })
  .strict();
export const serviceSchema = z
  .object({
    id: uuid.optional(),
    name: text(100),
    description: z.string().max(2000),
    active: z.boolean(),
    sort_order: z.number().int().min(0),
  })
  .strict();
export const settingsSchema = z
  .object({
    whatsapp: z.string().regex(/^$|^\d{10,15}$/),
    email: z.union([z.literal(""), z.email()]),
    pickup_enabled: z.boolean(),
    pickup_address: z.string().max(1000),
    pickup_hours: z.string().max(500),
    origin_cep: z.union([z.literal(""), cep]),
    shipping_enabled: z.boolean(),
    payment_enabled: z.boolean(),
    manual_payment: z.boolean(),
    home_show_categories: z.boolean(),
    home_show_featured: z.boolean(),
    home_show_new: z.boolean(),
    home_show_bestsellers: z.boolean(),
    home_show_service: z.boolean(),
    service_title: text(160),
    service_text: text(500),
    hero_title: text(160),
    hero_text: text(500),
    about: z.string().max(5000),
    delivery_policy: z.string().max(10000),
    privacy_policy: z.string().max(10000),
    repair_terms: z.string().max(10000),
    terms_reviewed: z.boolean(),
    packing_weight_g: z.number().int().min(0).max(3000),
    packing_padding_cm: z.number().int().min(0).max(20),
  })
  .strict()
  .refine(
    (s) =>
      !s.pickup_enabled ||
      (!!s.pickup_address.trim() && !!s.pickup_hours.trim()),
    "Confirme endereço e horário de retirada.",
  )
  .refine(
    (s) => !s.shipping_enabled || s.origin_cep.length === 8,
    "Configure o CEP de origem.",
  );
export const repairPatchSchema = z
  .object({
    id: uuid,
    status: z.string(),
    diagnosis: z.string().max(8000),
    estimate_cents: cents.nullable(),
    return_cents: cents,
    deadline: z.string().max(200),
    shipping_instructions: z.string().max(4000),
    inbound_tracking: z.string().max(100),
    outbound_tracking: z.string().max(100),
    tests: z.string().max(4000),
    technical_photos: z
      .array(z.string().regex(/^[a-f0-9-]{36}\/\d+\.(jpg|png|webp)$/))
      .max(20)
      .default([]),
    message: text(4000),
    public: z.boolean(),
  })
  .strict();
