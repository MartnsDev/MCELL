import {
  body,
  check,
  database,
  failure,
  hash,
  StoreError,
} from "@/lib/commerce/server";
import { mpFetch, validSignature } from "@/lib/commerce/payment";
export async function POST(request: Request) {
  try {
    const data = await body(request);
    const id =
      new URL(request.url).searchParams.get("data.id") ??
      String(data.data?.id ?? "");
    if (
      !validSignature(
        request.headers.get("x-signature") ?? "",
        request.headers.get("x-request-id") ?? "",
        id,
        process.env.MP_WEBHOOK_SECRET ?? "",
      )
    )
      throw new StoreError("Assinatura inválida.", 401);
    if (data.type !== "payment") return Response.json({ received: true });
    if (String(data.data?.id) !== id)
      throw new StoreError("Notificação inválida.");
    const payment = await mpFetch(`/v1/payments/${id}`);
    if (
      String(payment.id) !== id ||
      !payment.external_reference ||
      !/^\d+(\.\d{1,2})?$/.test(String(payment.transaction_amount))
    )
      throw new StoreError("Pagamento inválido.");
    const result = await database().rpc("mc_record_payment", {
      p_event: hash(`${id}:${payment.status}:${payment.date_last_updated}`),
      p_order: payment.external_reference,
      p_payment: id,
      p_status: payment.status,
      p_amount: Math.round(Number(payment.transaction_amount) * 100),
      p_currency: payment.currency_id,
    });
    check(result.error);
    // ACK only after durable processing: a failed DB/API call remains retryable.
    return Response.json({ received: true });
  } catch (error) {
    if (!(error instanceof StoreError))
      return Response.json({ error: "Falha temporária." }, { status: 503 });
    return failure(error);
  }
}
