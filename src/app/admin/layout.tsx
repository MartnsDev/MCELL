import { AdminNav } from "@/components/commerce/admin-nav";
import type { ReactNode } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase-config";

// Protect every admin page before rendering. Database RLS remains authoritative
// for every individual read and write, including after a session changes.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const config = getSupabaseConfig();
  if (!config) redirect("/entrar?error=config");
  const cookieStore = await cookies();
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The proxy refreshes cookies before this Server Component renders.
        }
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/entrar");
  const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
  if (roleError || isAdmin !== true) redirect("/conta");
  return (
    <main className="container section">
      <p className="eyebrow">ADMINISTRAÇÃO M&apos;Cell</p>
      <AdminNav />
      {children}
    </main>
  );
}
