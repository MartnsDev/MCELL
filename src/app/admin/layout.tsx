import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/commerce/server";
import { AdminShell } from "@/components/commerce/admin-shell";
export const metadata = { robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try { await requireAdmin(); }
  catch { redirect("/adm/1031825277"); }
  return <AdminShell>{children}</AdminShell>;
}
