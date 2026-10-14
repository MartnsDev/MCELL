import { body, failure, guard, hash, sessionClient, StoreError } from "@/lib/commerce/server";
import { validAdminPin } from "@/lib/commerce/admin-pin";

export async function POST(request: Request) {
  const nativeForm = request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded");
  const success = () => nativeForm
    ? new Response(null, { status: 303, headers: { Location: "/adm/1031825277", "Cache-Control": "no-store" } })
    : Response.json({ next: "/adm/1031825277" }, { headers: { "Cache-Control": "no-store" } });
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new StoreError("Origem inválida.", 403);
    const raw = await body(request, true);
    if (raw.action === "logout") {
      const client = await sessionClient();
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) throw new StoreError("Não foi possível encerrar a sessão.", 503);
      return success();
    }
    if (!process.env.MCELL_ADMIN_PIN || !process.env.MCELL_ADMIN_USER_ID)
      throw new StoreError("O acesso administrativo precisa ser ativado na configuração da loja.", 503);
    const db = await guard(request, "admin-pin", 1);
    const globalLimit = await db.rpc("mc_limit", { p_key: hash("admin-pin-global"), p_max: 10, p_seconds: 600 });
    if (globalLimit.error) throw new StoreError("Não foi possível validar o acesso.", 503);
    if (!globalLimit.data) throw new StoreError("Muitas tentativas. Aguarde dez minutos.", 429);
    if (!validAdminPin(raw.pin, process.env.MCELL_ADMIN_PIN))
      throw new StoreError("Senha incorreta.", 401);

    // Explicit owner identity; never pick another admin or create a user implicitly.
    const ownerId = process.env.MCELL_ADMIN_USER_ID;
    const membership = await db.from("admin_users").select("user_id").eq("user_id", ownerId).maybeSingle();
    if (membership.error || !membership.data)
      throw new StoreError("O responsável precisa estar cadastrado como administrador.", 503);
    const owner = await db.auth.admin.getUserById(ownerId);
    if (owner.error || !owner.data.user?.email)
      throw new StoreError("Não foi possível validar o responsável.", 503);
    const link = await db.auth.admin.generateLink({ type: "magiclink", email: owner.data.user.email });
    const token = link.data.properties?.hashed_token;
    if (link.error || !token || link.data.user?.id !== ownerId)
      throw new StoreError("Não foi possível iniciar a sessão.", 503);
    const client = await sessionClient();
    const verified = await client.auth.verifyOtp({ token_hash: token, type: "email" });
    const role = verified.error ? null : await client.rpc("is_admin");
    if (verified.error || verified.data.user?.id !== ownerId || role?.error || role?.data !== true) {
      await client.auth.signOut({ scope: "local" });
      throw new StoreError("Acesso não autorizado.", 403);
    }
    // Tokens stay in the existing Supabase cookie session. All admin APIs still
    // require getUser + is_admin and execute mutations as the authenticated owner.
    return success();
  } catch (error) {
    if (nativeForm) {
      const code = error instanceof StoreError && error.status === 429 ? "limit" : "login";
      return new Response(null, { status: 303, headers: { Location: `/adm/1031825277?error=${code}`, "Cache-Control": "no-store" } });
    }
    return failure(error);
  }
}
