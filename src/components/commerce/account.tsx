"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
export function Login() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel narrow">
      <p className="eyebrow">SUA CONTA</p>
      <h1>Acesse a M&apos;Cell</h1>
      <p>
        Entre com sua conta Google. Você pode comprar e solicitar assistência
        sem criar uma conta.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const c = createClient();
          if (!c) {
            setMessage("Acesso temporariamente indisponível.");
            setBusy(false);
            return;
          }
          const { error } = await c.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) {
            setMessage("Não foi possível entrar. Tente novamente.");
            setBusy(false);
          }
        }}
      >
        Entrar com Google
      </button>
      <p role="status">{message}</p>
    </section>
  );
}
export function Logout() {
  const router = useRouter();
  return (
    <button
      className="secondary"
      onClick={async () => {
        await createClient()?.auth.signOut();
        router.push("/");
        router.refresh();
      }}
    >
      Sair da conta
    </button>
  );
}
