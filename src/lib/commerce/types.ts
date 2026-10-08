export type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
};
export type Variant = {
  id: string;
  product_id: string;
  label: string;
  sku: string;
  attributes: Record<string, string>;
  image: string | null;
  price_cents: number;
  promo_cents: number | null;
  stock: number;
  active: boolean;
  weight_g: number;
  height_cm: number;
  width_cm: number;
  length_cm: number;
};
export type Product = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  product_type: string;
  compatibility: string;
  specs: Record<string, string>;
  images: string[];
  featured: boolean;
  active: boolean;
  created_at: string;
  variants: Variant[];
  sold_count?: number;
  catalog_only?: boolean;
};
export type Settings = {
  whatsapp: string;
  email: string;
  pickup_enabled: boolean;
  pickup_address: string;
  pickup_hours: string;
  origin_cep?: string;
  shipping_enabled: boolean;
  payment_enabled: boolean;
  manual_payment: boolean;
  home_show_categories: boolean;
  home_show_featured: boolean;
  home_show_new: boolean;
  home_show_bestsellers: boolean;
  home_show_service: boolean;
  service_title: string;
  service_text: string;
  hero_title: string;
  hero_text: string;
  about: string;
  delivery_policy: string;
  privacy_policy: string;
  repair_terms: string;
  terms_reviewed: boolean;
  packing_weight_g: number;
  packing_padding_cm: number;
};
export type Service = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  sort_order: number;
};
export type Catalog = {
  products: Product[];
  categories: Category[];
  settings: Settings;
  services: Service[];
  unavailable?: boolean;
};
export type CartLine = { variant_id: string; quantity: number };
export type Quote = {
  id: string;
  service: string;
  price_cents: number;
  days: number;
  expires_at: string;
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const orderLabels: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  preparing: "Em preparação",
  ready_pickup: "Pronto para retirada",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
export const repairLabels: Record<string, string> = {
  received_request: "Solicitação recebida",
  awaiting_shipment: "Envio autorizado",
  device_received: "Aparelho recebido",
  diagnosing: "Em diagnóstico",
  awaiting_approval: "Aguardando sua aprovação",
  approved: "Orçamento aprovado",
  repairing: "Em reparo",
  testing: "Em testes",
  ready_pickup: "Pronto para retirada",
  awaiting_postage: "Aguardando postagem",
  shipped: "Enviado",
  completed: "Concluído",
  declined: "Orçamento recusado",
  unrepairable: "Sem conserto viável",
};
export const emptySettings: Settings = {
  whatsapp: "",
  email: "",
  pickup_enabled: false,
  pickup_address: "",
  pickup_hours: "",
  shipping_enabled: false,
  payment_enabled: false,
  manual_payment: false,
  home_show_categories: true,
  home_show_featured: true,
  home_show_new: true,
  home_show_bestsellers: true,
  home_show_service: true,
  service_title: "Conserto de celulares com agilidade e confiança.",
  service_text:
    "Seu celular apresentou algum problema? A gente resolve! Contamos com técnicos especializados e peças de qualidade.",
  hero_title: "Acessórios, eletrônicos e assistência técnica em um só lugar.",
  hero_text: "Qualidade, variedade e o melhor atendimento para o seu dia a dia.",
  about: "",
  delivery_policy: "",
  privacy_policy: "",
  repair_terms: "",
  terms_reviewed: false,
  packing_weight_g: 100,
  packing_padding_cm: 2,
};
