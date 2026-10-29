import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "e2e_session", value: "synthetic-transfer-user", url: "http://localhost:3000" }]);
});

test("inicia con filtros cerrados, agrupa los controles y aplica filtros de tipo", async ({ page }) => {
  await page.goto("/e2e/movements");
  const toggle = page.getByRole("button", { name: "Filtros" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("form", { name: "Filtros de movimientos" })).toBeHidden();
  await toggle.click();
  const groups = page.locator("[data-filter-group] > legend");
  await expect(groups).toHaveText(["Buscar / mes / desde / hasta", "Estado / moneda", "Tipo / cuenta / categoría"]);
  await page.getByRole("checkbox", { name: "Conversiones" }).check();
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/type=conversion/);
  await expect(page.getByRole("form", { name: "Filtros de movimientos" })).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: "Prex dólares" })).toContainText("Retiro · Conversión");
});

test("muestra estado, fecha local, notas, categoría y datos móviles de la fila", async ({ page }) => {
  const longNote = "Comida de equipo con nota de ejemplo extensa para comprobar que se trunca en la fila y sigue disponible al editar.";
  await page.route("**/api/expenses/e2e-expense", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "e2e-expense", voidedAt: null, operationDate: "2026-10-28", operationTime: "12:35:00", title: "Almuerzo", note: longNote, amount: "250.00", currency: "UYU", account: { id: "e2e-bank-uyu", name: "Itaú pesos", currency: "UYU" }, category: { id: "e2e-food", name: "Alimentación" }, source: { type: "manual", receivedAt: new Date(), original: {} }, history: [] }) });
  });
  await page.goto("/e2e/movements");
  const table = page.getByRole("table", { name: "Movimientos" });
  const expenseRow = table.getByRole("row").filter({ hasText: "Almuerzo" });
  await expect(expenseRow).toContainText("28/10/26");
  await expect(expenseRow).toContainText("12:35");
  await expect(expenseRow.locator("[title]").filter({ hasText: longNote })).toHaveAttribute("title", longNote);
  await expect(expenseRow).toContainText("Alimentación");
  await expect(expenseRow.locator(".bg-emerald-500")).toHaveCount(2);
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await expenseRow.getByText("Más datos").click();
    await expect(expenseRow.locator("details")).toContainText("UYU");
  } else {
    await expect(expenseRow.locator("td").nth(4)).toContainText("UYU");
  }
  await expenseRow.getByRole("button", { name: "Editar Almuerzo" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel(/Nota/)).toHaveValue(longNote);
  const pendingRow = table.getByRole("row").filter({ hasText: "Compra pendiente" });
  await expect(pendingRow).toContainText("Pendiente");
  await expect(pendingRow.locator(".bg-amber-400")).toHaveCount(2);
  await expect(page.getByText("Los pendientes no afectan saldos ni totales.")).toBeVisible();
  await expect(pendingRow.getByRole("link", { name: "Editar Compra pendiente" })).toHaveAttribute("href", "/privado/pendientes/e2e-pending");
});

test("el filtro de retiro encuentra la conversión banco a efectivo y el estado anulado se distingue", async ({ page }) => {
  await page.goto("/e2e/movements?type=withdrawal");
  const conversionRow = page.getByRole("row").filter({ hasText: "Prex dólares" });
  await expect(conversionRow).toContainText("Retiro · Conversión · USD → UYU");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.goto("/e2e/movements?status=voided");
  const voidedRow = page.getByRole("row").filter({ hasText: "Ingreso anulado" });
  await expect(voidedRow.locator(".bg-red-500")).toHaveCount(2);
  await expect(voidedRow.getByRole("button", { name: "Consultar Ingreso anulado" })).toBeVisible();
});
