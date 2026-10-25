import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import {
  categoriesCollectionResponse,
  categoryResourceResponse,
} from "@/modules/categories/http";

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
      email: "owner-category@example.test",
      emailVerified: true,
    },
    {
      id: "other",
      name: "Synthetic other",
      email: "other-category@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.expenseCategory);
});

afterAll(async () => {
  await database.close();
});

describe("categorías de gastos", () => {
  it("inicializa una sola vez las 20 categorías acordadas", async () => {
    const first = await categoriesCollectionResponse(
      request("/api/categories"),
      db,
      ownerAccess,
    );
    const second = await categoriesCollectionResponse(
      request("/api/categories"),
      db,
      ownerAccess,
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const body = await second.json();
    expect(body.categories).toHaveLength(20);
    expect(
      body.categories.map((category: { name: string }) => category.name),
    ).toEqual(
      expect.arrayContaining([
        "Alimentación",
        "Casa Nueva",
        "Mama",
        "Onix - Nafta",
        "ANTEL - celular",
        "Facu",
      ]),
    );
    expect(await db.select().from(schema.expenseCategory)).toHaveLength(20);
  });

  it("crea categorías propias de un solo nivel", async () => {
    const created = await categoriesCollectionResponse(
      request("/api/categories", "POST", {
        name: "Mascotas",
        parentId: "ignored",
      }),
      db,
      ownerAccess,
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({
      id: expect.any(String),
      name: "Mascotas",
      systemKey: null,
      archivedAt: null,
    });
  });

  it("renombra Casa Nueva sin perder su identidad estable", async () => {
    const listed = await categoriesCollectionResponse(
      request("/api/categories"),
      db,
      ownerAccess,
    );
    const categories = (await listed.json()).categories as Array<{
      id: string;
      name: string;
      systemKey: string | null;
    }>;
    const house = categories.find((category) => category.name === "Casa Nueva");
    expect(house?.systemKey).toBe("house_construction");

    const renamed = await categoryResourceResponse(
      request(`/api/categories/${house?.id}`, "PATCH", {
        name: "Obra de casa",
      }),
      house!.id,
      db,
      ownerAccess,
    );
    expect(await renamed.json()).toEqual({
      id: house!.id,
      name: "Obra de casa",
      systemKey: "house_construction",
      archivedAt: null,
    });
  });

  it("mantiene Otros como elección identificable y no crea asignaciones", async () => {
    const listed = await categoriesCollectionResponse(
      request("/api/categories"),
      db,
      ownerAccess,
    );
    const categories = (await listed.json()).categories as Array<{
      name: string;
      systemKey: string | null;
    }>;
    expect(
      categories.find((category) => category.name === "Otros")?.systemKey,
    ).toBe("other");
    expect(
      categories.filter((category) => category.systemKey === "other"),
    ).toHaveLength(1);
  });

  it("archiva una categoría propia y no la ofrece en la lista activa", async () => {
    const created = await categoriesCollectionResponse(request("/api/categories", "POST", { name: "Temporal" }), db, ownerAccess);
    const category = await created.json();
    const archived = await categoryResourceResponse(request(`/api/categories/${category.id}/archive`, "POST"), category.id, db, ownerAccess);
    expect(archived.status).toBe(200);
    expect((await archived.json()).archivedAt).toEqual(expect.any(String));
    const active = await categoriesCollectionResponse(request("/api/categories"), db, ownerAccess);
    expect((await active.json()).categories.map((item: { id: string }) => item.id)).not.toContain(category.id);
  });

  it.each(["", " ", "x".repeat(81)])(
    "rechaza el nombre inválido %j",
    async (name) => {
      const response = await categoriesCollectionResponse(
        request("/api/categories", "POST", { name }),
        db,
        ownerAccess,
      );
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: "INVALID_NAME" });
    },
  );

  it("aísla inicialización, listado y renombrado por usuario", async () => {
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "other",
    });
    const ownerList = await categoriesCollectionResponse(
      request("/api/categories"),
      db,
      ownerAccess,
    );
    const ownerCategory = (await ownerList.json()).categories[0] as {
      id: string;
    };

    const otherList = await categoriesCollectionResponse(
      request("/api/categories?user_id=owner"),
      db,
      otherAccess,
    );
    expect((await otherList.json()).categories).toHaveLength(20);
    expect(await db.select().from(schema.expenseCategory)).toHaveLength(40);

    const attemptedRename = await categoryResourceResponse(
      request(`/api/categories/${ownerCategory.id}?user_id=owner`, "PATCH", {
        name: "Ajena",
      }),
      ownerCategory.id,
      db,
      otherAccess,
    );
    expect(attemptedRename.status).toBe(404);
  });
});
