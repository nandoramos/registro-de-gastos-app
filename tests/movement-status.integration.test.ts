import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { changeMovementStatus, getMovementStatusHistory, listVoidedMovements } from "@/modules/movements/status";

const database = new PGlite(); const db = drizzle(database, { schema });
beforeAll(async () => { await migrate(db, { migrationsFolder: "drizzle" }); await db.insert(schema.user).values([{ id: "owner", name: "Owner", email: "owner@example.test" }, { id: "other", name: "Other", email: "other@example.test" }]); await db.insert(schema.financialAccount).values([{ id: "account", userId: "owner", name: "Origen", kind: "bank", currency: "UYU" }, { id: "account-2", userId: "owner", name: "Destino", kind: "bank", currency: "UYU" }, { id: "account-usd", userId: "owner", name: "Dólares", kind: "bank", currency: "USD" }, { id: "other-account", userId: "other", name: "Ajena", kind: "bank", currency: "UYU" }]); await db.insert(schema.expenseCategory).values([{ id: "category", userId: "owner", name: "Categoría" }, { id: "other-category", userId: "other", name: "Categoría ajena" }]); });
beforeEach(async () => { await db.delete(schema.movementStatusEvent); await db.delete(schema.expense); await db.delete(schema.ownTransfer); await db.delete(schema.currencyConversion); await db.delete(schema.sourceEvent); });
beforeEach(async () => { await db.update(schema.financialAccount).set({ openingBalance: "0.00", openingDate: "2000-01-01" }); });

afterAll(async () => database.close());

async function movement(type: "expense" | "transfer" | "conversion", id: string, userId = "owner") {
  const eventId = `event-${id}`; await db.insert(schema.sourceEvent).values({ id: eventId, userId, sourceType: "manual", originalPayload: {} });
  if (type === "expense") await db.insert(schema.expense).values({ id, userId, sourceEventId: eventId, accountId: userId === "owner" ? "account" : "other-account", categoryId: userId === "owner" ? "category" : "other-category", operationDate: "2026-10-25", title: id, amount: "1", currency: "UYU" });
  if (type === "transfer") await db.insert(schema.ownTransfer).values({ id, userId, sourceEventId: eventId, kind: "transfer", operationDate: "2026-10-25", title: id, sourceAccountId: "account", destinationAccountId: "account-2", sourceAmount: "1", destinationAmount: "1", currency: "UYU" });
  if (type === "conversion") await db.insert(schema.currencyConversion).values({ id, userId, sourceEventId: eventId, operationDate: "2026-10-25", title: id, sourceAccountId: "account-usd", destinationAccountId: "account-2", sourceAmount: "1", destinationAmount: "40", sourceCurrency: "USD", destinationCurrency: "UYU", effectiveRate: "40", institutionKind: null, institutionName: null });
}

describe("anulación de movimientos", () => {
  it.each(["expense", "transfer", "conversion"] as const)("anula y restaura %s sin borrar su evidencia", async (type) => {
    await movement(type, `${type}-1`); const voided = await changeMovementStatus(db, "owner", type, `${type}-1`, "void");
    expect(voided).toEqual({ ok: true, changed: true }); expect((await listVoidedMovements(db, "owner")).map((item) => item.id)).toContain(`${type}-1`);
    expect(await changeMovementStatus(db, "owner", type, `${type}-1`, "restore")).toEqual({ ok: true, changed: true }); expect(await listVoidedMovements(db, "owner")).toEqual([]);
    expect((await getMovementStatusHistory(db, "owner", type, `${type}-1`)).map((event) => event.action)).toEqual(["voided", "restored"]);
  });
  it("no permite anular un movimiento de otra persona", async () => { await movement("expense", "foreign", "other"); expect(await changeMovementStatus(db, "owner", "expense", "foreign", "void")).toEqual({ ok: false, error: "NOT_FOUND" }); });
});
