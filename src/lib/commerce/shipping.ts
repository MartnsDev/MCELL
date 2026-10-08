import type { Settings } from "./types";
import { cep } from "./validation";
import { StoreError } from "./server";
export type ShippingItem = {
  quantity: number;
  unit_cents: number;
  variant: {
    id: string;
    weight_g: number;
    height_cm: number;
    width_cm: number;
    length_cm: number;
  };
};
export interface ShippingProvider {
  quote(
    origin: string,
    destination: string,
    items: ShippingItem[],
    settings: Settings,
  ): Promise<
    {
      service: string;
      price_cents: number;
      days: number;
      provider: string;
      payload: unknown;
    }[]
  >;
}
export function parcel(items: ShippingItem[], s: Settings) {
  // Conservative single box: stack items vertically and add configured packaging.
  const weight =
    items.reduce(
      (n, l) => n + l.variant.weight_g * l.quantity,
      s.packing_weight_g,
    ) / 1000;
  const height = Math.max(
    2,
    items.reduce((n, l) => n + l.variant.height_cm * l.quantity, 0) +
      s.packing_padding_cm,
  );
  const width = Math.max(
    11,
    ...items.map((l) => l.variant.width_cm + s.packing_padding_cm),
  );
  const length = Math.max(
    16,
    ...items.map((l) => l.variant.length_cm + s.packing_padding_cm),
  );
  if (
    weight > 30 ||
    Math.max(height, width, length) > 100 ||
    height + width + length > 200
  )
    throw new StoreError(
      "Este volume precisa de uma cotação manual. Fale com o atendimento.",
      422,
    );
  return { weight, height, width, length };
}
export class MelhorEnvio implements ShippingProvider {
  async quote(
    origin: string,
    destination: string,
    items: ShippingItem[],
    settings: Settings,
  ) {
    cep.parse(origin);
    cep.parse(destination);
    const token = process.env.MELHOR_ENVIO_TOKEN;
    if (!token)
      throw new StoreError(
        "Cotação automática indisponível. Solicite uma cotação pelo WhatsApp.",
        503,
      );
    const host =
      process.env.MELHOR_ENVIO_TEST_MODE === "true"
        ? "https://sandbox.melhorenvio.com.br"
        : "https://www.melhorenvio.com.br";
    const payload = {
      from: { postal_code: origin },
      to: { postal_code: destination },
      services: "2",
      volumes: [parcel(items, settings)],
      options: {
        insurance_value:
          items.reduce((n, l) => n + l.unit_cents * l.quantity, 0) / 100,
        receipt: false,
        own_hand: false,
      },
    };
    let response: Response;
    try {
      response = await fetch(`${host}/api/v2/me/shipment/calculate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": `M'Cell (${process.env.SHIPPING_CONTACT_EMAIL ?? ""})`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new StoreError(
        "O provedor de frete não respondeu. Tente novamente ou solicite cotação manual.",
        503,
      );
    }
    if (!response.ok)
      throw new StoreError("Não foi possível consultar o frete agora.", 503);
    const data = await response.json();
    const list = Array.isArray(data) ? data : [data];
    const quotes = list.filter(
      (x) =>
        !x.error &&
        String(x.id) === "2" &&
        /^\d+(\.\d{1,2})?$/.test(String(x.custom_price ?? x.price)) &&
        Number(x.custom_price ?? x.price) >= 0 &&
        Number.isInteger(Number(x.custom_delivery_time ?? x.delivery_time)) &&
        Number(x.custom_delivery_time ?? x.delivery_time) >= 0,
    );
    if (!quotes.length)
      throw new StoreError(
        "SEDEX indisponível para este envio. Solicite uma cotação manual.",
        422,
      );
    return quotes.map((x) => ({
      service: "SEDEX",
      price_cents: Math.round(Number(x.custom_price ?? x.price) * 100),
      days: Number(x.custom_delivery_time ?? x.delivery_time),
      provider: "melhor-envio",
      payload: { request: payload, response: x },
    }));
  }
}
