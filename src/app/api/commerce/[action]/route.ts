import { randomUUID } from "node:crypto";
import {
  body,
  catalog,
  check,
  database,
  failure,
  guard,
  hash,
  StoreError,
} from "@/lib/commerce/server";
import { resolveCart, subtotal } from "@/lib/commerce/cart";
import { MelhorEnvio } from "@/lib/commerce/shipping";
import {
  decisionSchema,
  lookupSchema,
  orderSchema,
  quoteSchema,
  repairSchema,
  uuid,
} from "@/lib/commerce/validation";
import { mpFetch, preferenceBody } from "@/lib/commerce/payment";
const ok = (data: unknown) =>
  Response.json(data, { headers: { "Cache-Control": "no-store" } });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    const db = await guard(request, action);
    const raw = await body(request);
    if (action === "quote") {
      const input = quoteSchema.parse(raw);
      const view = await catalog();
      if (view.unavailable) throw new StoreError("Catálogo indisponível.", 503);
      const s = await db
        .from("mc_settings")
        .select("*")
        .eq("id", true)
        .single();
      check(s.error);
      if (!s.data.shipping_enabled)
        throw new StoreError("Envio ainda não disponível.", 503);
      let lines;
      try {
        lines = resolveCart(input.items, view.products);
      } catch (e) {
        throw new StoreError((e as Error).message, 409);
      }
      const fingerprint = hash(
        JSON.stringify(
          lines
            .map((l) => [
              l.variant.id,
              l.quantity,
              l.unit_cents,
              l.variant.weight_g,
              l.variant.height_cm,
              l.variant.width_cm,
              l.variant.length_cm,
            ])
            .sort(),
        ),
      );
      const quotes = await new MelhorEnvio().quote(
        s.data.origin_cep,
        input.cep,
        lines,
        s.data,
      );
      const results = [];
      for (const q of quotes) {
        const expires_at = new Date(Date.now() + 10 * 60000).toISOString();
        const result = await db
          .from("mc_quotes")
          .insert({
            ...q,
            payload: {
              ...(q.payload as Record<string, unknown>),
              quote_settings: {
                origin_cep: s.data.origin_cep,
                packing_weight_g: s.data.packing_weight_g,
                packing_padding_cm: s.data.packing_padding_cm,
              },
              cart_snapshot: lines.map((l) => [
                l.variant.id,
                l.quantity,
                l.unit_cents,
                l.variant.weight_g,
                l.variant.height_cm,
                l.variant.width_cm,
                l.variant.length_cm,
              ]),
            },
            cart_hash: fingerprint,
            destination_cep: input.cep,
            expires_at,
          })
          .select("id,service,price_cents,days,expires_at")
          .single();
        check(result.error);
        results.push(result.data);
      }
      return ok({ quotes: results, subtotal_cents: subtotal(lines) });
    }
    if (action === "order") {
      const input = orderSchema.parse(raw);
      if (
        input.payment_method === "mercadopago" &&
        (!process.env.MP_ACCESS_TOKEN || !process.env.MP_WEBHOOK_SECRET)
      )
        throw new StoreError("Pagamento online ainda não configurado.", 503);
      // Retries use the same key and private token, without reserving again.
      const existing = await db
        .from("mc_orders")
        .select("*")
        .eq("request_key", input.request_key)
        .maybeSingle();
      check(existing.error);
      const requestHash = hash(
        JSON.stringify({
          ...input,
          items: [...input.items].sort((a, b) =>
            a.variant_id.localeCompare(b.variant_id),
          ),
        }),
      );
      let order = existing.data;
      if (order) {
        if (
          order.access_hash !== hash(input.token) ||
          order.request_hash !== requestHash
        )
          throw new StoreError(
            "A tentativa anterior contém outros dados. Gere um novo pedido.",
            409,
          );
      } else {
        const view = await catalog();
        if (view.unavailable)
          throw new StoreError("Catálogo indisponível.", 503);
        let lines;
        try {
          lines = resolveCart(input.items, view.products);
        } catch (e) {
          throw new StoreError((e as Error).message, 409);
        }
        const fingerprint = hash(
          JSON.stringify(
            lines
              .map((l) => [
                l.variant.id,
                l.quantity,
                l.unit_cents,
                l.variant.weight_g,
                l.variant.height_cm,
                l.variant.width_cm,
                l.variant.length_cm,
              ])
              .sort(),
          ),
        );
        const result = await db.rpc("mc_create_order", {
          p_items: input.items,
          p_expected_subtotal: input.expected_subtotal_cents,
          p_customer: input.customer,
          p_delivery: input.delivery,
          p_address: input.address ?? null,
          p_quote: input.quote_id ?? null,
          p_cart_hash: fingerprint,
          p_method: input.payment_method,
          p_key: input.request_key,
          p_request_hash: requestHash,
          p_access_hash: hash(input.token),
        });
        if (result.error) {
          const text = result.error.message;
          throw new StoreError(
            text.includes("PRICE_CHANGED")
              ? "Os preços mudaram. Atualize a página e confira o total antes de confirmar."
              : text.includes("STOCK")
                ? "Estoque insuficiente. Atualize o carrinho."
                : text.includes("QUOTE")
                  ? "A cotação expirou ou mudou. Calcule novamente."
                  : "Pedido indisponível. Confira entrega e pagamento.",
            409,
          );
        }
        const saved = await db
          .from("mc_orders")
          .select("*")
          .eq("id", result.data)
          .single();
        check(saved.error);
        order = saved.data;
      }
      if (
        order.status === "cancelled" ||
        new Date(order.expires_at).getTime() < Date.now()
      )
        throw new StoreError("A reserva expirou. Inicie um novo pedido.", 409);
      return ok(await checkout(order));
    }
    if (action === "resume-order") {
      const input = lookupSchema
        .pick({ token: true })
        .extend({ request_key: uuid })
        .parse(raw);
      const r = await db
        .from("mc_orders")
        .select("id,protocol")
        .eq("request_key", input.request_key)
        .eq("access_hash", hash(input.token))
        .maybeSingle();
      check(r.error);
      if (!r.data) throw new StoreError("Pedido não localizado.", 404);
      return ok(r.data);
    }
    if (action === "retry-payment") {
      const input = lookupSchema.parse(raw);
      if (input.kind !== "order") throw new StoreError("Pedido inválido.");
      const r = await db
        .from("mc_orders")
        .select("*")
        .eq("protocol", input.protocol)
        .eq("access_hash", hash(input.token))
        .single();
      check(r.error);
      if (
        r.data.status !== "awaiting_payment" ||
        new Date(r.data.expires_at).getTime() < Date.now()
      )
        throw new StoreError("Pedido sem reserva válida.", 409);
      return ok(await checkout(r.data));
    }
    if (action === "repair-payment") {
      const input = decisionSchema
        .omit({ version: true, approve: true })
        .extend({
          payment_method: orderSchema.shape.payment_method,
          request_key: orderSchema.shape.request_key,
        })
        .parse(raw);
      const r = await db.rpc("mc_create_repair_order", {
        p_repair: input.id,
        p_hash: hash(input.token),
        p_method: input.payment_method,
        p_key: input.request_key,
        p_order_hash: hash(JSON.stringify(input)),
      });
      check(r.error);
      const saved = await db
        .from("mc_orders")
        .select("*")
        .eq("id", r.data)
        .single();
      check(saved.error);
      return ok(await checkout(saved.data));
    }
    if (action === "repair") {
      const input = repairSchema.parse(raw);
      const settings = await db
        .from("mc_settings")
        .select("*")
        .eq("id", true)
        .single();
      check(settings.error);
      if (!settings.data.terms_reviewed || !settings.data.repair_terms.trim())
        throw new StoreError(
          "As solicitações estarão disponíveis após a confirmação das condições de assistência.",
          503,
        );
      const service = await db
        .from("mc_services")
        .select("id")
        .eq("id", input.service_id)
        .eq("active", true)
        .maybeSingle();
      if (!service.data) throw new StoreError("Serviço indisponível.");
      if (
        input.photos.some((p) => !p.startsWith(uploadPrefix(input.token) + "/"))
      )
        throw new StoreError("Foto inválida.");
      const { token, terms, ...fields } = input;
      void terms;
      const requestHash = hash(
        JSON.stringify({ ...fields, photos: undefined }),
      );
      const previous = await db
        .from("mc_repairs")
        .select("id,protocol,request_hash")
        .eq("access_hash", hash(token))
        .maybeSingle();
      check(previous.error);
      if (previous.data) {
        if (previous.data.request_hash !== requestHash)
          throw new StoreError(
            "Esta solicitação já foi registrada com outros dados. Consulte seu protocolo.",
            409,
          );
        return ok({ id: previous.data.id, protocol: previous.data.protocol });
      }
      const saved = await db
        .from("mc_repairs")
        .insert({
          request_hash: requestHash,
          ...fields,
          access_hash: hash(token),
          terms_snapshot: settings.data.repair_terms,
        })
        .select("id,protocol")
        .single();
      check(saved.error);
      return ok(saved.data);
    }
    if (action === "lookup") {
      const input = lookupSchema.parse(raw);
      const table = input.kind === "repair" ? "mc_repairs" : "mc_orders";
      const result = await db
        .from(table)
        .select("*")
        .eq("protocol", input.protocol.toUpperCase())
        .eq("access_hash", hash(input.token))
        .maybeSingle();
      check(result.error);
      if (!result.data)
        throw new StoreError(
          "Protocolo ou chave de acompanhamento inválidos.",
          404,
        );
      const {
        access_hash,
        request_key,
        request_hash,
        customer,
        address,
        ...record
      } = result.data;
      void access_hash;
      void request_key;
      void request_hash;
      void customer;
      void address;
      if (input.kind === "repair") {
        const history = await db
          .from("mc_repair_history")
          .select("status,message,created_at")
          .eq("repair_id", record.id)
          .eq("public", true)
          .order("created_at");
        check(history.error);
        record.history = history.data;
        for (const key of ["photos", "technical_photos"]) {
          const signed = await db.storage
            .from("mc-repairs")
            .createSignedUrls(record[key] ?? [], 300);
          record[key] = (signed.data ?? [])
            .map((x) => x.signedUrl)
            .filter(Boolean);
        }
      } else {
        const items = await db
          .from("mc_order_items")
          .select("quantity,unit_cents,snapshot")
          .eq("order_id", record.id);
        check(items.error);
        record.items = items.data;
      }
      return ok(record);
    }
    if (action === "decision") {
      const input = decisionSchema.parse(raw);
      const result = await db.rpc("mc_repair_decision", {
        p_id: input.id,
        p_hash: hash(input.token),
        p_version: input.version,
        p_approve: input.approve,
      });
      if (result.error)
        throw new StoreError(
          "Orçamento alterado ou decisão já registrada. Consulte novamente.",
          409,
        );
      return ok({ saved: true });
    }
    throw new StoreError("Rota não encontrada.", 404);
  } catch (error) {
    return failure(error);
  }
}
function uploadPrefix(token: string) {
  const s = hash(token);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    if ((await params).action !== "photos")
      throw new StoreError("Rota não encontrada.", 404);
    await guard(request, "photos", 10);
    const token = request.headers.get("x-repair-token") ?? "";
    if (!/^[a-f0-9]{64}$/.test(token)) throw new StoreError("Chave inválida.");
    const { safeImage } = await import("@/lib/commerce/uploads");
    const { bytes, extension, mime } = await safeImage(request);
    const path = `${uploadPrefix(token)}/${Date.now()}.${extension}`;
    const result = await database()
      .storage.from("mc-repairs")
      .upload(path, bytes, { contentType: mime, upsert: false });
    check(result.error);
    return ok({ path, id: randomUUID() });
  } catch (error) {
    return failure(error);
  }
}

async function checkout(order: {
  id: string;
  protocol: string;
  payment_method: string;
  checkout_url: string | null;
  total_cents: number;
  expires_at: string;
  status: string;
}) {
  if (
    order.payment_method === "mercadopago" &&
    !order.checkout_url &&
    order.status === "awaiting_payment"
  ) {
    try {
      const preference = await mpFetch("/checkout/preferences", {
        method: "POST",
        headers: { "X-Idempotency-Key": order.id },
        body: JSON.stringify(preferenceBody(order)),
      });
      const url = new URL(preference.init_point);
      if (
        url.protocol !== "https:" ||
        !["mercadopago.com.br", "www.mercadopago.com.br"].includes(url.hostname)
      )
        throw new StoreError("Retorno de pagamento inválido.", 503);
      const saved = await database()
        .from("mc_orders")
        .update({
          preference_id: String(preference.id),
          checkout_url: preference.init_point,
        })
        .eq("id", order.id);
      check(saved.error);
      order.checkout_url = preference.init_point;
    } catch (e) {
      return {
        id: order.id,
        protocol: order.protocol,
        total_cents: order.total_cents,
        checkout_error:
          e instanceof StoreError
            ? e.message
            : "Não foi possível abrir o pagamento. Tente novamente na consulta do pedido.",
      };
    }
  }
  return {
    id: order.id,
    protocol: order.protocol,
    total_cents: order.total_cents,
    checkout_url:
      order.status === "awaiting_payment" ? order.checkout_url : null,
  };
}
