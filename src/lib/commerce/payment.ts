import { createHmac, timingSafeEqual } from "node:crypto";
import { StoreError } from "./server";
export function validSignature(
  signature: string,
  requestId: string,
  id: string,
  secret: string,
  now = Date.now(),
) {
  const entries = signature.split(",").map((p) => p.trim().split("="));
  const parts = Object.fromEntries(entries);
  if (
    !secret ||
    !requestId ||
    !/^\d+$/.test(id) ||
    !/^\d+$/.test(parts.ts ?? "") ||
    !/^[a-f0-9]{64}$/i.test(parts.v1 ?? "")
  )
    return false;
  const timestamp = Number(parts.ts);
  const milliseconds = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  if (Math.abs(now - milliseconds) > 600000) return false;
  const expected = createHmac("sha256", secret)
    .update(`id:${id};request-id:${requestId};ts:${parts.ts};`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}
export function preferenceBody(order: {
  id: string;
  protocol: string;
  total_cents: number;
  expires_at: string;
}) {
  const base =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const u = new URL(base);
  const publicAppUrl =
    u.protocol === "https:" &&
    !["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(u.hostname);
  return {
    items: [
      {
        id: order.id,
        title: `M'Cell — pedido ${order.protocol}`,
        quantity: 1,
        unit_price: order.total_cents / 100,
        currency_id: "BRL",
      },
    ],
    external_reference: order.id,
    back_urls: {
      success: `${u.origin}/pedidos`,
      failure: `${u.origin}/pedidos`,
      pending: `${u.origin}/pedidos`,
    },
    ...(publicAppUrl
      ? {
          auto_return: "approved",
          notification_url: `${u.origin}/api/payments/webhook`,
        }
      : {}),
    expires: true,
    expiration_date_to: order.expires_at,
    statement_descriptor: "MCELL",
  };
}
export async function mpFetch(path: string, init?: RequestInit) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token || !process.env.MP_WEBHOOK_SECRET)
    throw new StoreError("Pagamento online ainda não configurado.", 503);
  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new StoreError(
      "O pagamento não respondeu. Seu pedido foi preservado; tente novamente.",
      503,
    );
  }
  if (!response.ok)
    throw new StoreError(
      "Não foi possível abrir o pagamento. Seu pedido foi preservado; tente novamente.",
      503,
    );
  return response.json();
}
