import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { accountResourceResponse } from "@/modules/accounts/http";
import {
  expenseResourceResponse,
  expensesCollectionResponse,
} from "@/modules/expenses/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({
  status: "authorized" as const,
  userId: "expense-owner",
});

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost:3000${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const completeExpense = {
  operationDate: "2026-10-18",
  operationTime: "14:35",
  title: " Mercado sintético ",
  note: "Compra ficticia para la prueba",
  categoryId: "owner-category",
  accountId: "owner-account",
  amount: "001250.50",
  currency: "UYU",
};

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    {
      id: "expense-owner",
      name: "Synthetic expense owner",
      email: "expense-owner@example.test",
      emailVerified: true,
    },
    {
      id: "expense-other",
      name: "Synthetic other owner",
      email: "expense-other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.expenseRevision);
  await db.delete(schema.expense);
  await db.delete(schema.sourceEvent);
  await db.delete(schema.expenseCategory);
  await db.delete(schema.financialAccount);
  await db.insert(schema.financialAccount).values([
    {
      id: "owner-account",
      userId: "expense-owner",
      name: "Cuenta pesos",
      kind: "bank",
      currency: "UYU",
    },
    {
      id: "other-account",
      userId: "expense-other",
      name: "Cuenta ajena",
      kind: "bank",
      currency: "USD",
    },
  ]);
  await db.insert(schema.expenseCategory).values([
    {
      id: "owner-category",
      userId: "expense-owner",
      name: "Alimentación",
      systemKey: "food",
    },
    {
      id: "other-category",
      userId: "expense-other",
      name: "Categoría ajena",
      systemKey: null,
    },
    {
      id: "owner-health",
      userId: "expense-owner",
      name: "Salud",
      systemKey: "health",
    },
  ]);
});

beforeEach(async () => { await db.update(schema.financialAccount).set({ openingBalance: "0.00", openingDate: "2000-01-01" }); });

afterAll(async () => {
  await database.close();
});

describe("registro manual de gastos", () => {
  it("registra un gasto completo y permite consultar su evidencia y procedencia", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        operationDate: "2026-10-18",
        operationTime: "14:35:00",
        title: "Mercado sintético",
        note: "Compra ficticia para la prueba",
        amount: "1250.50",
        currency: "UYU",
        account: {
          id: "owner-account",
          name: "Cuenta pesos",
          currency: "UYU",
        },
        category: {
          id: "owner-category",
          name: "Alimentación",
        },
        source: {
          type: "manual",
          receivedAt: expect.any(String),
          original: completeExpense,
        },
      }),
    );

    const detail = await expenseResourceResponse(
      request(`/api/expenses/${createdBody.id}`),
      createdBody.id,
      db,
      ownerAccess,
    );
    expect(detail.status).toBe(200);
    expect(await detail.json()).toEqual(createdBody);
    expect(createdBody.source.receivedAt.startsWith("2026-10-18")).toBe(false);
  });

  it.each([
    [{ ...completeExpense, operationDate: "" }, "INVALID_DATE"],
    [{ ...completeExpense, operationDate: "2026-02-30" }, "INVALID_DATE"],
    [{ ...completeExpense, operationTime: "25:00" }, "INVALID_TIME"],
    [{ ...completeExpense, title: " " }, "INVALID_TITLE"],
    [{ ...completeExpense, amount: "0" }, "INVALID_AMOUNT"],
    [{ ...completeExpense, amount: "-1" }, "INVALID_AMOUNT"],
    [{ ...completeExpense, amount: "1.234" }, "INVALID_AMOUNT"],
    [{ ...completeExpense, amount: 12.5 }, "INVALID_AMOUNT"],
    [{ ...completeExpense, currency: "USD" }, "CURRENCY_MISMATCH"],
    [{ ...completeExpense, currency: "EUR" }, "INVALID_CURRENCY"],
    [{ ...completeExpense, accountId: "other-account" }, "ACCOUNT_NOT_FOUND"],
    [
      { ...completeExpense, categoryId: "other-category" },
      "CATEGORY_NOT_FOUND",
    ],
  ])(
    "rechaza un gasto inválido o referencias ajenas: %j",
    async (body, error) => {
      const response = await expensesCollectionResponse(
        request("/api/expenses", "POST", body),
        db,
        ownerAccess,
      );
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error });
      expect(await db.select().from(schema.sourceEvent)).toHaveLength(0);
      expect(await db.select().from(schema.expense)).toHaveLength(0);
    },
  );

  it("mantiene la evidencia original separada del movimiento normalizado", async () => {
    const response = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const body = await response.json();
    const [event] = await db.select().from(schema.sourceEvent);
    const [expense] = await db.select().from(schema.expense);

    expect(event.originalPayload).toEqual(completeExpense);
    expect(expense.title).toBe("Mercado sintético");
    expect(expense.amount).toBe("1250.50");
    expect(expense.sourceEventId).toBe(event.id);
    expect(body.source.original.title).toBe(" Mercado sintético ");
  });

  it("acepta separador decimal local sin usar aritmética de punto flotante", async () => {
    const response = await expensesCollectionResponse(
      request("/api/expenses", "POST", {
        ...completeExpense,
        amount: "40,25",
      }),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.amount).toBe("40.25");
    expect(body.source.original.amount).toBe("40,25");
  });

  it("no permite consultar gastos ajenos aunque se envíe su user_id", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "expense-other",
    });

    const response = await expenseResourceResponse(
      request(`/api/expenses/${id}?user_id=expense-owner`),
      id,
      db,
      otherAccess,
    );
    expect(response.status).toBe(404);
  });

  it("corrige un gasto, conserva la evidencia y agrega el cambio al historial", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const original = await created.json();
    const corrected = {
      ...completeExpense,
      operationDate: "2026-10-19",
      operationTime: "09:10",
      title: "Mercado corregido",
      note: "Nota corregida",
      amount: "1300,25",
    };

    const response = await expenseResourceResponse(
      request(`/api/expenses/${original.id}`, "PATCH", corrected),
      original.id,
      db,
      ownerAccess,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        operationDate: "2026-10-19",
        operationTime: "09:10:00",
        title: "Mercado corregido",
        note: "Nota corregida",
        amount: "1300.25",
        source: original.source,
      }),
    );
    expect(body.history).toEqual([
      expect.objectContaining({
        previous: expect.objectContaining({
          title: "Mercado sintético",
          amount: "1250.50",
          categoryId: "owner-category",
          accountId: "owner-account",
        }),
        current: expect.objectContaining({
          title: "Mercado corregido",
          amount: "1300.25",
          categoryId: "owner-category",
          accountId: "owner-account",
        }),
        changedAt: expect.any(String),
      }),
    ]);
    expect(await db.select().from(schema.sourceEvent)).toHaveLength(1);
  });

  it("rechaza una corrección inválida y conserva la última versión válida", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const original = await created.json();

    const response = await expenseResourceResponse(
      request(`/api/expenses/${original.id}`, "PATCH", {
        ...completeExpense,
        title: " ",
      }),
      original.id,
      db,
      ownerAccess,
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "INVALID_TITLE" });
    const detail = await expenseResourceResponse(
      request(`/api/expenses/${original.id}`),
      original.id,
      db,
      ownerAccess,
    );
    expect((await detail.json()).title).toBe("Mercado sintético");
    expect(await db.select().from(schema.expenseRevision)).toHaveLength(0);
  });

  it("no agrega una revisión cuando se guarda sin cambios", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const original = await created.json();

    const response = await expenseResourceResponse(
      request(`/api/expenses/${original.id}`, "PATCH", completeExpense),
      original.id,
      db,
      ownerAccess,
    );

    expect(response.status).toBe(200);
    expect((await response.json()).history).toEqual([]);
    expect(await db.select().from(schema.expenseRevision)).toHaveLength(0);
  });

  it("cambia la categoría únicamente en el gasto corregido", async () => {
    const first = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const second = await expensesCollectionResponse(
      request("/api/expenses", "POST", {
        ...completeExpense,
        title: "Segundo gasto",
      }),
      db,
      ownerAccess,
    );
    const firstBody = await first.json();
    const secondBody = await second.json();

    await expenseResourceResponse(
      request(`/api/expenses/${firstBody.id}`, "PATCH", {
        ...completeExpense,
        categoryId: "owner-health",
      }),
      firstBody.id,
      db,
      ownerAccess,
    );

    const corrected = await expenseResourceResponse(
      request(`/api/expenses/${firstBody.id}`),
      firstBody.id,
      db,
      ownerAccess,
    );
    const untouched = await expenseResourceResponse(
      request(`/api/expenses/${secondBody.id}`),
      secondBody.id,
      db,
      ownerAccess,
    );
    expect((await corrected.json()).category).toEqual({
      id: "owner-health",
      name: "Salud",
    });
    expect((await untouched.json()).category).toEqual({
      id: "owner-category",
      name: "Alimentación",
    });
    expect(
      (await db.select().from(schema.expenseCategory)).find(
        (category) => category.id === "owner-category",
      )?.name,
    ).toBe("Alimentación");
  });

  it("no permite corregir un gasto ni usar referencias de otro usuario", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const original = await created.json();
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "expense-other",
    });

    const hidden = await expenseResourceResponse(
      request(`/api/expenses/${original.id}`, "PATCH", completeExpense),
      original.id,
      db,
      otherAccess,
    );
    expect(hidden.status).toBe(404);

    const foreignCategory = await expenseResourceResponse(
      request(`/api/expenses/${original.id}`, "PATCH", {
        ...completeExpense,
        categoryId: "other-category",
      }),
      original.id,
      db,
      ownerAccess,
    );
    expect(foreignCategory.status).toBe(422);
    expect(await foreignCategory.json()).toEqual({
      error: "CATEGORY_NOT_FOUND",
    });
    expect(await db.select().from(schema.expenseRevision)).toHaveLength(0);
  });

  it("no cambia la moneda de una cuenta que ya tiene gastos", async () => {
    const created = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    const { id } = await created.json();

    const renamed = await accountResourceResponse(
      request("/api/accounts/owner-account", "PATCH", {
        name: "Cuenta pesos renombrada",
        currency: "USD",
      }),
      "owner-account",
      db,
      ownerAccess,
    );
    expect((await renamed.json()).currency).toBe("UYU");

    const detail = await expenseResourceResponse(
      request(`/api/expenses/${id}`),
      id,
      db,
      ownerAccess,
    );
    expect((await detail.json()).currency).toBe("UYU");
  });

  it("rechaza referencias archivadas aunque el cliente intente enviarlas", async () => {
    await db
      .update(schema.financialAccount)
      .set({ archivedAt: new Date() })
      .where(eq(schema.financialAccount.id, "owner-account"));
    const account = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    expect(account.status).toBe(422);
    expect(await account.json()).toEqual({ error: "ACCOUNT_NOT_FOUND" });

    await db
      .update(schema.financialAccount)
      .set({ archivedAt: null })
      .where(eq(schema.financialAccount.id, "owner-account"));
    await db
      .update(schema.expenseCategory)
      .set({ archivedAt: new Date() })
      .where(eq(schema.expenseCategory.id, "owner-category"));
    const category = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      ownerAccess,
    );
    expect(category.status).toBe(422);
    expect(await category.json()).toEqual({ error: "CATEGORY_NOT_FOUND" });
  });

  it("rechaza acceso anónimo antes de consultar o escribir", async () => {
    const anonymous = async () => ({ status: "unauthenticated" as const });
    const response = await expensesCollectionResponse(
      request("/api/expenses", "POST", completeExpense),
      db,
      anonymous,
    );
    expect(response.status).toBe(401);
  });
});
