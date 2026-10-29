import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { serializeSignedCookie } from "better-call";

async function signIn(page: Page, context: BrowserContext) {
  const signed = await serializeSignedCookie(
    "better-auth.session_token",
    "synthetic-benchmark-token",
    "synthetic-benchmark-secret-not-for-deployment-0001",
  );
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: signed.split(";")[0].slice("better-auth.session_token=".length),
      url: "http://localhost:3107",
    },
  ]);
  await page.goto("/privado");
  await expect(
    page.getByRole("heading", { name: "Gastos del mes" }),
  ).toBeVisible();
}

async function navigate(page: Page, label: string) {
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: label, exact: true })
    .click();
}

test("comparte categorías entre registro y gestión sin volver a pedirlas al navegar", async ({
  page,
  context,
}) => {
  let reads = 0;
  page.on("request", (request) => {
    if (
      request.method() === "GET" &&
      new URL(request.url()).pathname === "/api/categories"
    )
      reads++;
  });
  await signIn(page, context);
  expect(reads).toBe(0);
  await navigate(page, "Registrar gasto");
  await expect(
    page.getByRole("option", { name: "Alimentación", exact: true }),
  ).toHaveCount(1);
  expect(reads).toBe(1);
  await navigate(page, "Configurar categorías");
  await page.getByLabel("Nombre", { exact: true }).fill("Cache sintética");
  await page
    .getByRole("button", { name: "Agregar categoría", exact: true })
    .click();
  await page.getByRole("button", { name: "Renombrar Cache sintética" }).click();
  await page.getByLabel("Nuevo nombre").fill("Cache actualizada");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await navigate(page, "Registrar gasto");
  await expect(
    page.getByRole("option", { name: "Cache actualizada", exact: true }),
  ).toHaveCount(1);
  expect(reads).toBe(1);
  await navigate(page, "Configurar categorías");
  await page
    .getByRole("button", { name: "Archivar Cache actualizada" })
    .click();
  await expect(
    page.getByRole("button", { name: "Mostrar archivadas (1)" }),
  ).toBeVisible();
  await navigate(page, "Registrar gasto");
  await expect(
    page.getByRole("option", { name: "Cache actualizada", exact: true }),
  ).toHaveCount(0);
  await navigate(page, "Configurar categorías");
  await page.getByRole("button", { name: "Mostrar archivadas (1)" }).click();
  await page
    .getByRole("button", { name: "Desarchivar Cache actualizada" })
    .click();
  await navigate(page, "Registrar gasto");
  await expect(
    page.getByRole("option", { name: "Cache actualizada", exact: true }),
  ).toHaveCount(1);
  expect(reads).toBe(1);
});

test("permite reintentar una primera carga fallida sin perder el formulario", async ({
  page,
  context,
}) => {
  let failed = false;
  await page.route("**/api/categories?includeArchived=true", async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({
        status: 503,
        json: { error: "SERVICE_UNAVAILABLE" },
      });
    } else await route.continue();
  });
  await signIn(page, context);
  await navigate(page, "Registrar gasto");
  await page
    .getByRole("combobox", { name: "Cuenta de origen" })
    .selectOption({ label: "Efectivo sintético · UYU" });
  await page.getByLabel("Título", { exact: true }).fill("Borrador conservado");
  await page.getByLabel("Importe", { exact: true }).fill("12.34");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "No pudimos cargar las categorías",
  );
  await expect(
    page.getByRole("button", { name: "Registrar gasto", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Reintentar categorías" }).click();
  await expect(
    page.getByRole("option", { name: "Alimentación", exact: true }),
  ).toHaveCount(1);
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    "Borrador conservado",
  );
  await expect(page.getByLabel("Importe", { exact: true })).toHaveValue(
    "12.34",
  );
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption({ label: "Alimentación" });
  await expect(
    page.getByRole("button", { name: "Registrar gasto", exact: true }),
  ).toBeEnabled();
});

async function focusAndWait(page: Page) {
  const response = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/categories",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await response;
}

test("actualiza al recuperar foco, conserva la lista en errores y rechaza categorías archivadas sin borrar campos", async ({
  page,
  context,
}) => {
  await signIn(page, context);
  const created = await context.request.post("/api/categories", {
    data: { name: "Foco sintético" },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  await navigate(page, "Registrar gasto");
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption(id);
  await page
    .getByRole("combobox", { name: "Cuenta de origen" })
    .selectOption({ label: "Efectivo sintético · UYU" });
  await page.getByLabel("Título", { exact: true }).fill("Campos conservados");
  await page.getByLabel("Importe", { exact: true }).fill("12.34");
  expect(
    (
      await context.request.patch(`/api/categories/${id}`, {
        data: { name: "Foco actualizado" },
      })
    ).ok(),
  ).toBe(true);
  await focusAndWait(page);
  await expect(
    page.getByRole("option", { name: "Foco actualizado", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toHaveValue(id);

  let failRefresh = true;
  await page.route("**/api/categories?includeArchived=true", (route) =>
    failRefresh
      ? route.fulfill({ status: 503, json: { error: "SERVICE_UNAVAILABLE" } })
      : route.continue(),
  );
  await focusAndWait(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Se conserva la lista anterior" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar gasto", exact: true }),
  ).toBeEnabled();
  failRefresh = false;
  expect(
    (await context.request.post(`/api/categories/${id}/archive`)).ok(),
  ).toBe(true);
  await focusAndWait(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Elegí otra categoría",
  );
  await expect(
    page.getByRole("combobox", { name: "Categoría", exact: true }),
  ).toHaveValue(id);
  await expect(
    page.getByRole("button", { name: "Registrar gasto", exact: true }),
  ).toBeDisabled();

  // Restore externally, then archive again without refreshing before submit.
  expect(
    (await context.request.post(`/api/categories/${id}/unarchive`)).ok(),
  ).toBe(true);
  await focusAndWait(page);
  await expect(
    page.getByRole("button", { name: "Registrar gasto", exact: true }),
  ).toBeEnabled();
  expect(
    (await context.request.post(`/api/categories/${id}/archive`)).ok(),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Registrar gasto", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Elegí otra categoría",
  );
  await expect(page.getByLabel("Título", { exact: true })).toHaveValue(
    "Campos conservados",
  );
  await expect(page.getByLabel("Importe", { exact: true })).toHaveValue(
    "12.34",
  );
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption({ label: "Alimentación" });
  await expect(
    page.getByRole("button", { name: "Registrar gasto", exact: true }),
  ).toBeEnabled();
});

test("una lectura atrasada no deshace una creación ni se reutiliza después de cerrar sesión", async ({
  page,
  context,
}) => {
  let held: { captured: () => void; done: Promise<void> } | undefined;
  let reads = 0;
  function delayNext() {
    let release!: () => void;
    let captured!: () => void;
    const started = new Promise<void>((resolve) => {
      captured = resolve;
    });
    const done = new Promise<void>((resolve) => {
      release = resolve;
    });
    held = { captured, done };
    return { started, release };
  }
  await page.route("**/api/categories?includeArchived=true", async (route) => {
    reads++;
    const current = held;
    if (!current) {
      await route.continue();
      return;
    }
    held = undefined;
    const response = await route.fetch();
    current.captured();
    await current.done;
    await route.fulfill({ response }).catch(() => {}); // The cache may abort a superseded read.
  });
  await signIn(page, context);
  await navigate(page, "Configurar categorías");
  await expect(
    page.getByRole("button", { name: "Agregar categoría", exact: true }),
  ).toBeEnabled();
  const stale = delayNext();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await stale.started;
  await page.getByLabel("Nombre", { exact: true }).fill("Creación reciente");
  await page
    .getByRole("button", { name: "Agregar categoría", exact: true })
    .click();
  await expect(
    page.getByText("Creación reciente", { exact: true }),
  ).toBeVisible();
  stale.release();
  await navigate(page, "Registrar gasto");
  await expect(
    page.getByRole("option", { name: "Creación reciente", exact: true }),
  ).toHaveCount(1);

  const afterLogout = delayNext();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await afterLogout.started;
  const readsBeforeLogout = reads;
  // Keep the reusable fixture's session for other tests; emulate the successful
  // sign-out response and cookie removal here. Server revocation has integration tests.
  await page.route("**/api/auth/sign-out", (route) =>
    route.fulfill({
      json: { success: true },
      headers: {
        "set-cookie": "better-auth.session_token=; Path=/; Max-Age=0",
      },
    }),
  );
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login/);
  afterLogout.release();
  await signIn(page, context);
  expect(reads).toBe(readsBeforeLogout);
  await navigate(page, "Registrar gasto");
  await expect(
    page.getByRole("option", { name: "Creación reciente", exact: true }),
  ).toHaveCount(1);
  expect(reads).toBe(readsBeforeLogout + 1);
});
