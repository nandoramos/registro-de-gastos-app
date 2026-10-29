// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

const mockedRuntime = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/modules/auth/page", () => ({
  requireAuthorizedPage: async () => ({ status: "authorized", userId: "startup-views-owner" }),
}));
vi.mock("@/modules/auth/server", () => ({
  getAuthRuntime: () => ({ db: mockedRuntime.db }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import PrivateHome from "@/app/privado/page";
import HistoryPage from "@/app/privado/historial/page";

const database = new PGlite();
const db = drizzle(database, { schema });
const userId = "startup-views-owner";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Montevideo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const month = today.slice(0, 7);
afterEach(cleanup);

beforeAll(async () => {
  mockedRuntime.db = db;
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values({ id: userId, name: "Synthetic owner", email: "startup-views@example.test" });
  await db.insert(schema.financialAccount).values({ id: "views-account", userId, name: "Cuenta ficticia", kind: "bank", currency: "UYU", openingBalance: "1000.00", openingDate: today });
  await db.insert(schema.expenseCategory).values([
    { id: "views-food", userId, name: "Alimentación", systemKey: "food" },
    { id: "views-adjustment", userId, name: "Ajuste manual", systemKey: "manual_adjustment" },
  ]);
  await db.insert(schema.sourceEvent).values([
    { id: "views-expense-event", userId, sourceType: "manual", originalPayload: {} },
    { id: "views-negative-event", userId, sourceType: "manual", originalPayload: {} },
    { id: "views-positive-event", userId, sourceType: "manual", originalPayload: {} },
    { id: "views-pending-event", userId, sourceType: "manual", originalPayload: {} },
  ]);
  await db.insert(schema.expense).values({ id: "views-expense", userId, sourceEventId: "views-expense-event", accountId: "views-account", categoryId: "views-food", operationDate: today, title: "Compra ficticia", amount: "200.00", currency: "UYU" });
  await db.insert(schema.manualAdjustment).values([
    { id: "views-negative", userId, sourceEventId: "views-negative-event", accountId: "views-account", categoryId: "views-adjustment", operationDate: today, direction: "decrease", amount: "25.00", title: "Ajuste ficticio negativo" },
    { id: "views-positive", userId, sourceEventId: "views-positive-event", accountId: "views-account", categoryId: "views-adjustment", operationDate: today, direction: "increase", amount: "10.00", title: "Ajuste ficticio positivo" },
  ]);
  await db.insert(schema.pendingEntry).values({ sourceEventId: "views-pending-event", userId, interpretation: { entryType: "expense", title: "Pendiente ficticio" }, issues: ["Revisar datos"] });
});

afterAll(async () => {
  await database.close();
});

it.each([["escritorio", 1440], ["móvil", 390]] as const)("recorre Inicio y el detalle de gastos en %s con registros ficticios", async (_viewport, width) => {
  window.innerWidth = width;
  window.dispatchEvent(new Event("resize"));

  const home = await PrivateHome();
  const homeView = render(home);
  expect(screen.getByText("UYU 225.00")).toBeTruthy();
  expect(screen.getByText("USD 0.00")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Pendientes de revisión (1)" }).getAttribute("href")).toBe("/privado/pendientes");
  const detailLink = screen.getByRole("link", { name: "Ver movimientos que forman estos gastos" });
  expect(detailLink.getAttribute("href")).toContain("spending=true");
  homeView.unmount();

  const history = await HistoryPage({
    searchParams: Promise.resolve({ month, type: ["expense", "adjustment"], spending: "true" }),
  });
  render(history);
  const main = within(screen.getByRole("main"));
  expect(main.getByText("Compra ficticia")).toBeTruthy();
  expect(main.getByText("Ajuste ficticio negativo")).toBeTruthy();
  expect(main.queryByText("Ajuste ficticio positivo")).toBeNull();
  expect(main.queryByText("Pendiente ficticio")).toBeNull();
});
