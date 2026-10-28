import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { listAccounts } from "@/modules/accounts/service";
import { incomeResourceResponse, incomesCollectionResponse } from "@/modules/incomes/http";
import { changeMovementStatus } from "@/modules/movements/status";

const database = new PGlite();
const db = drizzle(database, { schema });
const access = async () => ({ status: "authorized" as const, userId: "income-owner" });
const incomeInput = {
  operationDate: "2026-10-25",
  operationTime: "09:30",
  title: "Sueldo",
  note: "Ingreso de prueba",
  accountId: "income-account",
  amount: "500.25",
  currency: "UYU",
};

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
    { id: "income-owner", name: "Owner", email: "income-owner@example.test" },
    { id: "income-other", name: "Other", email: "income-other@example.test" },
  ]);
  await db.insert(schema.financialAccount).values([
    { id: "income-account", userId: "income-owner", name: "Itaú pesos", kind: "bank", currency: "UYU", openingBalance: "1000.00", openingDate: "2026-01-01" },
    { id: "income-second-account", userId: "income-owner", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: "200.00", openingDate: "2026-01-01" },
    { id: "income-usd-account", userId: "income-owner", name: "Dólares", kind: "bank", currency: "USD", openingBalance: "0.00", openingDate: "2026-01-01" },
    { id: "income-other-account", userId: "income-other", name: "Cuenta ajena", kind: "bank", currency: "UYU", openingBalance: "0.00", openingDate: "2026-01-01" },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.income);
  await db.delete(schema.movementStatusEvent);
  await db.delete(schema.sourceEvent);
});

afterAll(async () => database.close());

describe("registro manual de ingresos", () => {
  it("registra, edita, anula y restaura un ingreso actualizando el saldo", async () => {
    const balance = async () => (await listAccounts(db, "income-owner")).find((account) => account.id === "income-account")?.balance;
    const created = await incomesCollectionResponse(request("/api/incomes", "POST", incomeInput), db, access);
    expect(created.status).toBe(201);
    const saved = await created.json();
    expect(saved.title).toBe("Sueldo");
    expect(await balance()).toBe("1500.25");

    const edited = await incomeResourceResponse(request(`/api/incomes/${saved.id}`, "PATCH", { ...incomeInput, operationDate: "2026-10-24", title: "Sueldo corregido", accountId: "income-second-account", amount: "350.25" }), saved.id, db, access);
    expect(edited.status).toBe(200);
    expect((await edited.json()).title).toBe("Sueldo corregido");
    expect(await balance()).toBe("1000.00");
    expect((await listAccounts(db, "income-owner")).find((account) => account.id === "income-second-account")?.balance).toBe("550.25");

    expect((await changeMovementStatus(db, "income-owner", "income", saved.id, "void")).ok).toBe(true);
    expect((await listAccounts(db, "income-owner")).find((account) => account.id === "income-second-account")?.balance).toBe("200.00");
    expect((await incomeResourceResponse(request(`/api/incomes/${saved.id}`, "PATCH", incomeInput), saved.id, db, access)).status).toBe(422);
    expect((await changeMovementStatus(db, "income-owner", "income", saved.id, "restore")).ok).toBe(true);
    expect((await listAccounts(db, "income-owner")).find((account) => account.id === "income-second-account")?.balance).toBe("550.25");
  });

  it.each([
    [{ ...incomeInput, operationDate: "2026-02-30" }, "INVALID_DATE"],
    [{ ...incomeInput, amount: "0" }, "INVALID_AMOUNT"],
    [{ ...incomeInput, amount: "1.234" }, "INVALID_AMOUNT"],
    [{ ...incomeInput, accountId: "missing-account" }, "ACCOUNT_NOT_FOUND"],
    [{ ...incomeInput, accountId: "income-usd-account", currency: "UYU" }, "CURRENCY_MISMATCH"],
  ])("rechaza ingresos inválidos sin persistir evidencia: %j", async (input, error) => {
    const response = await incomesCollectionResponse(request("/api/incomes", "POST", input), db, access);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error });
    expect(await db.select().from(schema.income)).toHaveLength(0);
    expect(await db.select().from(schema.sourceEvent)).toHaveLength(0);
  });

  it("no expone un ingreso de otra persona", async () => {
    const foreign = await incomesCollectionResponse(request("/api/incomes", "POST", { ...incomeInput, accountId: "income-other-account" }), db, async () => ({ status: "authorized" as const, userId: "income-other" }));
    expect(foreign.status).toBe(201);
    const { id } = await foreign.json();
    expect(await incomeResourceResponse(request("/api/incomes/" + id), id, db, access).then((response) => response.status)).toBe(404);
  });
});
