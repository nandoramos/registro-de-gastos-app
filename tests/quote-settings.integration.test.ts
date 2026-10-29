import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { quoteSettingsResponse } from "@/modules/settings/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const ownerAccess = async () => ({ status: "authorized" as const, userId: "settings-owner" });

function request(method = "GET", body?: unknown) {
  return new Request("http://localhost:3000/api/settings/quotes", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.insert(schema.user).values([
    { id: "settings-owner", name: "Settings owner", email: "settings-owner@example.test", emailVerified: true },
    { id: "settings-other", name: "Settings other", email: "settings-other@example.test", emailVerified: true },
  ]);
});

afterAll(async () => database.close());
beforeEach(async () => { await db.delete(schema.userSettings); });

describe("preferencias de cotización", () => {
  it("usa 40 por defecto y persiste compra y venta juntas por usuario", async () => {
    const defaults = await quoteSettingsResponse(request(), db, ownerAccess);
    expect(defaults.status).toBe(200);
    expect(await defaults.json()).toEqual({ buyRate: "40.00", sellRate: "40.00" });

    const saved = await quoteSettingsResponse(
      request("PATCH", { buyRate: "39.50", sellRate: "40,25" }), db, ownerAccess,
    );
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ buyRate: "39.50", sellRate: "40.25" });

    const other = await quoteSettingsResponse(request(), db, async () => ({
      status: "authorized" as const,
      userId: "settings-other",
    }));
    expect(await other.json()).toEqual({ buyRate: "40.00", sellRate: "40.00" });
  });

  it("rechaza valores inválidos sin modificar las cotizaciones guardadas", async () => {
    await quoteSettingsResponse(request("PATCH", { buyRate: "39.50", sellRate: "40.25" }), db, ownerAccess);
    const invalid = await quoteSettingsResponse(
      request("PATCH", { buyRate: "0", sellRate: "40.123" }), db, ownerAccess,
    );
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual({ error: "INVALID_BUY_RATE" });
    const current = await quoteSettingsResponse(request(), db, ownerAccess);
    expect(await current.json()).toEqual({ buyRate: "39.50", sellRate: "40.25" });
  });

  it("requiere autorización para leer las cotizaciones", async () => {
    const denied = await quoteSettingsResponse(request(), db, async () => ({
      status: "unauthenticated" as const,
    }));
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({ error: "UNAUTHENTICATED" });
  });
});
