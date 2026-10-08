import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  body,
  check,
  failure,
  guard,
  requireAdmin,
  StoreError,
} from "@/lib/commerce/server";
import {
  categorySchema,
  productSchema,
  repairPatchSchema,
  serviceSchema,
  settingsSchema,
  uuid,
} from "@/lib/commerce/validation";
import { safeImage } from "@/lib/commerce/uploads";
const tables: Record<string, string> = {
  products: "mc_products",
  categories: "mc_categories",
  settings: "mc_settings",
  services: "mc_services",
  orders: "mc_orders",
  repairs: "mc_repairs",
  audit: "mc_audit",
  payments: "mc_payment_events",
};
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    const client = await requireAdmin();
    const { resource } = await params;
    if (resource === "product-imports") {
      const prepared = JSON.parse(await readFile(path.join(process.cwd(), "data/imports/products.json"), "utf8"));
      return Response.json({ data: prepared }, { headers: { "Cache-Control": "no-store" } });
    }
    const table = tables[resource];
    if (!table) throw new StoreError("Rota inválida.", 404);
    const selection =
      resource === "products"
        ? "*,variants:mc_variants(*,costs:mc_costs(cost_cents))"
        : resource === "orders"
          ? "*,items:mc_order_items(*)"
          : resource === "repairs"
            ? "*,history:mc_repair_history(*)"
            : "*";
    let query = client.from(table).select(selection).returns<
      {
        photos?: string[];
        technical_photos?: string[];
        photo_urls?: string[];
        [key: string]: unknown;
      }[]
    >();
    if (["orders", "repairs", "audit", "payments"].includes(resource))
      query = query.order("created_at", { ascending: false }).limit(200);
    const result = await query;
    check(result.error);
    if (resource === "repairs") {
      for (const row of result.data ?? []) {
        const signed = await client.storage
          .from("mc-repairs")
          .createSignedUrls(
            [...(row.photos ?? []), ...(row.technical_photos ?? [])],
            300,
          );
        row.photo_urls = (signed.data ?? [])
          .map((x) => x.signedUrl)
          .filter((url): url is string => !!url);
      }
    }
    return Response.json(
      { data: result.data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    const client = await requireAdmin();
    await guard(request, "admin", 100);
    const { resource } = await params;
    const raw = await body(request);
    if (resource === "products") {
      const p = productSchema.parse(raw);
      const result = await client.rpc("mc_save_product", { p });
      check(result.error);
      return Response.json({ id: result.data });
    }
    if (resource === "orders") {
      const id = uuid.parse(raw.id);
      if (
        ![
          "paid",
          "preparing",
          "ready_pickup",
          "shipped",
          "delivered",
          "cancelled",
        ].includes(raw.status) ||
        typeof raw.tracking !== "string" ||
        raw.tracking.length > 100
      )
        throw new StoreError("Dados inválidos.");
      const r = await client.rpc("mc_update_order", {
        p_id: id,
        p_status: raw.status,
        p_tracking: raw.tracking,
      });
      check(r.error);
      return Response.json({ saved: true });
    }
    if (resource === "repairs") {
      const {
        id,
        message,
        public: visible,
        ...patch
      } = repairPatchSchema.parse(raw);
      const r = await client.rpc("mc_admin_repair", {
        p_id: id,
        p_patch: patch,
        p_message: message,
        p_public: visible,
      });
      check(r.error);
      return Response.json({ saved: true });
    }
    if (!["categories", "services", "settings"].includes(resource))
      throw new StoreError("Rota inválida.", 404);
    const data: Record<string, unknown> =
      resource === "categories"
        ? categorySchema.parse(raw)
        : resource === "services"
          ? serviceSchema.parse(raw)
          : { id: true, ...settingsSchema.parse(raw) };
    const result = await client
      .from(tables[resource])
      .upsert(data)
      .select()
      .single();
    check(result.error);
    return Response.json({ data: result.data });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  try {
    await requireAdmin();
    const db = await guard(request, "admin-upload", 50);
    const resource = (await params).resource;
    if (!["images", "technical-photos"].includes(resource))
      throw new StoreError("Rota inválida.", 404);
    const { bytes, extension, mime } = await safeImage(request);
    const bucket = resource === "images" ? "mc-products" : "mc-repairs";
    const path = `${randomUUID()}/${Date.now()}.${extension}`;
    const r = await db.storage
      .from(bucket)
      .upload(path, bytes, { contentType: mime });
    check(r.error);
    return Response.json({
      path,
      url:
        resource === "images"
          ? db.storage.from(bucket).getPublicUrl(path).data.publicUrl
          : undefined,
    });
  } catch (e) {
    return failure(e);
  }
}
