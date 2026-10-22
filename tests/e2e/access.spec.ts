import { expect, test } from "@playwright/test";

test("el ingreso es usable en móvil y no produce desplazamiento horizontal", async ({
  page,
}) => {
  await page.goto("/login");
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
  await page.route("**/api/auth/sign-in/social", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "AUTH_UNAVAILABLE" }),
    }),
  );
  await page.goto("/login");
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
