import Link from "next/link";
import { sessionClient } from "@/lib/commerce/server";
import { Logout } from "@/components/commerce/account";
import { redirect } from "next/navigation";
export default async function Page() {
  let client;
  try {
    client = await sessionClient();
  } catch {
    redirect("/entrar");
  }
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/entrar");
  const role = await client.rpc("is_admin");
  return (
    <main className="container section">
      <h1>Sua conta</h1>
      <p>{data.user.email}</p>
      <div className="actions">
        <Link className="button" href="/pedidos">
          Acompanhar pedido
        </Link>
        <Link className="button secondary" href="/assistencia/acompanhar">
          Acompanhar conserto
        </Link>
        {role.data === true && (
          <Link className="button" href="/admin">
            Administração
          </Link>
        )}
        <Logout />
      </div>
    </main>
  );
}
