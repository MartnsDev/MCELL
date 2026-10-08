"use client";
import { useEffect, useState } from "react";
import {
  money,
  orderLabels,
  repairLabels,
  type Settings,
} from "@/lib/commerce/types";
import { api, remember } from "./api";
import { WhatsApp } from "./shell";
type RecordData = {
  id: string;
  protocol: string;
  status: string;
  history?: { status: string; message: string; created_at: string }[];
  items?: {
    quantity: number;
    unit_cents: number;
    snapshot: { name: string; label: string; sku: string };
  }[];
  diagnosis?: string;
  estimate_cents?: number;
  return_cents?: number;
  estimate_version?: number;
  deadline?: string;
  shipping_instructions?: string;
  inbound_tracking?: string;
  outbound_tracking?: string;
  tracking?: string;
  tests?: string;
  technical_photos?: string[];
  subtotal_cents?: number;
  shipping_cents?: number;
  total_cents?: number;
  shipping_snapshot?: { service: string; address?: string; hours?: string };
  checkout_url?: string;
  terms_snapshot?: string;
};
export function Tracking({
  kind,
  settings: s,
}: {
  kind: "order" | "repair";
  settings: Settings;
}) {
  const [protocol, setProtocol] = useState("");
  const [token, setToken] = useState("");
  const [record, setRecord] = useState<RecordData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(
          localStorage.getItem(`mc-${kind}-tracking`) ?? "null",
        );
        if (active && saved) {
          setProtocol(saved.protocol);
          setToken(saved.token);
        }
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [kind]);
  async function load() {
    setMessage("");
    setBusy(true);
    setConfirm(null);
    try {
      setRecord(await api("/api/commerce/lookup", { kind, protocol, token }));
    } catch (e) {
      setRecord(null);
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="narrow">
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <label>
          Protocolo
          <input
            required
            value={protocol}
            maxLength={30}
            placeholder={kind === "repair" ? "AT-…" : "MC-…"}
            onChange={(e) => {
              setProtocol(e.target.value);
              setRecord(null);
            }}
          />
        </label>
        <label style={{ marginTop: 15 }}>
          Chave privada de acompanhamento
          <input
            type="password"
            autoComplete="off"
            required
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setRecord(null);
            }}
            placeholder="Chave recebida ao finalizar a solicitação"
          />
        </label>
        <button style={{ marginTop: 20 }} disabled={busy}>
          {busy ? "Consultando…" : "Consultar"}
        </button>
        <p role="status" className={message ? "notice error" : ""}>
          {message}
        </p>
        <small>
          A chave é pessoal: permite consultar e aprovar seu orçamento. Se a
          perdeu, fale com o atendimento para validação de identidade.
        </small>
      </form>
      {record && (
        <section className="panel subsection">
          <p className="eyebrow">{record.protocol}</p>
          <h2>
            {(kind === "repair" ? repairLabels : orderLabels)[record.status] ??
              record.status}
          </h2>
          {kind === "order" ? (
            <>
              <div className="subsection">
                {record.items?.map((i, index) => (
                  <div className="cart-row" key={index}>
                    <div>
                      <strong>{i.snapshot.name}</strong>
                      <p>
                        {i.snapshot.label} · SKU {i.snapshot.sku} · {i.quantity}{" "}
                        un.
                      </p>
                    </div>
                    <strong>{money(i.unit_cents * i.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div className="totals">
                <div>
                  <span>Subtotal</span>
                  <strong>{money(record.subtotal_cents ?? 0)}</strong>
                </div>
                <div>
                  <span>{record.shipping_snapshot?.service}</span>
                  <strong>{money(record.shipping_cents ?? 0)}</strong>
                </div>
                <div className="total">
                  <span>Total</span>
                  <strong>{money(record.total_cents ?? 0)}</strong>
                </div>
              </div>
              {record.shipping_snapshot?.address && (
                <p>
                  Retirada: {record.shipping_snapshot.address}
                  <br />
                  {record.shipping_snapshot.hours}
                </p>
              )}
              {record.tracking && <p>Rastreamento: {record.tracking}</p>}
              {record.status === "awaiting_payment" && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await api("/api/commerce/retry-payment", {
                        kind: "order",
                        protocol,
                        token,
                      });
                      if (r.checkout_url)
                        window.location.assign(r.checkout_url);
                      else
                        setMessage(
                          r.checkout_error ??
                            "Pagamento a combinar. Fale com o atendimento.",
                        );
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Continuar pagamento
                </button>
              )}
              <p>
                <small>
                  O pagamento é confirmado pelo servidor. Se a reserva expirar
                  após uma cobrança, o atendimento fará a conciliação.
                </small>
              </p>
            </>
          ) : (
            <>
              {record.shipping_instructions && (
                <div className="notice">
                  <strong>Instruções de envio autorizadas</strong>
                  <p className="policy">{record.shipping_instructions}</p>
                </div>
              )}
              {record.inbound_tracking && (
                <p>Rastreio de entrada: {record.inbound_tracking}</p>
              )}
              {record.diagnosis && (
                <>
                  <h3 className="subsection">Diagnóstico</h3>
                  <p className="policy">{record.diagnosis}</p>
                </>
              )}
              {record.estimate_cents !== null &&
                record.estimate_cents !== undefined && (
                  <div className="totals">
                    <div>
                      <span>Serviço</span>
                      <strong>{money(record.estimate_cents)}</strong>
                    </div>
                    <div>
                      <span>Frete de retorno</span>
                      <strong>{money(record.return_cents ?? 0)}</strong>
                    </div>
                    <div className="total">
                      <span>Total do orçamento</span>
                      <strong>
                        {money(
                          record.estimate_cents + (record.return_cents ?? 0),
                        )}
                      </strong>
                    </div>
                    <p>
                      Prazo: {record.deadline || "A confirmar"} · Versão{" "}
                      {record.estimate_version}
                    </p>
                  </div>
                )}
              {record.status === "awaiting_approval" && (
                <>
                  <div className="actions">
                    <button disabled={busy} onClick={() => setConfirm(true)}>
                      Aprovar orçamento
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => setConfirm(false)}
                    >
                      Recusar orçamento
                    </button>
                  </div>
                  {confirm !== null && (
                    <div className="notice">
                      <p>
                        {confirm
                          ? "Confirma a aprovação do serviço e do frete de retorno desta versão?"
                          : "Confirma a recusa? A devolução seguirá as condições informadas."}
                      </p>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await api("/api/commerce/decision", {
                              id: record.id,
                              token,
                              version: record.estimate_version,
                              approve: confirm,
                            });
                            await load();
                          } catch (e) {
                            setMessage((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Confirmar {confirm ? "aprovação" : "recusa"}
                      </button>
                    </div>
                  )}
                </>
              )}
              {[
                "approved",
                "repairing",
                "testing",
                "ready_pickup",
                "awaiting_postage",
              ].includes(record.status) &&
                record.estimate_cents !== undefined && (
                  <div className="actions">
                    {(s.payment_enabled || s.manual_payment) && (
                      <button
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            const r = await api(
                              "/api/commerce/repair-payment",
                              {
                                id: record.id,
                                token,
                                payment_method: s.payment_enabled
                                  ? "mercadopago"
                                  : "manual",
                                request_key: crypto.randomUUID(),
                              },
                            );
                            remember("order", r.protocol, token);
                            if (r.checkout_url)
                              window.location.assign(r.checkout_url);
                            else
                              setMessage(
                                `Cobrança ${r.protocol} registrada. ${r.checkout_error ?? "Consulte em Acompanhar pedido ou fale com o atendimento."}`,
                              );
                          } catch (e) {
                            setMessage((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Pagar serviço e frete de retorno
                      </button>
                    )}
                  </div>
                )}
              {record.tests && (
                <>
                  <h3>Testes realizados</h3>
                  <p className="policy">{record.tests}</p>
                </>
              )}
              {record.outbound_tracking && (
                <p>Rastreio de devolução: {record.outbound_tracking}</p>
              )}
              {record.technical_photos &&
                record.technical_photos.length > 0 && (
                  <div className="upload-preview">
                    {record.technical_photos.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver foto técnica
                      </a>
                    ))}
                  </div>
                )}
              <div className="timeline">
                {record.history?.map((h, i) => (
                  <div key={i}>
                    <small>
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </small>
                    <h3>{repairLabels[h.status] ?? h.status}</h3>
                    <p>{h.message}</p>
                  </div>
                ))}
              </div>
              <details>
                <summary>Condições aceitas nesta solicitação</summary>
                <p className="policy">{record.terms_snapshot}</p>
              </details>
            </>
          )}
          <div className="subsection">
            <WhatsApp
              settings={s}
              text={`Olá! Quero falar sobre o protocolo ${record.protocol}.`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
