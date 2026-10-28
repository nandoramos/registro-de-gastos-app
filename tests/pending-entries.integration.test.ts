import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import {
  pendingEntryResourceResponse,
  pendingEntriesCollectionResponse,
} from "@/modules/pending-entries/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({
  status: "authorized" as const,
  userId: "pending-owner",
});

function request(path: string, method = "GET", body?: unknown) {
  return new Request("http://localhost:3000" + path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    {
      id: "pending-owner",
      name: "Synthetic pending owner",
      email: "pending-owner@example.test",
      emailVerified: true,
    },
    {
      id: "pending-other",
      name: "Synthetic other",
      email: "pending-other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.expense);
  await db.delete(schema.sourceEvent);
  await db.delete(schema.expenseCategory);
  await db.delete(schema.financialAccount);
  await db.insert(schema.financialAccount).values({
    id: "pending-account",
    userId: "pending-owner",
    name: "Cuenta pesos",
    kind: "bank",
    currency: "UYU",
  });
  await db.insert(schema.expenseCategory).values({
    id: "pending-category",
    userId: "pending-owner",
    name: "Alimentación",
    systemKey: "food",
  });
});

beforeEach(async () => { await db.update(schema.financialAccount).set({ openingBalance: "0.00", openingDate: "2000-01-01" }); });

afterAll(async () => {
  await database.close();
});

describe("entradas pendientes", () => {
  it("conserva una entrada incompleta sin crear un gasto y explica lo faltante", async () => {
    const original = {
      title: "Compra pendiente sintética",
      amount: "20,50",
      currency: "UYU",
    };
    const response = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", original),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toEqual({
      id: expect.any(String),
      status: "pending",
      sourceType: "manual",
      receivedAt: expect.any(String),
      reviewedAt: null,
      interpretation: original,
      issues: expect.arrayContaining([
        "INVALID_DATE",
        "INVALID_ACCOUNT",
        "INVALID_CATEGORY",
      ]),
      original,
    });
    expect(await db.select().from(schema.sourceEvent)).toHaveLength(1);
    expect(await db.select().from(schema.expense)).toHaveLength(0);
  });

  it("lista y cuenta pendientes de todos los meses", async () => {
    for (const input of [
      { title: "Sin fecha uno" },
      { title: "Sin fecha dos", operationDate: "2025-01-03" },
    ]) {
      await pendingEntriesCollectionResponse(
        request("/api/pending-entries", "POST", input),
        db,
        ownerAccess,
      );
    }
    const response = await pendingEntriesCollectionResponse(
      request("/api/pending-entries?month=2026-10"),
      db,
      ownerAccess,
    );
    expect(await response.json()).toEqual({
      count: 2,
      entries: expect.arrayContaining([
        expect.objectContaining({ issues: expect.any(Array) }),
        expect.objectContaining({ issues: expect.any(Array) }),
      ]),
    });
  });

  it("mantiene pendiente una corrección incompleta y registra la intervención", async () => {
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", { title: "Compra pendiente" }),
      db,
      ownerAccess,
    );
    const { id } = await created.json();

    const response = await pendingEntryResourceResponse(
      request("/api/pending-entries/" + id, "PATCH", {
        title: "Compra corregida",
        operationDate: "2026-10-20",
      }),
      id,
      db,
      ownerAccess,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        status: "pending",
        reviewedAt: expect.any(String),
        interpretation: expect.objectContaining({
          title: "Compra corregida",
          operationDate: "2026-10-20",
        }),
        issues: expect.arrayContaining(["INVALID_AMOUNT", "INVALID_ACCOUNT"]),
      }),
    );
    expect(await db.select().from(schema.expense)).toHaveLength(0);
  });

  it("completa y registra en una acción sin modificar la evidencia original", async () => {
    const original = { title: "Título original sin datos" };
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", original),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    await pendingEntryResourceResponse(
      request("/api/pending-entries/" + id, "PATCH", {
        title: "Primera corrección todavía incompleta",
      }),
      id,
      db,
      ownerAccess,
    );
    const complete = {
      operationDate: "2026-10-20",
      operationTime: "",
      title: "Título corregido",
      note: "Intervención manual sintética",
      accountId: "pending-account",
      categoryId: "pending-category",
      amount: "30,25",
      currency: "UYU",
    };

    const response = await pendingEntryResourceResponse(
      request("/api/pending-entries/" + id, "PATCH", complete),
      id,
      db,
      ownerAccess,
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        status: "registered",
        reviewedAt: expect.any(String),
        expense: expect.objectContaining({
          title: "Título corregido",
          amount: "30.25",
          source: expect.objectContaining({ original }),
        }),
      }),
    );

    const [event] = await db.select().from(schema.sourceEvent);
    expect(event.originalPayload).toEqual(original);
    const reviews = await db.select().from(schema.sourceEventReview);
    expect(reviews).toHaveLength(2);
    expect(reviews.map((review) => review.outcome)).toEqual([
      "pending",
      "registered",
    ]);
    expect(reviews[1].interpretation).toEqual(complete);
    expect(await db.select().from(schema.pendingEntry)).toHaveLength(0);
    expect(await db.select().from(schema.expense)).toHaveLength(1);

    const listed = await pendingEntriesCollectionResponse(
      request("/api/pending-entries"),
      db,
      ownerAccess,
    );
    expect(await listed.json()).toEqual({ count: 0, entries: [] });
  });

  it("no revela ni modifica pendientes de otro usuario", async () => {
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", { title: "Pendiente privada" }),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "pending-other",
    });

    const detail = await pendingEntryResourceResponse(
      request("/api/pending-entries/" + id + "?user_id=pending-owner"),
      id,
      db,
      otherAccess,
    );
    expect(detail.status).toBe(404);
  });

  it("separa JSON inválido y autorización de una entrada pendiente", async () => {
    const malformed = new Request("http://localhost/api/pending-entries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    const invalid = await pendingEntriesCollectionResponse(
      malformed,
      db,
      ownerAccess,
    );
    expect(invalid.status).toBe(422);
    expect(await db.select().from(schema.sourceEvent)).toHaveLength(0);

    const anonymous = async () => ({ status: "unauthenticated" as const });
    const denied = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", { title: "No autorizada" }),
      db,
      anonymous,
    );
    expect(denied.status).toBe(401);
    expect(await db.select().from(schema.sourceEvent)).toHaveLength(0);
  });
});
