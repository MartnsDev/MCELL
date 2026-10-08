// Next's proxy can use an internal hostname. Host identifies the requested site.
export function requestOrigin(request: Pick<Request, "url" | "headers">) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  if (host) url.host = host;
  return url.origin;
}
