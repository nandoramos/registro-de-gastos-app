import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { listAccounts } from "@/modules/accounts/service";
import { changeMovementStatus } from "@/modules/movements/status";
import { listMovementHistory } from "@/modules/movements/history";
import { pendingEntryResourceResponse } from "@/modules/pending-entries/http";
import {
  transferResourceResponse,
  transfersCollectionResponse,
} from "@/modules/transfers/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({
  status: "authorized" as const,
  userId: "transfer-owner",
});

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const completeTransfer = {
  kind: "transfer",
  operationDate: "2026-10-23",
  title: "Traslado sintético",
  note: "Entre cuentas propias",
  sourceAccountId: "owner-bank-a",
  destinationAccountId: "owner-bank-b",
  sourceAmount: "1500,25",
  destinationAmount: "1500.25",
  currency: "UYU",
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    {
      id: "transfer-owner",
      name: "Synthetic transfer owner",
      email: "transfer-owner@example.test",
      emailVerified: true,
    },
    {
      id: "transfer-other",
      name: "Synthetic other owner",
      email: "transfer-other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.ownTransfer);
  await db.delete(schema.pendingEntry);
  await db.delete(schema.sourceEvent);
  await db.delete(schema.financialAccount);
  await db.insert(schema.financialAccount).values([
    {
      id: "owner-bank-a",
      userId: "transfer-owner",
      name: "Banco origen",
      kind: "bank",
      currency: "UYU",
    },
    {
      id: "owner-bank-b",
      userId: "transfer-owner",
      name: "Banco destino",
      kind: "bank",
      currency: "UYU",
    },
    {
      id: "owner-cash",
      userId: "transfer-owner",
      name: "Efectivo pesos",
      kind: "cash",
      currency: "UYU",
    },
    {
      id: "other-bank",
      userId: "transfer-other",
      name: "Cuenta ajena",
      kind: "bank",
      currency: "UYU",
    },
  ]);
});

beforeEach(async () => { await db.update(schema.financialAccount).set({ openingBalance: "0.00", openingDate: "2000-01-01" }); });

afterAll(async () => database.close());

describe("transferencias propias y retiros", () => {
  it("edita, anula y restaura una transferencia actualizando ambos saldos", async () => {
    const balance = async (id: string) =>
      (await listAccounts(db, "transfer-owner")).find((account) => account.id === id)?.balance;
    const created = await transfersCollectionResponse(
      request("/api/transfers", "POST", completeTransfer),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(201);
    const original = await created.json();
    expect(await balance("owner-bank-a")).toBe("-1500.25");
    expect(await balance("owner-bank-b")).toBe("1500.25");

    const edited = await transferResourceResponse(
      request("/api/transfers/" + original.id, "PATCH", {
        ...completeTransfer,
        title: "Transferencia corregida",
        sourceAccountId: "owner-bank-b",
        destinationAccountId: "owner-bank-a",
        sourceAmount: "2200.00",
        destinationAmount: "2200.00",
      }),
      original.id,
      db,
      ownerAccess,
    );
    expect(edited.status).toBe(200);
    expect((await edited.json()).title).toBe("Transferencia corregida");
    expect(await balance("owner-bank-a")).toBe("2200.00");
    expect(await balance("owner-bank-b")).toBe("-2200.00");
    expect((await db.select().from(schema.sourceEvent))[0].originalPayload).toEqual(completeTransfer);

    await changeMovementStatus(db, "transfer-owner", "transfer", original.id, "void");
    expect(await balance("owner-bank-a")).toBe("0.00");
    expect(await balance("owner-bank-b")).toBe("0.00");
    const editVoided = await transferResourceResponse(
      request("/api/transfers/" + original.id, "PATCH", completeTransfer),
      original.id,
      db,
      ownerAccess,
    );
    expect(editVoided.status).toBe(422);
    await changeMovementStatus(db, "transfer-owner", "transfer", original.id, "restore");
    expect(await balance("owner-bank-a")).toBe("2200.00");
    expect(await balance("owner-bank-b")).toBe("-2200.00");
  });

  it("registra ambos lados como una operación con evidencia y sin gasto", async () => {
    const response = await transfersCollectionResponse(
      request("/api/transfers", "POST", completeTransfer),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        kind: "transfer",
        operationDate: "2026-10-23",
        title: "Traslado sintético",
        note: "Entre cuentas propias",
        source: {
          account: expect.objectContaining({ id: "owner-bank-a" }),
          amount: "1500.25",
          currency: "UYU",
        },
        destination: {
          account: expect.objectContaining({ id: "owner-bank-b" }),
          amount: "1500.25",
          currency: "UYU",
        },
        evidence: expect.objectContaining({ original: completeTransfer }),
      }),
    );
    expect(await db.select().from(schema.ownTransfer)).toHaveLength(1);
    expect(await db.select().from(schema.expense)).toHaveLength(0);
  });

  it("conserva un lado faltante como pendiente y permite completarlo", async () => {
    const incomplete = { ...completeTransfer, destinationAmount: "" };
    const created = await transfersCollectionResponse(
      request("/api/transfers", "POST", incomplete),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(202);
    const pending = await created.json();
    expect(pending.issues).toContain("INVALID_DESTINATION_AMOUNT");
    expect(await db.select().from(schema.ownTransfer)).toHaveLength(0);

    const completed = await pendingEntryResourceResponse(
      request(`/api/pending-entries/${pending.id}`, "PATCH", completeTransfer),
      pending.id,
      db,
      ownerAccess,
    );
    expect(completed.status).toBe(201);
    const body = await completed.json();
    expect(body.status).toBe("registered");
    expect(body.transfer).toEqual(
      expect.objectContaining({
        kind: "transfer",
        title: "Traslado sintético",
        evidence: expect.objectContaining({ original: incomplete }),
      }),
    );
    expect(await db.select().from(schema.pendingEntry)).toHaveLength(0);
  });

  it("registra un retiro de banco a efectivo sin crear gasto", async () => {
    const response = await transfersCollectionResponse(
      request("/api/transfers", "POST", {
        ...completeTransfer,
        kind: "withdrawal",
        title: "Retiro sintético",
        destinationAccountId: "owner-cash",
      }),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(201);
    expect((await response.json()).kind).toBe("withdrawal");
    expect(await db.select().from(schema.expense)).toHaveLength(0);
    const transfer = await transfersCollectionResponse(
      request("/api/transfers", "POST", completeTransfer), db, ownerAccess,
    );
    const withdrawalRows = await listMovementHistory(db, "transfer-owner", { month: "2026-10", type: "withdrawal" });
    const transferRows = await listMovementHistory(db, "transfer-owner", { month: "2026-10", type: "transfer" });
    expect(withdrawalRows.map((row) => row.type)).toEqual(["withdrawal"]);
    expect(transfer.status).toBe(201);
    expect(transferRows.map((row) => row.type)).toEqual(["transfer"]);
  });

  it("mantiene pendiente una diferencia de importes en la misma moneda", async () => {
    const response = await transfersCollectionResponse(
      request("/api/transfers", "POST", {
        ...completeTransfer,
        destinationAmount: "1490.25",
      }),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(202);
    expect((await response.json()).issues).toContain("AMOUNTS_MISMATCH");
    expect(await db.select().from(schema.ownTransfer)).toHaveLength(0);
  });

  it("mantiene el tipo de pendiente aunque falte la clase de transferencia", async () => {
    const withoutKind: Record<string, unknown> = { ...completeTransfer };
    delete withoutKind.kind;
    const created = await transfersCollectionResponse(
      request("/api/transfers", "POST", withoutKind),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(202);
    const pending = await created.json();
    expect(pending.interpretation.entryType).toBe("own-transfer");

    const completed = await pendingEntryResourceResponse(
      request(`/api/pending-entries/${pending.id}`, "PATCH", completeTransfer),
      pending.id,
      db,
      ownerAccess,
    );
    expect(completed.status).toBe(201);
    expect((await completed.json()).transfer.kind).toBe("transfer");
  });

  it("no registra como transferencia común un retiro hacia efectivo", async () => {
    const response = await transfersCollectionResponse(
      request("/api/transfers", "POST", {
        ...completeTransfer,
        destinationAccountId: "owner-cash",
      }),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(202);
    expect((await response.json()).issues).toContain("TRANSFER_KIND_MISMATCH");
  });

  it("mantiene pendiente una cuenta ajena y no permite consultar otra operación", async () => {
    const foreignReference = await transfersCollectionResponse(
      request("/api/transfers", "POST", {
        ...completeTransfer,
        destinationAccountId: "other-bank",
      }),
      db,
      ownerAccess,
    );
    expect(foreignReference.status).toBe(202);
    expect((await foreignReference.json()).issues).toContain(
      "DESTINATION_ACCOUNT_NOT_FOUND",
    );

    const created = await transfersCollectionResponse(
      request("/api/transfers", "POST", completeTransfer),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "transfer-other",
    });
    const hidden = await transferResourceResponse(
      request(`/api/transfers/${id}`),
      id,
      db,
      otherAccess,
    );
    expect(hidden.status).toBe(404);
    const hiddenUpdate = await transferResourceResponse(
      request(`/api/transfers/${id}`, "PATCH", completeTransfer),
      id,
      db,
      otherAccess,
    );
    expect(hiddenUpdate.status).toBe(404);
  });
});
