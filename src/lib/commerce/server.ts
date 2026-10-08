import { cache } from "react";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { preparedCatalog } from "./prepared-catalog";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { createHash } from "node:crypto";
import { getSupabaseConfig } from "@/lib/supabase-config";
import { emptySettings, type Catalog } from "./types";
export class StoreError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function database() {
  const config = getSupabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!config || !key)
    throw new StoreError(
      "A loja está temporariamente indisponível. Entre em contato com o atendimento.",
      503,
    );
  return createSupabaseClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function sessionClient() {
  const config = getSupabaseConfig();
  if (!config) throw new StoreError("Acesso não configurado.", 503);
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {}
      },
    },
  });
}
export async function requireAdmin() {
  const client = await sessionClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new StoreError("Entre na sua conta.", 401);
  const role = await client.rpc("is_admin");
  if (role.error || role.data !== true)
    throw new StoreError("Acesso não autorizado.", 403);
  return client;
}
async function preparedView(): Promise<Catalog> {
  for (const relative of ["data/imports/products.json", "data/catalog/products.json"]) {
    try {
      const file = path.join(process.cwd(), relative);
      const [raw, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
      return preparedCatalog(JSON.parse(raw), info.mtime.toISOString());
    } catch {
      // Public snapshot keeps the storefront working without local private imports.
    }
  }
  return { products: [], categories: [], services: [], settings: emptySettings, unavailable: true };
}
export const catalog = cache(async (): Promise<Catalog> => {
  const config = getSupabaseConfig();
  if (!config) return preparedView();
  try {
    const client = createSupabaseClient(config.url, config.key, {
      auth: { persistSession: false },
    });
    const { data, error } = await client.rpc("mc_catalog");
    if (error?.code === "PGRST202") return preparedView();
    if (error || !data) throw new Error();
    return data as Catalog;
  } catch {
    return {
      products: [],
      categories: [],
      services: [],
      settings: emptySettings,
      unavailable: true,
    };
  }
});
export async function guard(request: Request, scope: string, max = 15) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new StoreError("Origem inválida.", 403);
  const db = database();
  // Configure TRUST_PROXY_IP only behind a proxy that overwrites this header.
  const ip =
    process.env.TRUST_PROXY_IP === "true"
      ? (request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        "unknown")
      : "shared";
  const { data, error } = await db.rpc("mc_limit", {
    p_key: hash(`${scope}:${ip}`),
    p_max: process.env.TRUST_PROXY_IP === "true" ? max : max * 10,
    p_seconds: 600,
  });
  if (error)
    throw new StoreError("Não foi possível validar a solicitação.", 503);
  if (!data)
    throw new StoreError("Muitas solicitações. Aguarde alguns minutos.", 429);
  return db;
}
export async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new StoreError("Solicitação vazia.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 100000) {
      await reader.cancel();
      throw new StoreError("Solicitação muito grande.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new StoreError("JSON inválido.");
  }
}
export const check = (error: unknown) => {
  if (error)
    throw new StoreError(
      "Não foi possível salvar. Confira os dados e tente novamente.",
      409,
    );
};
export function failure(error: unknown) {
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join(" · "),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const known = error instanceof StoreError;
  return Response.json(
    {
      error: known
        ? error.message
        : "Não foi possível concluir. Tente novamente.",
    },
    {
      status: known ? error.status : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
