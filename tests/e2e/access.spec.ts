import { expect, test } from "@playwright/test";

test("la página publica un favicon válido para la pestaña del navegador", async ({ page }) => {
  await page.goto("/login");
  const icon = page.locator('head link[rel="icon"]');
  await expect(icon).toHaveAttribute("href", /favicon\.ico/);
  const response = await page.request.get((await icon.getAttribute("href"))!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/");
  expect([...(await response.body()).subarray(0, 4)]).toEqual([0, 0, 1, 0]);
});

test("la pantalla de acceso cabe en el viewport configurado", async ({
  page,
}) => {
  await page.goto("/login");
  const logo = page.getByRole("img", { name: "Registro de Gastos" });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Entender tus gastos",
  );
  await expect(
    page.getByRole("button", { name: "Continuar con Google" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("no muestra contenido privado sin sesión", async ({ page }) => {
  await page.goto("/privado");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Este es tu espacio." }),
  ).toHaveCount(0);
});
test("un fallo de ingreso muestra un mensaje y permite reintentar", async ({
  page,
}) => {
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "AUTH_UNAVAILABLE" }),
    }),
  );
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "No pudimos iniciar sesión",
  );
  await expect(
    page.getByRole("button", { name: "Continuar con Google" }),
  ).toBeEnabled();
});
test("distingue indisponibilidad temporal de una cuenta no autorizada", async ({
  page,
}) => {
  await page.goto("/login?error=unavailable");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "temporalmente",
  );
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
    "cuenta habilitada",
  );
});
