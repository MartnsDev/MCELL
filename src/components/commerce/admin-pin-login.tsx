"use client";
import { useState } from "react";
import { LockKeyhole, LogOut } from "lucide-react";
import { api } from "./api";
const endpoint = "/api/adm/1031825277";
export function AdminPinLogin({ configured, initialMessage = "" }: { configured: boolean; initialMessage?: string }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  return <form method="post" action={endpoint} className="panel admin-pin-login" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setMessage("");
    try { await api(endpoint, { pin }); setPin(""); window.location.replace("/adm/1031825277"); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }}>
    <LockKeyhole size={30} aria-hidden="true" />
    <p className="eyebrow">ADMINISTRAÇÃO M&apos;CELL</p>
    <h1>Acesso à loja</h1><p>Entre para editar produtos, preços e estoque.</p>
    {!configured && <p className="notice">A ativação do acesso administrativo está pendente. A loja ainda precisa concluir a conexão com o banco de dados.</p>}
    <label>Senha de acesso<input type="password" name="pin" required maxLength={64} autoComplete="current-password" value={pin} onChange={e=>setPin(e.target.value)} /></label>
    {message && <p className="notice" role="alert">{message}</p>}
    <button disabled={busy || !configured}>{busy ? "Entrando…" : "Entrar no painel"}</button>
  </form>;
}
export function AdminLogout() {
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  return <div><button className="secondary" disabled={busy} onClick={async()=>{
    setBusy(true);setMessage("");
    try {await api(endpoint,{action:"logout"});window.location.replace("/adm/1031825277");}
    catch(error){setMessage((error as Error).message);setBusy(false);}
  }}><LogOut size={16} /> Sair do painel</button>{message && <p role="alert">{message}</p>}</div>;
}
