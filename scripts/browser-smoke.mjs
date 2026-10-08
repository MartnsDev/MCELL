// Run against Next.js started with the isolated mock catalog. No production writes.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = "http://127.0.0.1:3110";
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox"],
});
const dir = "/tmp/martins-cell-browser";
await fs.mkdir(dir, { recursive: true });
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page
      .getByRole("heading", {
        name: "Acessórios, eletrônicos e assistência técnica em um só lugar.",
      })
      .waitFor();
    await page.screenshot({
      path: `${dir}/home-${viewport.width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
      "Homepage horizontal overflow",
    );
    assert.equal(
      await page.getByRole("heading", { name: "Mais vendidos" }).count(),
      0,
      "No fabricated bestseller",
    );
    await page.locator(".storefront-product").hover();
    await page.getByRole("button", { name: "Salvar nos favoritos" }).click();
    await page.getByRole("link", { name: "Favoritos", exact: true }).click();
    await page.getByRole("heading", { name: "Meus favoritos" }).waitFor();
    await page.getByRole("heading", { name: "Capinha de teste" }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "Capinha de teste" }).waitFor();
    await page.getByRole("button", { name: "Remover dos favoritos" }).click();
    await page.getByText("Salve seus produtos pelo coração", { exact: false }).waitFor();
    await page.goto(base);
    await page
      .getByRole("textbox", { name: "Buscar produtos" })
      .fill("CASE-A15");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.getByRole("heading", { name: "Capinha de teste" }).waitFor();
    await page.getByRole("heading", { name: "Capinha de teste" }).click();
    await page
      .getByRole("heading", { name: "Capinha de teste", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Adicionar ao carrinho" })
        .isDisabled(),
      true,
    );
    await page
      .getByLabel("Versão / modelo / cor")
      .selectOption("00000000-0000-4000-8000-000000000011");
    assert.equal(
      await page
        .locator('option[value="00000000-0000-4000-8000-000000000012"]')
        .evaluate((el) => el.disabled),
      true,
      "Sold out version",
    );
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
    assert.match(await page.locator(".cart-link").textContent(), /R\$\s*19,90/, "Header uses current catalog prices");
    await page.getByRole("link", { name: "Ir para o carrinho" }).click();
    await page.getByRole("heading", { name: "Carrinho de compras" }).waitFor();
    await page.getByRole("heading", { name: "Capinha de teste" }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: "Capinha de teste" }).waitFor();
    assert.equal(
      await page.getByLabel("Rua / avenida").count(),
      0,
      "Pickup needs no shipping address",
    );
    await page.getByLabel("Como deseja receber?").selectOption("shipping");
    await page.getByLabel("Rua / avenida").waitFor();
    await page.route("**/api/commerce/quote", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "Cotação automática indisponível. Solicite uma cotação pelo WhatsApp.",
        }),
      }),
    );
    await page.getByLabel("CEP", { exact: true }).fill("01001000");
    await page.getByRole("button", { name: "Calcular frete" }).click();
    await page
      .getByText("Cotação automática indisponível.", { exact: false })
      .waitFor();
    await page.getByLabel("Como deseja receber?").selectOption("pickup");
    await page.getByLabel("Nome completo").fill("Cliente Teste");
    await page.getByLabel("Telefone / WhatsApp").fill("11988887777");
    await page
      .getByLabel("Email", { exact: true })
      .fill("cliente@example.test");
    await page.route("**/api/commerce/order", (route) => {
      const body = route.request().postDataJSON();
      assert.equal(body.delivery, "pickup");
      assert.equal(
        body.items[0].variant_id,
        "00000000-0000-4000-8000-000000000011",
      );
      assert.equal(body.payment_method, "manual");
      assert.equal(body.expected_subtotal_cents, 1990);
      assert.equal("total_cents" in body, false);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          protocol: "MC-TEST",
          id: "00000000-0000-4000-8000-000000000040",
          total_cents: 1990,
        }),
      });
    });
    await page
      .getByRole("button", { name: "Confirmar pedido e pagar" })
      .click();
    await page.getByRole("heading", { name: "MC-TEST" }).waitFor();
    await page.screenshot({
      path: `${dir}/checkout-${viewport.width}.png`,
      fullPage: true,
    });
    await page.goto(`${base}/assistencia`);
    await page.getByLabel("Nome completo").fill("Cliente Teste");
    await page.getByLabel("WhatsApp / telefone").fill("11988887777");
    await page
      .getByLabel("Email", { exact: true })
      .fill("cliente@example.test");
    await page.getByLabel("Marca do aparelho").fill("Samsung");
    await page.getByLabel("Modelo", { exact: true }).fill("A15");
    await page.getByLabel("Defeito principal").fill("Tela quebrada");
    await page.getByLabel("Descreva o problema").fill("Defeito de teste");
    await page.getByLabel("Li as condições").check();
    await page.route("**/api/commerce/repair", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-4000-8000-000000000030",
          protocol: "AT-TEST",
        }),
      }),
    );
    await page
      .getByRole("button", { name: "Solicitar orçamento", exact: true })
      .click();
    await page.getByRole("heading", { name: "AT-TEST" }).waitFor();
    await page.goto(`${base}/admin`);
    await page.waitForURL("**/entrar");
    assert.equal(
      await page.getByRole("heading", { name: "Visão geral" }).count(),
      0,
      "Admin protected",
    );
    assert.deepEqual(errors, [], "No browser errors");
    await context.close();
    console.log(
      `PASS ${viewport.width}px: favorites, search, variants, stock, persistent cart, pickup, shipping error, checkout, repair, admin protection`,
    );
  }
} finally {
  await browser.close();
}
console.log(`Screenshots: ${dir}`);
