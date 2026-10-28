import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import {
  accountsCollectionResponse,
  accountResourceResponse,
} from "@/modules/accounts/http";

const database = new PGlite();
const db = drizzle(database, { schema });

const ownerAccess = async () => ({
  status: "authorized" as const,
  userId: "owner",
});

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
    {
      id: "owner",
      name: "Synthetic owner",
      email: "owner@example.test",
      emailVerified: true,
    },
    {
      id: "other",
      name: "Synthetic other",
      email: "other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.financialAccount);
});

afterAll(async () => {
  await database.close();
});

describe("cuentas propias", () => {
  it("crea y lista cuentas bancarias y de efectivo en UYU o USD", async () => {
    for (const input of [
      { name: "Itaú pesos", kind: "bank", currency: "UYU", openingBalance: "0", openingDate: "2026-01-01" },
      { name: "Efectivo dólares", kind: "cash", currency: "USD", openingBalance: "0", openingDate: "2026-01-01" },
    ]) {
      const response = await accountsCollectionResponse(
        request("/api/accounts", "POST", input),
        db,
        ownerAccess,
      );
      expect(response.status).toBe(201);
    }

    const response = await accountsCollectionResponse(
      request("/api/accounts"),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accounts: [
        expect.objectContaining({
          name: "Efectivo dólares",
          kind: "cash",
          currency: "USD",
        }),
        expect.objectContaining({
          name: "Itaú pesos",
          kind: "bank",
          currency: "UYU",
        }),
      ],
    });
  });

  it.each([
    [{ name: "", kind: "bank", currency: "UYU" }, "INVALID_NAME"],
    [{ name: "Cuenta", kind: "bank", currency: "EUR" }, "INVALID_CURRENCY"],
    [{ name: "Cuenta", kind: "wallet", currency: "UYU" }, "INVALID_KIND"],
  ])("rechaza datos inválidos sin persistir: %j", async (body, error) => {
    const response = await accountsCollectionResponse(
      request("/api/accounts", "POST", body),
      db,
      ownerAccess,
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error });

    const rows = await db.select().from(schema.financialAccount);
    expect(rows).toHaveLength(0);
  });

  it("renombra una cuenta conservando identidad, tipo y moneda", async () => {
    const created = await accountsCollectionResponse(
      request("/api/accounts", "POST", {
        name: "Itaú",
        kind: "bank",
        currency: "UYU",
        openingBalance: "0",
        openingDate: "2026-01-01",
      }),
      db,
      ownerAccess,
    );
    const account = await created.json();

    const response = await accountResourceResponse(
      request(`/api/accounts/${account.id}`, "PATCH", {
        name: "Itaú pesos",
        currency: "USD",
        kind: "cash",
      }),
      account.id,
      db,
      ownerAccess,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: account.id,
      name: "Itaú pesos",
      kind: "bank",
      currency: "UYU",
      archivedAt: null,
      openingBalance: "0.00",
      openingDate: "2026-01-01",
    });
  });

  it("archiva una cuenta propia y la excluye de nuevas listas", async () => {
    const created = await accountsCollectionResponse(request("/api/accounts", "POST", { name: "Cuenta vieja", kind: "bank", currency: "UYU", openingBalance: "0", openingDate: "2026-01-01" }), db, ownerAccess);
    const account = await created.json();
    const archived = await accountResourceResponse(request(`/api/accounts/${account.id}/archive`, "POST"), account.id, db, ownerAccess);
    expect(archived.status).toBe(200);
    expect((await archived.json()).archivedAt).toEqual(expect.any(String));
    expect(await accountsCollectionResponse(request("/api/accounts"), db, ownerAccess).then((response) => response.json())).toEqual({ accounts: [] });
  });

  it("no lista ni modifica cuentas de otro usuario aunque envíe su user_id", async () => {
    const [foreign] = await db
      .insert(schema.financialAccount)
      .values({
        id: "foreign-account",
        userId: "other",
        name: "Cuenta ajena",
        kind: "bank",
        currency: "USD",
      })
      .returning();

    const listed = await accountsCollectionResponse(
      request("/api/accounts?user_id=other"),
      db,
      ownerAccess,
    );
    expect(await listed.json()).toEqual({ accounts: [] });

    const renamed = await accountResourceResponse(
      request(`/api/accounts/${foreign.id}?user_id=other`, "PATCH", {
        name: "Intento",
      }),
      foreign.id,
      db,
      ownerAccess,
    );
    expect(renamed.status).toBe(404);
  });

  it("rechaza acceso anónimo antes de consultar o escribir", async () => {
    const anonymous = async () => ({ status: "unauthenticated" as const });
    const response = await accountsCollectionResponse(
      request("/api/accounts"),
      db,
      anonymous,
    );
    expect(response.status).toBe(401);
  });
});
