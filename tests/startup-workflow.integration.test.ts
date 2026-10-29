import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { accountResourceResponse } from "@/modules/accounts/http";
import { listAccounts } from "@/modules/accounts/service";
import { ensureInitialCategories } from "@/modules/categories/service";
import { expensesCollectionResponse } from "@/modules/expenses/http";
import { listMovementHistory } from "@/modules/movements/history";
import { changeMovementStatus } from "@/modules/movements/status";
import { adjustmentCollectionResponse } from "@/modules/adjustments/http";
import { monthlySummary } from "@/modules/summary/service";

const database = new PGlite();
const db = drizzle(database, { schema });
const userId = "startup-test-owner";
const access = async () => ({ status: "authorized" as const, userId });
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Montevideo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const month = today.slice(0, 7);

function request(path: string, method: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values({ id: userId, name: "Synthetic owner", email: "startup-test@example.test" });
  await db.insert(schema.financialAccount).values({ id: "startup-cash", userId, name: "Efectivo de prueba", kind: "cash", currency: "UYU" });
  await ensureInitialCategories(db, userId);
});
afterAll(async () => database.close());

it("recorre la puesta en marcha con datos ficticios, sin asumir saldo cero", async () => {
  const configured = await accountResourceResponse(request("/api/accounts/startup-cash/opening-balance", "POST", { amount: "1000.00", date: today }), "startup-cash", db, access);
  expect(configured.status).toBe(200);
  expect((await listAccounts(db, userId))[0].balance).toBe("1000.00");

  const [category] = await db.select({ id: schema.expenseCategory.id }).from(schema.expenseCategory).where((await import("drizzle-orm")).eq(schema.expenseCategory.systemKey, "food"));
  const expense = await expensesCollectionResponse(request("/api/expenses", "POST", {
    operationDate: today,
    operationTime: null,
    title: "Compra ficticia de prueba",
    note: null,
    categoryId: category.id,
    accountId: "startup-cash",
    amount: "200.00",
    currency: "UYU",
  }), db, access);
  expect(expense.status).toBe(201);
  expect((await listAccounts(db, userId))[0].balance).toBe("800.00");

  const adjustment = await adjustmentCollectionResponse(request("/api/adjustments", "POST", {
    accountId: "startup-cash",
    observedBalance: "750.00",
  }), db, access);
  expect(adjustment.status).toBe(201);
  const { id: adjustmentId } = await adjustment.json();
  expect((await listAccounts(db, userId))[0].balance).toBe("750.00");
  expect((await monthlySummary(db, userId, month)).totals).toEqual([{ currency: "UYU", amount: "250.00" }]);
  expect((await listMovementHistory(db, userId, { month, types: ["expense", "adjustment"], spendingOnly: true })).map(({ type }) => type)).toEqual(["adjustment", "expense"]);

  await changeMovementStatus(db, userId, "adjustment", adjustmentId, "void");
  expect((await listAccounts(db, userId))[0].balance).toBe("800.00");
  expect((await monthlySummary(db, userId, month)).totals).toEqual([{ currency: "UYU", amount: "200.00" }]);
});
