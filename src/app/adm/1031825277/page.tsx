import { requireAdmin } from "@/lib/commerce/server";
import { getSupabaseConfig } from "@/lib/supabase-config";
import { AdminPinLogin } from "@/components/commerce/admin-pin-login";
import { Brand } from "@/components/commerce/shell";
import { AdminShell } from "@/components/commerce/admin-shell";
import { ProductAdmin } from "@/components/commerce/admin";
export const metadata = { title: "Acesso administrativo", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const error = (await searchParams).error;
  const message = error === "limit" ? "Muitas tentativas. Aguarde dez minutos." : error === "login" ? "Não foi possível entrar. Confira a senha e tente novamente." : "";
  let authorized = false;
  try { await requireAdmin(); authorized = true; } catch { /* Never render private data before authorization. */ }
  const configured = Boolean(getSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.MCELL_ADMIN_PIN && process.env.MCELL_ADMIN_USER_ID && (process.env.MCELL_ADMIN_SESSION_SECRET?.length ?? 0) >= 32);
  return authorized ? <AdminShell><ProductAdmin /></AdminShell> : <main className="container section admin-login-page"><div className="admin-login-card"><Brand /><AdminPinLogin configured={configured} initialMessage={message} /></div></main>;
}
