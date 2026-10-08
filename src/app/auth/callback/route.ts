import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/commerce/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, url.origin));
  try {
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.has("error"))
      return redirect("/entrar?error=oauth");
    const client = await sessionClient();
    const exchange = await client.auth.exchangeCodeForSession(code);
    if (exchange.error) return redirect("/entrar?error=oauth");
    const user = await client.auth.getUser();
    if (user.error || !user.data.user) return redirect("/entrar?error=oauth");
    const role = await client.rpc("is_admin");
    return redirect(!role.error && role.data === true ? "/admin" : "/conta");
  } catch {
    return redirect("/entrar?error=oauth");
  }
}
