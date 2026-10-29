import { expect, test, type Page } from "@playwright/test";
import { serializeSignedCookie } from "better-call";

async function focusAndWait(page: Page) {
  const response = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/categories");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await response;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

test("el ingreso de email reutiliza la colección y actualiza nombres sin perder el texto", async ({ page, context }) => {
  const signed = await serializeSignedCookie("better-auth.session_token", "synthetic-benchmark-token", "synthetic-benchmark-secret-not-for-deployment-0001");
  await context.addCookies([{ name: "better-auth.session_token", value: signed.split(";")[0].slice("better-auth.session_token=".length), url: "http://localhost:3107" }]);
  let reads = 0;
  page.on("request", request => { if (request.method() === "GET" && new URL(request.url()).pathname === "/api/categories") reads++; });
  await page.goto("/privado");
  await expect(page.getByRole("heading", { name: "Gastos del mes" })).toBeVisible();
  const created = await context.request.post("/api/categories", { data: { name: "Categoría consumidora43" } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  const menu = page.getByRole("navigation", { name: "Navegación principal" });
  await menu.getByRole("link", { name: "Registrar gasto", exact: true }).click();
  await expect(page.getByRole("option", { name: "Categoría consumidora43", exact: true })).toHaveCount(1);
  expect(reads).toBe(1);
  await menu.getByRole("link", { name: "Ingresar texto de email", exact: true }).click();
  await page.getByLabel("Texto del email").fill("Texto sintético conservado");
  await page.getByRole("combobox", { name: "Categoría", exact: true }).selectOption(id);
  expect((await context.request.patch(`/api/categories/${id}`, { data: { name: "Categoría actualizada43" } })).ok()).toBe(true);
  const refreshed = page.waitForResponse(response => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/categories");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await refreshed;
  await expect(page.getByRole("option", { name: "Categoría actualizada43", exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Texto del email")).toHaveValue("Texto sintético conservado");
  await expect(page.getByRole("combobox", { name: "Categoría", exact: true })).toHaveValue(id);
  expect(reads).toBe(2);

  const expense = await context.request.post("/api/expenses", { data: { operationDate: today(), title: "Gasto consumidor43", amount: "15.00", currency: "UYU", accountId: "benchmark-cash", categoryId: id } });
  expect(expense.status()).toBe(201);
  const pending = await context.request.post("/api/pending-entries", { data: { manualPending: true, entryType: "expense", operationDate: today(), title: "Pendiente consumidor43", amount: "10.00", currency: "UYU", accountId: "benchmark-cash", categoryId: id } });
  expect(pending.status()).toBe(202);
  await menu.getByRole("link", { name: "Movimientos", exact: true }).click();
  await page.getByRole("button", { name: "Editar Gasto consumidor43", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Edición conservada43");
  expect((await context.request.patch(`/api/categories/${id}`, { data: { name: "Nombre compartido43" } })).ok()).toBe(true);
  await focusAndWait(page);
  await expect(dialog.getByRole("option", { name: "Nombre compartido43", exact: true })).toHaveCount(1);
  await expect(dialog.getByLabel("Título", { exact: true })).toHaveValue("Edición conservada43");
  await expect(dialog.getByRole("combobox", { name: "Categoría", exact: true })).toHaveValue(id);
  expect(reads).toBe(3);
  page.once("dialog", prompt => prompt.accept());
  await dialog.getByRole("button", { name: "Cerrar popup" }).click();
  await page.getByRole("link", { name: "Editar Pendiente consumidor43", exact: true }).click();
  await page.getByLabel("Nota (opcional)").fill("Nota conservada43");
  expect((await context.request.patch(`/api/categories/${id}`, { data: { name: "Pendiente actualizado43" } })).ok()).toBe(true);
  await focusAndWait(page);
  await expect(page.getByRole("option", { name: "Pendiente actualizado43", exact: true })).toHaveCount(1);
  await expect(page.getByLabel("Nota (opcional)")).toHaveValue("Nota conservada43");
  await expect(page.getByRole("combobox", { name: "Categoría", exact: true })).toHaveValue(id);
  expect(reads).toBe(4);

  await menu.getByRole("link", { name: "Registrar gasto", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Detalle consumidor43");
  await page.getByLabel("Importe", { exact: true }).fill("15.00");
  await page.getByLabel("Cuenta de origen").selectOption("benchmark-cash");
  await page.getByRole("combobox", { name: "Categoría", exact: true }).selectOption(id);
  await page.getByRole("button", { name: "Registrar gasto", exact: true }).click();
  await page.getByRole("link", { name: "Ver detalle y evidencia" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Detalle conservado43");
  expect(reads).toBe(4);
  expect((await context.request.post(`/api/categories/${id}/archive`)).ok()).toBe(true);
  await focusAndWait(page);
  await expect(page.getByRole("combobox", { name: "Categoría", exact: true })).toHaveValue(id);
  await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Cambios guardados" })).toContainText("La evidencia original fue conservada");
  expect(reads).toBe(5);
  await page.getByRole("button", { name: "Actualizar detalle e historial" }).click();
  await expect(page.getByRole("heading", { name: "Detalle consumidor43", exact: true })).toBeVisible();
  expect(reads).toBe(5);
});

test("Casa Nueva sigue identificándose al renombrar y archivar; aplicar y limpiar filtros conserva la colección", async ({ page, context }) => {
  const signed = await serializeSignedCookie("better-auth.session_token", "synthetic-benchmark-token", "synthetic-benchmark-secret-not-for-deployment-0001");
  await context.addCookies([{ name: "better-auth.session_token", value: signed.split(";")[0].slice("better-auth.session_token=".length), url: "http://localhost:3107" }]);
  await page.goto("/privado");
  await expect(page.getByRole("heading", { name: "Gastos del mes" })).toBeVisible();
  const collection = await (await context.request.get("/api/categories?includeArchived=true")).json();
  const house = collection.categories.find((category: { systemKey: string }) => category.systemKey === "house_construction");
  const food = collection.categories.find((category: { systemKey: string }) => category.systemKey === "food");
  for (const [categoryId, title] of [[house.id, "Obra sintética43"], [food.id, "Habitual sintético43"]]) {
    expect((await context.request.post("/api/expenses", { data: { operationDate: today(), title, amount: "15.00", currency: "UYU", accountId: "benchmark-cash", categoryId } })).status()).toBe(201);
  }
  expect((await context.request.post("/api/pending-entries", { data: { manualPending: true, entryType: "expense", operationDate: today(), title: "Pendiente obra43", amount: "10.00", currency: "UYU", accountId: "benchmark-cash", categoryId: house.id } })).status()).toBe(202);
  expect((await context.request.patch(`/api/categories/${house.id}`, { data: { name: "Obra archivada43" } })).ok()).toBe(true);
  expect((await context.request.post(`/api/categories/${house.id}/archive`)).ok()).toBe(true);
  let reads = 0;
  page.on("request", request => { if (request.method() === "GET" && new URL(request.url()).pathname === "/api/categories") reads++; });
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Movimientos", exact: true }).click();
  await expect(page.locator("main[aria-busy=false]")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Habitual sintético43" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Obra sintética43" })).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "Pendiente obra43" })).toHaveCount(0);
  await page.getByRole("link", { name: "Ver gastos casa" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Obra sintética43" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Pendiente obra43" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Habitual sintético43" })).toHaveCount(0);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Obra archivada43", exact: true })).toBeChecked();
  await page.getByLabel("Buscar en detalle y nota").fill("Obra sintética43");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/search=Obra/);
  await expect(page.locator("main[aria-busy=false]")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Obra sintética43" })).toHaveCount(1);
  expect(reads).toBe(1);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("link", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Pendiente obra43" })).toHaveCount(1);
  expect(reads).toBe(1);
});
