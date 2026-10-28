import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { configureOpeningBalance, listAccounts } from "@/modules/accounts/service";
import { accountResourceResponse, accountsCollectionResponse } from "@/modules/accounts/http";
import { validateExpenseReferences } from "@/modules/expenses/service";
import { validateTransferReferences } from "@/modules/transfers/service";
import { changeMovementStatus } from "@/modules/movements/status";
import { movementStatusResponse } from "@/modules/movements/http";

const database = new PGlite();
const db = drizzle(database, { schema });
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([{ id: "owner", name: "Owner", email: "owner@example.test", emailVerified: true }, { id: "other", name: "Other", email: "other@example.test", emailVerified: true }]);
  await db.insert(schema.financialAccount).values({ id: "account", userId: "owner", name: "Billetera", kind: "cash", currency: "UYU" });
});
afterAll(async () => database.close());

it("configura el saldo inicial una vez y solo para el usuario propietario", async () => {
  expect(await configureOpeningBalance(db, "other", "account", { amount: "100.00", date: "2026-10-28" })).toBeUndefined();
  expect(await configureOpeningBalance(db, "owner", "account", { amount: "100.00", date: "2026-10-28" })).toMatchObject({ openingBalance: "100.00", openingDate: "2026-10-28" });
  expect(await configureOpeningBalance(db, "owner", "account", { amount: "200.00", date: "2026-10-28" })).toBeUndefined();
  expect(await listAccounts(db, "owner")).toEqual([expect.objectContaining({ openingBalance: "100.00", openingDate: "2026-10-28", balance: "100.00" })]);
});

it("permite configurar una cuenta existente mediante una solicitud autorizada", async () => {
  await db.insert(schema.financialAccount).values({ id: "second", userId: "owner", name: "Cuenta", kind: "bank", currency: "USD" });
  const request = new Request("http://localhost/api/accounts/second/opening-balance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount: "300,50", date: "2026-10-28" }) });
  const response = await accountResourceResponse(request, "second", db, async () => ({ status: "authorized" as const, userId: "owner" }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ openingBalance: "300.50", openingDate: "2026-10-28" });
});

it("crea una cuenta con su saldo inicial sin aceptar cuentas sin saldo", async () => {
  const access = async () => ({ status: "authorized" as const, userId: "owner" });
  const create = (body: object) => accountsCollectionResponse(new Request("http://localhost/api/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), db, access);
  const base = { name: "Nueva", kind: "bank", currency: "UYU" };
  expect((await create(base)).status).toBe(422);
  const response = await create({ ...base, openingBalance: "20,50", openingDate: "2026-10-28" });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ openingBalance: "20.50", openingDate: "2026-10-28" });
});

it("impide nuevos gastos y transferencias con cuentas sin saldo inicial", async () => {
  await db.insert(schema.financialAccount).values({ id: "unconfigured", userId: "owner", name: "Sin configurar", kind: "bank", currency: "UYU" });
  const expense = { operationDate: "2026-10-28", operationTime: null, title: "Compra", note: null, categoryId: "missing", accountId: "unconfigured", amount: "10.00", currency: "UYU" as const };
  expect(await validateExpenseReferences(db, "owner", expense)).toEqual({ ok: false, error: "ACCOUNT_NOT_FOUND" });
  const transfer = { operationDate: "2026-10-28", title: "Transferencia", note: null, kind: "transfer" as const, sourceAccountId: "unconfigured", destinationAccountId: "account", sourceAmount: "10.00", destinationAmount: "10.00", currency: "UYU" as const };
  expect(await validateTransferReferences(db, "owner", transfer)).toEqual({ ok: false, error: "SOURCE_ACCOUNT_NOT_FOUND" });
});

it("permite archivar y recuperar una cuenta del propietario", async () => {
  const access = async () => ({ status: "authorized" as const, userId: "owner" });
  const invoke = (action: string) => accountResourceResponse(new Request(`http://localhost/api/accounts/account/${action}`, { method: "POST" }), "account", db, access);
  expect((await invoke("archive")).status).toBe(200);
  expect((await invoke("unarchive")).status).toBe(200);
  expect((await listAccounts(db, "owner")).some((account) => account.id === "account")).toBe(true);
});

it("descuenta gastos vigentes desde la fecha inicial y excluye anulados", async () => {
  await db.insert(schema.expenseCategory).values({ id: "category", userId: "owner", name: "Ejemplo" });
  await db.insert(schema.sourceEvent).values([{ id: "event1", userId: "owner", sourceType: "manual", originalPayload: {} }, { id: "event2", userId: "owner", sourceType: "manual", originalPayload: {} }, { id: "event3", userId: "owner", sourceType: "manual", originalPayload: {} }]);
  await db.insert(schema.expense).values([
    { id: "expense1", userId: "owner", sourceEventId: "event1", accountId: "account", categoryId: "category", operationDate: "2026-10-28", title: "Ejemplo", amount: "12.35", currency: "UYU" },
    { id: "expense2", userId: "owner", sourceEventId: "event2", accountId: "account", categoryId: "category", operationDate: "2026-10-28", title: "Anulado", amount: "8.00", currency: "UYU", voidedAt: new Date() },
    { id: "expense3", userId: "owner", sourceEventId: "event3", accountId: "account", categoryId: "category", operationDate: "9999-01-01", title: "Futuro", amount: "8.00", currency: "UYU" },
  ]);
  expect((await listAccounts(db, "owner")).find((account) => account.id === "account")?.balance).toBe("87.65");
});

it("aplica ambos lados de una transferencia y deja de aplicarlos al anularla", async () => {
  await db.insert(schema.financialAccount).values({ id: "destination", userId: "owner", name: "Destino", kind: "bank", currency: "UYU", openingBalance: "20.00", openingDate: "2026-10-28" });
  await db.insert(schema.sourceEvent).values({ id: "transfer-event", userId: "owner", sourceType: "manual", originalPayload: {} });
  await db.insert(schema.ownTransfer).values({ id: "transfer", userId: "owner", sourceEventId: "transfer-event", kind: "transfer", operationDate: "2026-10-28", title: "Transferencia", sourceAccountId: "account", destinationAccountId: "destination", sourceAmount: "10.00", destinationAmount: "10.00", currency: "UYU" });
  let accounts = await listAccounts(db, "owner");
  expect(accounts.find((account) => account.id === "account")?.balance).toBe("77.65");
  expect(accounts.find((account) => account.id === "destination")?.balance).toBe("30.00");
  const { eq } = await import("drizzle-orm");
  await db.update(schema.ownTransfer).set({ voidedAt: new Date() }).where(eq(schema.ownTransfer.id, "transfer"));
  accounts = await listAccounts(db, "owner");
  expect(accounts.find((account) => account.id === "account")?.balance).toBe("87.65");
  expect(accounts.find((account) => account.id === "destination")?.balance).toBe("20.00");
});

it("refleja los dos importes reales de una conversión en sus cuentas", async () => {
  await db.insert(schema.financialAccount).values({ id: "dollars", userId: "owner", name: "Dólares", kind: "bank", currency: "USD", openingBalance: "100.00", openingDate: "2026-10-28" });
  await db.insert(schema.sourceEvent).values({ id: "conversion-event", userId: "owner", sourceType: "manual", originalPayload: {} });
  await db.insert(schema.currencyConversion).values({ id: "conversion", userId: "owner", sourceEventId: "conversion-event", operationDate: "2026-10-28", title: "Cambio", sourceAccountId: "dollars", destinationAccountId: "destination", sourceAmount: "10.00", destinationAmount: "405.00", sourceCurrency: "USD", destinationCurrency: "UYU", effectiveRate: "40.500000000000" });
  const accounts = await listAccounts(db, "owner");
  expect(accounts.find((account) => account.id === "dollars")?.balance).toBe("90.00");
  expect(accounts.find((account) => account.id === "destination")?.balance).toBe("425.00");
});

it("no restaura un movimiento anterior al saldo inicial de la cuenta", async () => {
  const { eq } = await import("drizzle-orm");
  await db.update(schema.expense).set({ operationDate: "2026-10-27" }).where(eq(schema.expense.id, "expense2"));
  const result = await changeMovementStatus(db, "owner", "expense", "expense2", "restore");
  expect(result).toEqual({ ok: false, error: "ACCOUNT_NOT_CONFIGURED" });
  const response = await movementStatusResponse(new Request("http://localhost/api/movements/expense/expense2/restore", { method: "POST" }), "expense", "expense2", "restore", db, async () => ({ status: "authorized" as const, userId: "owner" }));
  expect(response.status).toBe(422);
});

it("no restaura un movimiento con fecha futura", async () => {
  const { eq } = await import("drizzle-orm");
  await db.update(schema.expense).set({ voidedAt: new Date() }).where(eq(schema.expense.id, "expense3"));
  expect(await changeMovementStatus(db, "owner", "expense", "expense3", "restore")).toEqual({ ok: false, error: "INVALID_DATE" });
});
