import { expect, test } from "@playwright/test";
import { serializeSignedCookie } from "better-call";
import { measureNavigation } from "./measure";

test("muestra la carga y permite interrumpir una navegación lenta desde el menú", async ({
  page,
  context,
}) => {
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
  await page.waitForLoadState("networkidle");
  await context.addCookies([
    { name: "navigation-delay", value: "1", url: "http://localhost:3107" },
  ]);
  const menu = page.getByRole("navigation", { name: "Navegación principal" });
  await menu.getByRole("link", { name: "Movimientos", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Cargando movimientos" }),
  ).toBeVisible();
  await expect(menu).toBeVisible();
  await menu
    .getByRole("link", { name: "Resumen mensual", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resumen mensual", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Cargando movimientos" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Movimientos", exact: true }),
  ).toHaveCount(0);
  await menu.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Cargando pantalla" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Gastos del mes" }),
  ).toBeVisible();
  const sample = await measureNavigation(page, "Movimientos", "Movimientos");
  // The injected 1.5s wait must not be counted as usable skeleton content.
  expect(sample.usableMs - sample.responseMs).toBeGreaterThan(500);
});
