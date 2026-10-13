import { requireAdmin } from "@/lib/commerce/server";
import { getSupabaseConfig } from "@/lib/supabase-config";
import { AdminPinLogin, AdminLogout } from "@/components/commerce/admin-pin-login";
import { AdminNav } from "@/components/commerce/admin-nav";
import { ProductAdmin } from "@/components/commerce/admin";
export const metadata = { title: "Acesso administrativo", robots: { index: false, follow: false } };
export default async function Page() {
  let authorized = false;
  try { await requireAdmin(); authorized = true; } catch { /* Never render private data before authorization. */ }
  const configured = Boolean(getSupabaseConfig() && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.MCELL_ADMIN_PIN && process.env.MCELL_ADMIN_USER_ID);
  return <main className="container section">
    {authorized ? <><div className="section-heading"><p className="eyebrow">ADMINISTRAÇÃO M&apos;CELL</p><AdminLogout /></div><AdminNav /><ProductAdmin /></> : <AdminPinLogin configured={configured} />}
  </main>;
}
