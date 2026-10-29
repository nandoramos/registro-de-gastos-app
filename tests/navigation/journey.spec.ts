import { expect, test } from "@playwright/test";
import { serializeSignedCookie } from "better-call";
import { measureNavigation } from "./measure";
import { writeFile } from "node:fs/promises";
import { platform, arch } from "node:os";

test("recorre las pantallas privadas reales y muestra el gasto guardado", async ({
  page,
  context,
  browser,
}, testInfo) => {
  const idleMs = Number(process.env.NAVIGATION_IDLE_MS ?? 5000);
  if (!Number.isFinite(idleMs) || idleMs < 0)
    throw new Error("Invalid NAVIGATION_IDLE_MS");
  test.setTimeout(180000 + idleMs);
  const signed = await serializeSignedCookie(
    "better-auth.session_token",
    "synthetic-benchmark-token",
    "synthetic-benchmark-secret-not-for-deployment-0001",
  );
  const value = signed.split(";")[0].slice("better-auth.session_token=".length);
  await context.addCookies([
    { name: "better-auth.session_token", value, url: "http://localhost:3107" },
  ]);
  const coldStart = Date.now();
  await page.goto("/privado");
  await expect(
    page.getByRole("heading", { name: "Gastos del mes" }),
  ).toBeVisible();
  const firstLoadMs = Date.now() - coldStart;
  const homeHeading = await page.locator("main h1").innerText();
  const samples = [];
  for (let repetition = 1; repetition <= 10; repetition++) {
    const history = await measureNavigation(page, "Movimientos", "Movimientos");
    const form = await measureNavigation(
      page,
      "Registrar gasto",
      "Registrar gasto",
    );
    const title = `Compra sintética del recorrido ${repetition}`;
    await page.getByLabel("Título", { exact: true }).fill(title);
    await page
      .getByLabel("Cuenta de origen")
      .selectOption({ label: "Efectivo sintético · UYU" });
    await page
      .getByRole("combobox", { name: "Categoría", exact: true })
      .selectOption({ label: "Alimentación" });
    await page.getByLabel("Importe", { exact: true }).fill("12.34");
    await page
      .getByRole("button", { name: "Registrar gasto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const savedHistory = await measureNavigation(
      page,
      "Movimientos",
      "Movimientos",
    );
    await expect(
      page
        .getByRole("row")
        .filter({ hasText: title })
        .filter({ has: page.getByText(title, { exact: true }) }),
    ).toContainText("12,34");
    const home = await measureNavigation(page, "Inicio", homeHeading);
    samples.push({ repetition, history, form, savedHistory, home });
  }
  // Intentional inactivity is measured separately, not included in warm samples.
  await new Promise((resolve) => setTimeout(resolve, idleMs));
  const afterIdle = await measureNavigation(page, "Movimientos", "Movimientos");
  const report = {
    recordedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: platform(),
      arch: arch(),
      browser: browser.version(),
      build: "next build --webpack + next start",
      database: "PGlite in-memory, no network latency",
      network: "localhost, no throttling",
      viewport: page.viewportSize(),
      firstLoad: "First authenticated load of a fresh server process",
    },
    firstLoadMs,
    idleMs,
    afterIdle,
    samples,
  };
  await writeFile(
    testInfo.outputPath("navigation-baseline.json"),
    JSON.stringify(report, null, 2),
  );
  await testInfo.attach("navigation-baseline", {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });

  await context.clearCookies();
  await page.goto("/privado");
  await expect(page).toHaveURL(/\/login/);
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: "forged",
      url: "http://localhost:3107",
    },
  ]);
  await page.goto("/privado");
  await expect(page).toHaveURL(/\/login/);
});
