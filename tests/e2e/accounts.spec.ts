import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "e2e_session", value: "synthetic-transfer-user", url: "http://localhost:3000" }]);
});

test("prioriza las cuentas de uso frecuente y presenta los saldos posteriores a una conversión", async ({ page }) => {
  await page.goto("/e2e/accounts");
  await expect(page.getByRole("status")).toContainText("datos ficticios posteriores a una conversión");
  const manager = page.locator("main > div.grid");
  const accountsSection = manager.locator("section[aria-labelledby='accounts-title']");
  const accountNames = accountsSection.locator("ul > li > div > div > p.font-semibold");
  await expect(accountNames).toHaveText(["Itaú pesos", "Billetera", "Itaú dólares", "Santander dólares", "Prex dólares", "Alfa", "Zeta"]);
  await expect(accountsSection.getByLabel("Saldo de Billetera")).toContainText("$4.550,00");
  await expect(manager.getByText("Total UYU:").locator("..")).toContainText("$13.652,00");
  await expect(manager.getByText("Total USD:").locator("..")).toContainText("U$S 30,00");
  await expect(manager.getByText("Total estimado en USD:").locator("..")).toContainText("U$S 371,30");
  await expect(manager.getByText("Al tipo de venta: 40,00 UYU/USD")).toBeVisible();
  await expect(accountsSection.getByRole("link", { name: "Ver movimientos de Billetera" }).locator("svg")).toBeVisible();

  const summary = manager.locator("aside[aria-labelledby='accounts-summary-title']");
  const accountsBox = await accountsSection.boundingBox();
  const summaryBox = await summary.boundingBox();
  expect(accountsBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  if ((page.viewportSize()?.width ?? 0) < 768) {
    expect(summaryBox!.y).toBeGreaterThan(accountsBox!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  } else {
    expect(summaryBox!.x).toBeGreaterThan(accountsBox!.x);
  }

  const archiveToggle = page.getByLabel("Mostrar archivadas");
  await expect(archiveToggle).toBeVisible();
  const archivedControlComesBeforeAddAccount = await page.evaluate(() => {
    const toggle = document.querySelector("input[type=checkbox]");
    const addAccount = document.querySelector("#new-account-title");
    return Boolean(toggle && addAccount && toggle.compareDocumentPosition(addAccount) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(archivedControlComesBeforeAddAccount).toBe(true);
  await archiveToggle.check();
  await expect(accountNames).toHaveCount(8);
  await expect(manager.getByText("Total UYU:").locator("..")).toContainText("$13.652,00");
});

test("usa acciones con iconos accesibles y permite archivar y restaurar una cuenta", async ({ page }) => {
  await page.route("**/api/accounts/e2e-wallet/archive", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "e2e-wallet", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: "500.00", openingDate: "2026-01-01", balance: "4550.00", archivedAt: "2026-10-29T12:00:00.000Z" }) });
  });
  await page.route("**/api/accounts/e2e-wallet/unarchive", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "e2e-wallet", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: "500.00", openingDate: "2026-01-01", balance: "4550.00", archivedAt: null }) });
  });
  await page.goto("/e2e/accounts");
  await page.getByRole("button", { name: "Renombrar Billetera" }).click();
  await expect(page.getByLabel("Nuevo nombre")).toHaveValue("Billetera");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Archivar Billetera" }).click();
  await expect(page.getByText("Billetera", { exact: true })).toHaveCount(0);
  await page.getByLabel("Mostrar archivadas").check();
  await page.getByRole("button", { name: "Desarchivar Billetera" }).click();
  await expect(page.getByRole("button", { name: "Archivar Billetera" })).toBeVisible();
});
