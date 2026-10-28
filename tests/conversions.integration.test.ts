import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { pendingEntryResourceResponse } from "@/modules/pending-entries/http";
import {
  conversionResourceResponse,
  conversionsCollectionResponse,
} from "@/modules/conversions/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({
  status: "authorized" as const,
  userId: "conversion-owner",
});

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const completeConversion = {
  operationDate: "2026-10-24",
  title: "Compra de pesos sintética",
  note: "Conversión ficticia",
  sourceAccountId: "owner-usd",
  destinationAccountId: "owner-uyu",
  sourceAmount: "10.00",
  destinationAmount: "402.50",
  sourceCurrency: "USD",
  destinationCurrency: "UYU",
  destinationConfirmed: true,
  quote: "40.25",
  institution: "itau",
  otherInstitutionName: "",
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    {
      id: "conversion-owner",
      name: "Synthetic conversion owner",
      email: "conversion-owner@example.test",
      emailVerified: true,
    },
    {
      id: "conversion-other",
      name: "Synthetic other",
      email: "conversion-other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.currencyConversion);
  await db.delete(schema.pendingEntry);
  await db.delete(schema.sourceEvent);
  await db.delete(schema.financialAccount);
  await db.insert(schema.financialAccount).values([
    {
      id: "owner-usd",
      userId: "conversion-owner",
      name: "Dólares",
      kind: "bank",
      currency: "USD",
    },
    {
      id: "owner-uyu",
      userId: "conversion-owner",
      name: "Pesos",
      kind: "bank",
      currency: "UYU",
    },
    {
      id: "other-uyu",
      userId: "conversion-other",
      name: "Pesos ajenos",
      kind: "bank",
      currency: "UYU",
    },
  ]);
});

beforeEach(async () => { await db.update(schema.financialAccount).set({ openingBalance: "0.00", openingDate: "2000-01-01" }); });

afterAll(async () => database.close());

describe("conversiones USD y UYU", () => {
  it("registra importes confirmados, cambio efectivo e institución", async () => {
    const response = await conversionsCollectionResponse(
      request("/api/conversions", "POST", completeConversion),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        title: "Compra de pesos sintética",
        source: expect.objectContaining({ amount: "10.00", currency: "USD" }),
        destination: expect.objectContaining({
          amount: "402.50",
          currency: "UYU",
        }),
        effectiveRate: "40.250000000000",
        effectiveRateDisplay: "1 USD = 40,25 UYU",
        institution: { kind: "itau", name: "Itaú" },
        evidence: expect.objectContaining({ original: completeConversion }),
      }),
    );
    expect(await db.select().from(schema.expense)).toHaveLength(0);
    expect(await db.select().from(schema.ownTransfer)).toHaveLength(0);
  });

  it("mantiene pendiente el destino sin confirmar y permite completarlo", async () => {
    const incomplete = { ...completeConversion, destinationConfirmed: false };
    const created = await conversionsCollectionResponse(
      request("/api/conversions", "POST", incomplete),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(202);
    const pending = await created.json();
    expect(pending.issues).toContain("DESTINATION_NOT_CONFIRMED");

    const completed = await pendingEntryResourceResponse(
      request(
        `/api/pending-entries/${pending.id}`,
        "PATCH",
        completeConversion,
      ),
      pending.id,
      db,
      ownerAccess,
    );
    expect(completed.status).toBe(201);
    const body = await completed.json();
    expect(body.conversion.evidence.original).toEqual(incomplete);
    expect(body.conversion.effectiveRateDisplay).toBe("1 USD = 40,25 UYU");
  });

  it("mantiene pendiente una conversión cuando falta uno de sus lados", async () => {
    const withoutDestination: Record<string, unknown> = {
      ...completeConversion,
    };
    delete withoutDestination.destinationAmount;
    const response = await conversionsCollectionResponse(
      request("/api/conversions", "POST", withoutDestination),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(202);
    expect((await response.json()).issues).toContain(
      "INVALID_DESTINATION_AMOUNT",
    );
    expect(await db.select().from(schema.currencyConversion)).toHaveLength(0);
    expect(await db.select().from(schema.expense)).toHaveLength(0);
  });

  it("admite institución ausente y exige nombre para Otra", async () => {
    const absent = await conversionsCollectionResponse(
      request("/api/conversions", "POST", {
        ...completeConversion,
        institution: null,
        quote: "",
      }),
      db,
      ownerAccess,
    );
    expect(absent.status).toBe(201);
    expect((await absent.json()).institution).toBeNull();

    const unnamed = await conversionsCollectionResponse(
      request("/api/conversions", "POST", {
        ...completeConversion,
        institution: "other",
        otherInstitutionName: "",
      }),
      db,
      ownerAccess,
    );
    expect(unnamed.status).toBe(202);
    expect((await unnamed.json()).issues).toContain("INVALID_INSTITUTION_NAME");

    const named = await conversionsCollectionResponse(
      request("/api/conversions", "POST", {
        ...completeConversion,
        institution: "other",
        otherInstitutionName: "Cambio ficticio",
      }),
      db,
      ownerAccess,
    );
    expect(named.status).toBe(201);
    expect((await named.json()).institution).toEqual({
      kind: "other",
      name: "Cambio ficticio",
    });
  });

  it("aísla las cuentas y el detalle por usuario", async () => {
    const foreign = await conversionsCollectionResponse(
      request("/api/conversions", "POST", {
        ...completeConversion,
        destinationAccountId: "other-uyu",
      }),
      db,
      ownerAccess,
    );
    expect(foreign.status).toBe(202);
    expect((await foreign.json()).issues).toContain(
      "DESTINATION_ACCOUNT_NOT_FOUND",
    );

    const created = await conversionsCollectionResponse(
      request("/api/conversions", "POST", completeConversion),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "conversion-other",
    });
    const hidden = await conversionResourceResponse(
      request(`/api/conversions/${id}`),
      id,
      db,
      otherAccess,
    );
    expect(hidden.status).toBe(404);
  });

  it("exige una sesión autorizada para registrar", async () => {
    const denied = await conversionsCollectionResponse(
      request("/api/conversions", "POST", completeConversion),
      db,
      async () => ({ status: "unauthenticated" as const }),
    );
    expect(denied.status).toBe(401);
    expect(await db.select().from(schema.currencyConversion)).toHaveLength(0);
  });
});
