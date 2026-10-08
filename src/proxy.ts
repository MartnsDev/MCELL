import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./lib/supabase-config";
export async function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/" &&
    (request.nextUrl.searchParams.has("code") ||
      request.nextUrl.searchParams.has("error"))
  ) {
    const callback = new URL("/auth/callback", request.url);
    callback.search = request.nextUrl.search;
    return NextResponse.redirect(callback);
  }
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try {
    await client.auth.getUser();
  } catch {}
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/",
    "/entrar",
    "/conta",
    "/admin/:path*",
    "/api/admin/:path*",
    "/auth/:path*",
  ],
};
