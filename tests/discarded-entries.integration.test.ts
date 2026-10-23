import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import {
  pendingEntryResourceResponse,
  pendingEntriesCollectionResponse,
} from "@/modules/pending-entries/http";
import {
  discardedEntriesCollectionResponse,
  discardedEntryRecoverResponse,
  pendingEntryDiscardResponse,
} from "@/modules/discarded-entries/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({
  status: "authorized" as const,
  userId: "discard-owner",
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
      id: "discard-owner",
      name: "Synthetic discard owner",
      email: "discard-owner@example.test",
      emailVerified: true,
    },
    {
      id: "discard-other",
      name: "Synthetic other",
      email: "discard-other@example.test",
      emailVerified: true,
    },
  ]);
});

beforeEach(async () => {
  await db.delete(schema.expense);
  await db.delete(schema.sourceEvent);
});

afterAll(async () => {
  await database.close();
});

describe("descarte y recuperación de pendientes", () => {
  it("descarta sin perder evidencia y lo retira de lista y contador", async () => {
    const original = { title: "Entrada equivocada sintética" };
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", original),
      db,
      ownerAccess,
    );
    const { id } = await created.json();

    const discarded = await pendingEntryDiscardResponse(
      request("/api/pending-entries/" + id + "/discard", "POST"),
      id,
      db,
      ownerAccess,
    );
    expect(discarded.status).toBe(200);
    expect(await discarded.json()).toEqual(
      expect.objectContaining({
        id,
        status: "discarded",
        original,
        discardedAt: expect.any(String),
      }),
    );

    const pending = await pendingEntriesCollectionResponse(
      request("/api/pending-entries"),
      db,
      ownerAccess,
    );
    expect(await pending.json()).toEqual({ count: 0, entries: [] });
    expect(await db.select().from(schema.expense)).toHaveLength(0);
  });

  it("consulta descartadas y recupera a revisión sin crear un movimiento", async () => {
    const original = { title: "Recuperable sintética", amount: "10" };
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", original),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    await pendingEntryDiscardResponse(
      request("/api/pending-entries/" + id + "/discard", "POST"),
      id,
      db,
      ownerAccess,
    );

    const listed = await discardedEntriesCollectionResponse(
      request("/api/discarded-entries"),
      db,
      ownerAccess,
    );
    expect(await listed.json()).toEqual({
      count: 1,
      entries: [expect.objectContaining({ id, status: "discarded", original })],
    });

    const recovered = await discardedEntryRecoverResponse(
      request("/api/discarded-entries/" + id + "/recover", "POST"),
      id,
      db,
      ownerAccess,
    );
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual(
      expect.objectContaining({ id, status: "pending", original }),
    );
    expect(await db.select().from(schema.expense)).toHaveLength(0);

    const reviews = await db.select().from(schema.sourceEventReview);
    expect(reviews.map((review) => review.outcome)).toEqual([
      "discarded",
      "recovered",
    ]);
  });

  it("no descarta ni recupera entradas de otro usuario", async () => {
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", { title: "Entrada privada" }),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    const otherAccess = async () => ({
      status: "authorized" as const,
      userId: "discard-other",
    });

    const discard = await pendingEntryDiscardResponse(
      request("/api/pending-entries/" + id + "/discard", "POST"),
      id,
      db,
      otherAccess,
    );
    expect(discard.status).toBe(404);

    await pendingEntryDiscardResponse(
      request("/api/pending-entries/" + id + "/discard", "POST"),
      id,
      db,
      ownerAccess,
    );
    const recover = await discardedEntryRecoverResponse(
      request("/api/discarded-entries/" + id + "/recover", "POST"),
      id,
      db,
      otherAccess,
    );
    expect(recover.status).toBe(404);
  });

  it("registra exactamente la interpretación vigente al descartar", async () => {
    const created = await pendingEntriesCollectionResponse(
      request("/api/pending-entries", "POST", { title: "Versión inicial" }),
      db,
      ownerAccess,
    );
    const { id } = await created.json();
    await pendingEntryResourceResponse(
      request("/api/pending-entries/" + id, "PATCH", {
        title: "Versión corregida",
      }),
      id,
      db,
      ownerAccess,
    );

    await pendingEntryDiscardResponse(
      request("/api/pending-entries/" + id + "/discard", "POST"),
      id,
      db,
      ownerAccess,
    );
    const reviews = await db.select().from(schema.sourceEventReview);
    expect(reviews.at(-1)?.interpretation).toEqual({
      title: "Versión corregida",
    });
    expect(reviews.at(-1)?.outcome).toBe("discarded");
  });
});
