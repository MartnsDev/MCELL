"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Settings, Service } from "@/lib/commerce/types";
import { api, privateToken, remember } from "./api";
import { WhatsApp } from "./shell";
export function RepairForm({
  settings: s,
  services,
}: {
  settings: Settings;
  services: Service[];
}) {
  const tokenRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<{
    protocol: string;
    token: string;
    summary: string;
  } | null>(null);
  const available = s.terms_reviewed && !!s.repair_terms && services.length > 0;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const token = tokenRef.current ?? privateToken();
      tokenRef.current = token;
      const photos: string[] = [];
      for (const file of files) {
        const r = await fetch("/api/commerce/photos", {
          method: "PUT",
          headers: { "Content-Type": file.type, "x-repair-token": token },
          body: file,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        photos.push(d.path);
      }
      const payload = {
        customer: {
          name: form.get("name"),
          phone: String(form.get("phone")).replace(/\D/g, ""),
          email: form.get("email"),
        },
        service_id: form.get("service_id"),
        brand: form.get("brand"),
        model: form.get("model"),
        defect: form.get("defect"),
        description: form.get("description"),
        modality: form.get("modality"),
        photos,
        token,
        terms: true,
      };
      const r = await api("/api/commerce/repair", payload);
      remember("repair", r.protocol, token);
      setResult({
        protocol: r.protocol,
        token,
        summary: `${payload.brand} ${payload.model} — ${payload.defect}. Modalidade: ${payload.modality === "mail" ? "envio pelos Correios" : "presencial"}.`,
      });
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="panel">
        <p className="eyebrow">SOLICITAÇÃO RECEBIDA</p>
        <h2>{result.protocol}</h2>
        <p>
          Guarde sua chave privada. Ela é necessária para acompanhar e decidir
          sobre o orçamento.
        </p>
        <div className="tracking-key">{result.token}</div>
        <p>
          Para enviar o aparelho pelos Correios, aguarde a autorização e as
          instruções da M&apos;Cell.
        </p>
        <div className="actions">
          <Link className="button" href="/assistencia/acompanhar">
            Acompanhar atendimento
          </Link>
          <WhatsApp
            settings={s}
            text={`Olá! Abri a solicitação ${result.protocol}. ${result.summary}`}
          />
        </div>
      </section>
    );
  if (!available)
    return (
      <section className="panel">
        <h2>Fale com nossa assistência</h2>
        <p>
          O formulário estará disponível após a confirmação das condições de
          atendimento. Você já pode consultar o responsável pelo orçamento.
        </p>
        <WhatsApp settings={s} />
      </section>
    );
  return (
    <form className="panel" onSubmit={submit}>
      <h2>Conte o que aconteceu</h2>
      <p>
        O diagnóstico define o orçamento. Nenhum reparo começa sem sua
        aprovação.
      </p>
      <div className="form-grid">
        <label>
          Nome completo
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          WhatsApp / telefone
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        <label className="full">
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Marca do aparelho
          <input name="brand" required maxLength={80} />
        </label>
        <label>
          Modelo
          <input name="model" required maxLength={100} />
        </label>
        <label>
          Serviço
          <select name="service_id" required>
            {services.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Modalidade
          <select name="modality">
            <option value="in_person">Atendimento presencial</option>
            <option value="mail">Quero enviar pelos Correios</option>
          </select>
        </label>
        <label className="full">
          Defeito principal
          <input name="defect" required maxLength={200} />
        </label>
        <label className="full">
          Descreva o problema
          <textarea
            name="description"
            required
            maxLength={4000}
            placeholder="Quando começou? Houve queda, contato com líquido ou outro sintoma?"
          />
        </label>
        <label className="full">
          Fotos opcionais (até 5, máximo 5 MB cada)
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (
                selected.length > 5 ||
                selected.some((f) => f.size > 5 * 1024 * 1024)
              ) {
                setFiles([]);
                setMessage("Selecione até 5 imagens de até 5 MB.");
                e.target.value = "";
                return;
              }
              setFiles(selected);
              setMessage("");
            }}
          />
        </label>
        <div className="full notice">
          Não informe senha, código de desbloqueio ou dados pessoais presentes
          no aparelho. Faça backup quando possível.
        </div>
        <details className="full">
          <summary>Condições de diagnóstico e assistência</summary>
          <p className="policy">{s.repair_terms}</p>
        </details>
        <label className="full">
          <input type="checkbox" required />
          Li as condições de diagnóstico, aprovação e devolução.
        </label>
      </div>
      <p role="status" className={message ? "notice error" : ""}>
        {message}
      </p>
      <button disabled={busy}>
        {busy ? "Enviando…" : "Solicitar orçamento"}
      </button>
    </form>
  );
}
