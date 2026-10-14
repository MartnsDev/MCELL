"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Shapes, ShoppingBag, Wrench, ClipboardList, CreditCard, Settings, History } from "lucide-react";
export function AdminNav() {
  const pathname = usePathname();
  const entries = [
    ["", "Visão geral", LayoutDashboard], ["produtos", "Produtos", Package],
    ["categorias", "Categorias", Shapes], ["pedidos", "Pedidos / clientes", ShoppingBag],
    ["assistencia", "Assistência", Wrench], ["servicos", "Serviços", ClipboardList],
    ["pagamentos", "Pagamentos", CreditCard], ["configuracoes", "Configurações", Settings],
    ["auditoria", "Auditoria", History],
  ] as const;
  return <nav className="admin-nav" aria-label="Administração">{entries.map(([p,n,Icon])=>{
    const href=`/admin${p ? "/"+p : ""}`;
    const active=pathname===href||(p==="produtos"&&pathname.startsWith("/adm/"));
    return <Link key={p} href={href} aria-current={active?"page":undefined}><Icon size={18} /><span>{n}</span></Link>;
  })}</nav>;
}
