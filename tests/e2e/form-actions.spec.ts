import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "e2e_session", value: "synthetic-transfer-user", url: "http://localhost:3000" }]);
});

for (const form of ["expense", "income", "transfer", "withdrawal", "conversion"]) {
  test(`separa registrar y guardar pendiente en ${form} sin desbordar`, async ({ page }) => {
    if ((page.viewportSize()?.width ?? 0) < 768) await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/e2e/transfer?form=${form}`);
    if (form === "conversion" || form === "withdrawal") {
      if (form === "conversion") await page.getByLabel("Cuenta de origen").selectOption("e2e-prex-usd");
      await page.getByLabel("Cuenta de destino").selectOption("e2e-billetera-uyu");
    }
    const register = page.getByRole("button", { name: /^Registrar/ });
    const pending = page.getByRole("button", { name: "Guardar pendiente", exact: true });
    await register.scrollIntoViewIfNeeded();
    const first = (await register.boundingBox())!;
    const second = (await pending.boundingBox())!;
    const horizontalGap = second.x - first.x - first.width;
    const verticalGap = second.y - first.y - first.height;
    expect(horizontalGap >= 11 || verticalGap >= 11).toBe(true);
    for (const button of [first, second]) {
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
