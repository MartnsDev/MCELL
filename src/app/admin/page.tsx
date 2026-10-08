import { requireAdmin, check } from "@/lib/commerce/server";
import { money } from "@/lib/commerce/types";
export const metadata = { title: "Administração", robots: { index: false } };
export default async function Page() {
  const client = await requireAdmin();
  const result = await client.rpc("mc_dashboard");
  check(result.error);
  const stats = result.data as {
    orders: number;
    paid_orders: number;
    revenue_cents: number;
    repairs: number;
    products: number;
  };
  return (
    <>
      <h1>Visão geral</h1>
      <p>Indicadores dos registros persistidos da M&apos;Cell.</p>
      <div className="admin-grid subsection">
        <div className="panel">
          <p>Vendas confirmadas</p>
          <div className="metric">{money(stats.revenue_cents)}</div>
          <small>
            Inclui frete. Exclui eventos de estorno e chargeback; custos não
            deduzidos.
          </small>
        </div>
        <div className="panel">
          <p>Pedidos</p>
          <div className="metric">{stats.orders}</div>
          <small>{stats.paid_orders} com pagamento confirmado</small>
        </div>
        <div className="panel">
          <p>Solicitações de assistência</p>
          <div className="metric">{stats.repairs}</div>
        </div>
        <div className="panel">
          <p>Produtos cadastrados</p>
          <div className="metric">{stats.products}</div>
        </div>
      </div>
    </>
  );
}
