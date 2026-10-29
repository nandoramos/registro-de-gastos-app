import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import {
  accountsCollectionResponse,
  accountResourceResponse,
} from "@/modules/accounts/http";
import { listAccountOptions, listAccounts } from "@/modules/accounts/service";

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
  it("lista opciones autorizadas sin calcular saldos y conserva configuración y filtro de archivadas", async () => {
    await db.insert(schema.financialAccount).values([
      { id: "option-active", userId: "owner", name: "Activa", kind: "cash", currency: "UYU", openingBalance: "50.00", openingDate: "2026-01-01" },
      { id: "option-archived", userId: "owner", name: "Archivada", kind: "bank", currency: "USD", openingBalance: "25.00", openingDate: "2026-02-01", archivedAt: new Date("2026-03-01T00:00:00Z") },
      { id: "option-other", userId: "other", name: "Otra persona", kind: "bank", currency: "UYU", openingBalance: "10.00", openingDate: "2026-01-01" },
    ]);

    const active = await listAccountOptions(db, "owner");
    expect(active).toEqual([expect.objectContaining({ id: "option-active", currency: "UYU", openingBalance: "50.00", openingDate: "2026-01-01" })]);
    expect(active[0]).not.toHaveProperty("balance");
    const all = await listAccountOptions(db, "owner", true);
    expect(all.map((account) => account.id)).toEqual(["option-active", "option-archived"]);
    expect(all.every((account) => !Object.hasOwn(account, "balance"))).toBe(true);

    const calculated = await listAccounts(db, "owner", true);
    expect(calculated.find((account) => account.id === "option-active")?.balance).toBe("50.00");
  });

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
