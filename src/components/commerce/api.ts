"use client";
export async function api(path: string, data: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "Não foi possível concluir.");
  return result;
}
export function privateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function remember(
  kind: "order" | "repair",
  protocol: string,
  token: string,
) {
  localStorage.setItem(
    `mc-${kind}-tracking`,
    JSON.stringify({ protocol, token }),
  );
}
