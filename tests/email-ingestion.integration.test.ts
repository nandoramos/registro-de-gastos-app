import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { ingestEmailCandidate } from "@/modules/email-import/workflow";
import { emailEntriesCollectionResponse } from "@/modules/email-import/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const text = `ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Hora: 14:35
Comercio: Mercado Ejemplo
Importe debitado: UYU 1.234,56`;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    {
      id: "email-owner",
      name: "Owner",
      email: "owner@example.test",
      emailVerified: true,
    },
    {
      id: "email-other",
      name: "Other",
      email: "other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.expense);
  await db.delete(schema.pendingEntry);
  await db.delete(schema.sourceEvent);
  await db.delete(schema.expenseCategory);
  await db.delete(schema.financialAccount);
  await db.insert(schema.financialAccount).values([
    {
      id: "owner-uyu",
      userId: "email-owner",
      name: "Pesos",
      kind: "bank",
      currency: "UYU",
    },
    {
      id: "other-uyu",
      userId: "email-other",
      name: "Ajena",
      kind: "bank",
      currency: "UYU",
    },
  ]);
  await db.insert(schema.expenseCategory).values({
    id: "owner-food",
    userId: "email-owner",
    name: "Alimentación",
    systemKey: "food",
  });
});

afterAll(async () => database.close());

describe("ingesta de texto de email", () => {
  it("rechaza la ingesta sin sesión autorizada", async () => {
    const response = await emailEntriesCollectionResponse(
      new Request("http://localhost/api/email-entries", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
      db,
      async () => ({ status: "unauthenticated" as const }),
    );
    expect(response.status).toBe(401);
    expect(await db.select().from(schema.sourceEvent)).toHaveLength(0);
  });

  it("registra una compra completa conservando texto y procedencia", async () => {
    const result = await ingestEmailCandidate(db, "email-owner", {
      text,
      accountId: "owner-uyu",
      categoryId: "owner-food",
      nature: "expense",
    });
    expect(result.kind).toBe("registered");
    if (result.kind !== "registered") throw new Error("Expected expense");
    expect(result.expense).toEqual(
      expect.objectContaining({
        operationDate: "2026-10-24",
        operationTime: "14:35:00",
        title: "Mercado Ejemplo",
        amount: "1234.56",
        currency: "UYU",
        source: expect.objectContaining({ type: "email", original: { text } }),
      }),
    );
  });

  it("conserva como pendiente una compra incompleta o con referencia ajena", async () => {
    const missing = await ingestEmailCandidate(db, "email-owner", {
      text,
      accountId: "owner-uyu",
      nature: "expense",
    });
    expect(missing.kind).toBe("pending");
    if (missing.kind !== "pending") throw new Error("Expected pending");
    expect(missing.entry.issues).toContain("INVALID_CATEGORY");
    expect(missing.entry.sourceType).toBe("email");
    expect(missing.entry.original).toEqual({ text });

    const foreign = await ingestEmailCandidate(db, "email-owner", {
      text,
      accountId: "other-uyu",
      categoryId: "owner-food",
      nature: "expense",
    });
    expect(foreign.kind).toBe("pending");
    if (foreign.kind !== "pending") throw new Error("Expected pending");
    expect(foreign.entry.issues).toContain("ACCOUNT_NOT_FOUND");
    expect(await db.select().from(schema.expense)).toHaveLength(0);
  });

  it("deja una transferencia propia con el lado disponible para completar", async () => {
    const transferText = `ITAÚ
TRANSFERENCIA
Fecha: 23/10/2026
Destinatario: Cuenta propia sintética
Importe debitado: UYU 250,00`;
    const result = await ingestEmailCandidate(db, "email-owner", {
      text: transferText,
      accountId: "owner-uyu",
      nature: "own-transfer",
    });
    expect(result.kind).toBe("pending");
    if (result.kind !== "pending") throw new Error("Expected pending");
    expect(result.entry.interpretation).toEqual(
      expect.objectContaining({
        entryType: "own-transfer",
        sourceAccountId: "owner-uyu",
        sourceAmount: "250.00",
        currency: "UYU",
      }),
    );
    expect(result.entry.issues).toContain("INVALID_DESTINATION_ACCOUNT");
  });
});
