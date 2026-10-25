import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { monthlySummary } from "@/modules/summary/service";
import { listMovementHistory } from "@/modules/movements/history";

const database = new PGlite(); const db = drizzle(database, { schema });
beforeAll(async () => { await migrate(db, { migrationsFolder: "drizzle" }); await db.insert(schema.user).values({ id: "summary-owner", name: "Owner", email: "summary@example.test" }); await db.insert(schema.financialAccount).values({ id: "summary-account", userId: "summary-owner", name: "Cuenta", kind: "bank", currency: "UYU" }); await db.insert(schema.expenseCategory).values([{ id: "food", userId: "summary-owner", name: "Alimentación" }, { id: "house", userId: "summary-owner", name: "Casa Nueva", systemKey: "house_construction" }]); });
beforeEach(async () => { await db.delete(schema.expense); await db.delete(schema.sourceEvent); }); afterAll(async () => database.close());
async function expense(id: string, amount: string, categoryId = "food", date = "2026-10-10", currency: "UYU" | "USD" = "UYU") { const event = `event-${id}`; await db.insert(schema.sourceEvent).values({ id: event, userId: "summary-owner", sourceType: "manual", originalPayload: {} }); await db.insert(schema.expense).values({ id, userId: "summary-owner", sourceEventId: event, accountId: "summary-account", categoryId, operationDate: date, title: id, amount, currency }); }
it("separa monedas, excluye Casa Nueva y anulados, y puede incluir Casa Nueva", async () => { await expense("one", "10.10"); await expense("two", "2.25"); await expense("house", "99.00", "house"); await expense("other-month", "30.00", "food", "2026-09-30"); const hidden = await monthlySummary(db, "summary-owner", "2026-10"); expect(hidden.totals).toEqual([{ currency: "UYU", amount: "12.35" }]); expect(hidden.categories).toEqual([{ currency: "UYU", category: "Alimentación", amount: "12.35" }]); expect((await monthlySummary(db, "summary-owner", "2026-10", true)).totals).toEqual([{ currency: "UYU", amount: "111.35" }]); });
it("filtra el historial por mes y conserva Casa Nueva solo al incluirla", async () => { await expense("regular", "1.00"); await expense("house", "2.00", "house"); await expense("old", "3.00", "food", "2026-09-30"); expect((await listMovementHistory(db, "summary-owner", { month: "2026-10" })).map((item) => item.id)).toEqual(["regular"]); expect((await listMovementHistory(db, "summary-owner", { month: "2026-10", includeHouse: true })).map((item) => item.id).sort()).toEqual(["house", "regular"]); });
