import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { Brand } from "./shell";
import { AdminNav } from "./admin-nav";
import { AdminLogout } from "./admin-pin-login";
export function AdminShell({ children }: { children: ReactNode }) {
  return <div className="admin-shell">
    <aside className="admin-sidebar"><Brand /><div className="admin-sidebar-label">CENTRAL DA LOJA</div><AdminNav /><div className="admin-sidebar-foot"><ShieldCheck size={19} /><span>Acesso protegido<small>Sessão válida por até 8 horas</small></span></div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><span className="admin-online-dot" />Painel da M&apos;Cell</div><div className="admin-top-actions"><Link href="/" target="_blank" rel="noopener noreferrer">Ver loja <ArrowUpRight size={16} /></Link><AdminLogout /></div></header><main className="admin-content">{children}</main></div>
  </div>;
}
