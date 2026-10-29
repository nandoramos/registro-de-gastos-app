import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "e2e_session", value: "synthetic-transfer-user", url: "http://localhost:3000" }]);
});

test("registra un retiro sintético banco a efectivo", async ({ page }) => {
  await page.route("**/api/transfers", async (route) => {
    expect(route.request().postDataJSON()).toEqual(expect.objectContaining({ kind: "withdrawal", sourceAccountId: "e2e-itau-uyu", destinationAccountId: "e2e-billetera-uyu", sourceAmount: "250", destinationAmount: "250" }));
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "e2e-withdrawal" }) });
  });
  await page.goto("/e2e/transfer");
  await expect(page.getByRole("status")).toContainText("Sesión sintética");
  await page.getByLabel("Cuenta de destino").selectOption("e2e-billetera-uyu");
  await page.getByLabel("Importe").fill("250");
  await page.getByRole("button", { name: "Registrar retiro" }).click();
  await expect(page.getByRole("link", { name: "Ver operación" })).toHaveAttribute("href", "/privado/transferencias/e2e-withdrawal");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("registra una conversión banco a efectivo con importes separados", async ({ page }) => {
  await page.route("**/api/conversions", async (route) => {
    expect(route.request().postDataJSON()).toEqual(expect.objectContaining({ sourceAccountId: "e2e-prex-usd", destinationAccountId: "e2e-billetera-uyu", sourceAmount: "100", destinationAmount: "4050", sourceCurrency: "USD", destinationCurrency: "UYU", destinationConfirmed: true }));
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "e2e-conversion" }) });
  });
  await page.goto("/e2e/transfer");
  await page.getByLabel("Cuenta de destino").selectOption("e2e-billetera-uyu");
  await page.getByLabel("Cuenta de origen").selectOption("e2e-prex-usd");
  await expect(page.getByText("Conversión y retiro", { exact: true })).toBeVisible();
  await page.getByLabel("Importe debitado").fill("100");
  await page.getByRole("textbox", { name: "Importe acreditado" }).fill("4050");
  await page.getByLabel("Confirmé el importe acreditado real").check();
  await page.getByRole("button", { name: "Registrar conversión y retiro" }).click();
  await expect(page.getByRole("link", { name: "Ver operación" })).toHaveAttribute("href", "/privado/conversiones/e2e-conversion");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
