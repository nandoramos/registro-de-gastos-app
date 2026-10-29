import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { ensureInitialCategories } from "@/modules/categories/service";
import { listAccounts } from "@/modules/accounts/service";
import { listMovementHistory } from "@/modules/movements/history";
import { changeMovementStatus } from "@/modules/movements/status";
import { monthlySummary } from "@/modules/summary/service";
import {
  adjustmentCollectionResponse,
  adjustmentResourceResponse,
} from "@/modules/adjustments/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({ status: "authorized" as const, userId: "adjustment-owner" });

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    { id: "adjustment-owner", name: "Adjustment owner", email: "adjustment-owner@example.test", emailVerified: true },
    { id: "adjustment-other", name: "Adjustment other", email: "adjustment-other@example.test", emailVerified: true },
  ]);
  await ensureInitialCategories(db, "adjustment-owner");
});

beforeEach(async () => {
  await db.delete(schema.manualAdjustment);
  await db.delete(schema.sourceEvent);
  await db.delete(schema.financialAccount);
  await db.insert(schema.financialAccount).values([
    { id: "adjustment-account-a", userId: "adjustment-owner", name: "Itaú pesos", kind: "bank", currency: "UYU", openingBalance: "9500.00", openingDate: "2026-10-01" },
    { id: "adjustment-account-b", userId: "adjustment-owner", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: "100.00", openingDate: "2026-10-01" },
    { id: "adjustment-account-other", userId: "adjustment-other", name: "Cuenta ajena", kind: "bank", currency: "UYU", openingBalance: "500.00", openingDate: "2026-10-01" },
  ]);
});

afterAll(async () => database.close());

describe("ajustes manuales", () => {
  it("crea solo la diferencia, la clasifica como gasto y permite anular/restaurar", async () => {
    const created = await adjustmentCollectionResponse(
      request("/api/adjustments", "POST", { accountId: "adjustment-account-a", observedBalance: "9000.00", note: "Conteo" }),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(201);
    const adjustment = await created.json();
    expect(adjustment).toEqual(expect.objectContaining({
      title: "Ajuste manual",
      direction: "decrease",
      amount: "500.00",
      operationDate: expect.any(String),
      accountId: "adjustment-account-a",
      account: "Itaú pesos",
      currency: "UYU",
      category: "Ajuste manual",
      note: "Conteo",
    }));
    expect((await listAccounts(db, "adjustment-owner")).find((account) => account.id === "adjustment-account-a")?.balance).toBe("9000.00");
    expect(await monthlySummary(db, "adjustment-owner", "2026-10")).toEqual(expect.objectContaining({
      totals: [{ currency: "UYU", amount: "500.00" }],
      incomeTotals: [],
      categories: [{ currency: "UYU", category: "Ajuste manual", amount: "500.00" }],
    }));
    const [category] = await db.select({ id: schema.expenseCategory.id }).from(schema.expenseCategory).where((await import("drizzle-orm")).eq(schema.expenseCategory.systemKey, "manual_adjustment"));
    expect((await listMovementHistory(db, "adjustment-owner", { month: "2026-10", type: "adjustment", categoryId: category.id })).map((movement) => movement.type)).toEqual(["adjustment"]);

    await changeMovementStatus(db, "adjustment-owner", "adjustment", adjustment.id, "void");
    expect((await listAccounts(db, "adjustment-owner")).find((account) => account.id === "adjustment-account-a")?.balance).toBe("9500.00");
    expect(await monthlySummary(db, "adjustment-owner", "2026-10")).toEqual({ totals: [], incomeTotals: [], categories: [] });
    await changeMovementStatus(db, "adjustment-owner", "adjustment", adjustment.id, "restore");
    expect((await listAccounts(db, "adjustment-owner")).find((account) => account.id === "adjustment-account-a")?.balance).toBe("9000.00");
  });

  it("edita cuenta, fecha, dirección e importe y revierte la cuenta anterior", async () => {
    const created = await adjustmentCollectionResponse(
      request("/api/adjustments", "POST", { accountId: "adjustment-account-a", observedBalance: "9000.00" }), db, ownerAccess,
    );
    const adjustment = await created.json();
    const response = await adjustmentResourceResponse(
      request(`/api/adjustments/${adjustment.id}`, "PATCH", {
        accountId: "adjustment-account-b",
        operationDate: "2026-10-28",
        direction: "increase",
        amount: "250.00",
        title: "Ajuste manual corregido",
        note: "Reconciliación",
      }),
      adjustment.id,
      db,
      ownerAccess,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).direction).toBe("increase");
    const accounts = await listAccounts(db, "adjustment-owner");
    expect(accounts.find((account) => account.id === "adjustment-account-a")?.balance).toBe("9500.00");
    expect(accounts.find((account) => account.id === "adjustment-account-b")?.balance).toBe("350.00");
    expect((await monthlySummary(db, "adjustment-owner", "2026-10")).incomeTotals).toEqual([{ currency: "UYU", amount: "250.00" }]);
  });

  it("no crea ajuste de diferencia cero y rechaza cuentas ajenas", async () => {
    const equal = await adjustmentCollectionResponse(
      request("/api/adjustments", "POST", { accountId: "adjustment-account-a", observedBalance: "9500.00" }), db, ownerAccess,
    );
    expect(equal.status).toBe(200);
    expect((await equal.json()).status).toBe("already_equal");
    expect(await db.select().from(schema.manualAdjustment)).toHaveLength(0);

    const foreign = await adjustmentCollectionResponse(
      request("/api/adjustments", "POST", { accountId: "adjustment-account-other", observedBalance: "400.00" }), db, ownerAccess,
    );
    expect(foreign.status).toBe(422);
    expect(await db.select().from(schema.manualAdjustment)).toHaveLength(0);
  });

  it("serializa dos ajustes simultáneos para no aplicar dos veces la misma diferencia", async () => {
    const responses = await Promise.all([
      adjustmentCollectionResponse(request("/api/adjustments", "POST", { accountId: "adjustment-account-a", observedBalance: "9000.00" }), db, ownerAccess),
      adjustmentCollectionResponse(request("/api/adjustments", "POST", { accountId: "adjustment-account-a", observedBalance: "9000.00" }), db, ownerAccess),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    expect(await db.select().from(schema.manualAdjustment)).toHaveLength(1);
    expect((await listAccounts(db, "adjustment-owner")).find((account) => account.id === "adjustment-account-a")?.balance).toBe("9000.00");
  });
});
