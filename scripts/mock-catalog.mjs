// Isolated test fixtures. This server is never imported by the application.
import http from "node:http";
const category = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Capinhas",
  slug: "capinhas",
  active: true,
  sort_order: 0,
};
const base = {
  id: "00000000-0000-4000-8000-000000000010",
  category_id: category.id,
  name: "Capinha de teste",
  slug: "capinha-de-teste",
  description: "Produto de teste isolado. Nunca publicado na loja real.",
  brand: "Marca Teste",
  product_type: "Capinha",
  compatibility: "Samsung A15 e A16",
  specs: { Material: "TPU" },
  images: [],
  featured: true,
  active: true,
  created_at: "2026-10-07",
  sold_count: 0,
};
const variant = {
  product_id: base.id,
  attributes: { Cor: "Azul" },
  image: null,
  price_cents: 1990,
  promo_cents: null,
  stock: 2,
  active: true,
  weight_g: 100,
  height_cm: 2,
  width_cm: 11,
  length_cm: 16,
};
const catalog = {
  categories: [category],
  products: [
    {
      ...base,
      variants: [
        {
          ...variant,
          id: "00000000-0000-4000-8000-000000000011",
          sku: "CASE-A15",
          label: "Samsung A15 azul",
        },
        {
          ...variant,
          id: "00000000-0000-4000-8000-000000000012",
          sku: "CASE-A16",
          label: "Samsung A16 azul",
          stock: 0,
        },
      ],
    },
  ],
  services: [
    {
      id: "00000000-0000-4000-8000-000000000020",
      name: "Troca de tela",
      description: "Avaliação de teste",
      active: true,
      sort_order: 0,
    },
  ],
  settings: {
    whatsapp: "",
    email: "",
    pickup_enabled: true,
    pickup_address: "Endereço fictício apenas do teste isolado",
    pickup_hours: "Horários de teste",
    shipping_enabled: true,
    payment_enabled: false,
    manual_payment: true,
    hero_title: "Tecnologia para o seu dia. Cuidado para o seu celular.",
    hero_text: "Acessórios, eletrônicos e assistência técnica em um só lugar.",
    home_show_categories: true,
    home_show_featured: true,
    home_show_new: true,
    home_show_bestsellers: true,
    home_show_service: true,
    service_title: "Seu celular merece uma segunda chance.",
    service_text:
      "Acompanhe o diagnóstico e aprove o orçamento antes do reparo.",
    about: "",
    delivery_policy: "Condições de teste",
    privacy_policy: "Privacidade de teste",
    repair_terms:
      "Termos de teste isolado. Não envie seu aparelho antes de autorização.",
    terms_reviewed: true,
    packing_weight_g: 100,
    packing_padding_cm: 2,
  },
};
http
  .createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/rest/v1/rpc/mc_catalog") {
      res.end(JSON.stringify(catalog));
      return;
    }
    if (req.url === "/rest/v1/rpc/mc_limit") {
      res.end("true");
      return;
    }
    res.statusCode = 401;
    res.end(
      JSON.stringify({ message: "Not authorized", error: "Not authorized" }),
    );
  })
  .listen(3111, "127.0.0.1", () => console.log("Test catalog ready on 3111"));
