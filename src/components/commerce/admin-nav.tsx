import Link from "next/link";
export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Administração">
      {[
        ["", "Visão geral"],
        ["produtos", "Produtos"],
        ["categorias", "Categorias"],
        ["pedidos", "Pedidos / clientes"],
        ["assistencia", "Assistência"],
        ["servicos", "Serviços"],
        ["pagamentos", "Pagamentos"],
        ["configuracoes", "Configurações"],
        ["auditoria", "Auditoria"],
      ].map(([p, n]) => (
        <Link key={p} href={`/admin${p ? "/" + p : ""}`}>
          {n}
        </Link>
      ))}
    </nav>
  );
}
