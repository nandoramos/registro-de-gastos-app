import type { Page } from "@playwright/test";

export type NavigationSample = { responseMs: number; usableMs: number };
declare global {
  interface Window {
    navigationSample?: NavigationSample;
  }
}

// Observe the content actually rendered after the click, not URL changes or
// the active menu item. Frame callbacks approximate presentation, not Web Vitals.
export async function measureNavigation(
  page: Page,
  label: string,
  heading: string,
) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    ({ label, heading }) => {
      delete window.navigationSample;
      const link = [
        ...document.querySelectorAll<HTMLAnchorElement>(
          'nav[aria-label="Navegación principal"] a',
        ),
      ].find((node) => node.textContent === label);
      if (!link) throw new Error("Navigation link absent");
      link.addEventListener(
        "click",
        () => {
          const start = performance.now();
          const content =
            document.querySelector<HTMLElement>(".private-content")!;
          const initialText = content.innerText;
          let responseMs: number | undefined;
          let framePending = false;
          const observer = new MutationObserver(() => {
            if (framePending) return;
            framePending = true;
            requestAnimationFrame(() => {
              framePending = false;
              const ready = [
                ...document.querySelectorAll<HTMLElement>(
                  ".private-content main:not([aria-busy='true']) h1",
                ),
              ].some(
                (title) =>
                  title.textContent === heading &&
                  !title.closest("[hidden], [aria-hidden='true']") &&
                  getComputedStyle(title).visibility !== "hidden" &&
                  !title.closest("main")?.querySelector("select:disabled") &&
                  title.getClientRects().length > 0,
              );
              if (ready || content.innerText !== initialText) {
                responseMs ??= performance.now() - start;
              }
              if (ready) {
                window.navigationSample = {
                  responseMs: responseMs!,
                  usableMs: performance.now() - start,
                };
                observer.disconnect();
              }
            });
          });
          observer.observe(content, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
          });
        },
        { once: true },
      );
    },
    { label, heading },
  );
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: label, exact: true })
    .click();
  await page.waitForFunction(
    () => window.navigationSample !== undefined,
    undefined,
    { timeout: 10000 },
  );
  return await page.evaluate(() => window.navigationSample!);
}
