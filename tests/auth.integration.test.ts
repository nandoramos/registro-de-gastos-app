import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { createAuth } from "@/modules/auth/config";
import { authorizeSession } from "@/modules/auth/access";
import { ownsGoogleIdentity } from "@/modules/auth/identity-store";
import { privateSessionResponse } from "@/modules/auth/http";

const database = new PGlite();
const db = drizzle(database, { schema });
const config = {
  baseURL: "http://localhost:3000",
  secret: "synthetic-test-secret-not-for-deployment-0001",
  googleClientId: "synthetic-client",
  googleClientSecret: "synthetic-client-secret",
  allowedGoogleSub: "google-owner",
};
const auth = createAuth(db, config);
const now = new Date();
let ownerCookie: string;
let otherCookie: string;

async function access(headers: Headers) {
  return authorizeSession(await auth.api.getSession({ headers }), (id) =>
    ownsGoogleIdentity(db, id, config.allowedGoogleSub),
  );
}
function request(cookie?: string, query = "") {
  return new Request(`http://localhost:3000/api/private/session${query}`, {
    headers: cookie ? { cookie } : {},
  });
}
async function signedCookie(token: string) {
  // Use the library's cookie signing implementation; never introduce a test bypass in production.
  const { serializeSignedCookie } = await import("better-call");
  return (
    await serializeSignedCookie(
      "better-auth.session_token",
      token,
      config.secret,
    )
  ).split(";")[0];
}

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
  for (const [id, sub] of [
    ["owner", "google-owner"],
    ["other", "google-other"],
  ]) {
    await db
      .insert(schema.user)
      .values({
        id,
        name: "Synthetic",
        email: `${id}@example.test`,
        emailVerified: true,
      });
    await db
      .insert(schema.account)
      .values({
        id: `account-${id}`,
        userId: id,
        providerId: "google",
        accountId: sub,
      });
    await db
      .insert(schema.session)
      .values({
        id: `session-${id}`,
        userId: id,
        token: `synthetic-token-${id}`,
        expiresAt: new Date(now.getTime() + 3600000),
      });
  }
  ownerCookie = await signedCookie("synthetic-token-owner");
  otherCookie = await signedCookie("synthetic-token-other");
});
afterAll(async () => {
  await database.close();
});

describe("frontera privada con sesiones persistidas", () => {
  it("rechaza anónimos y cookies falsificadas", async () => {
    for (const cookie of [undefined, "better-auth.session_token=forged"]) {
      const res = await privateSessionResponse(request(cookie), access);
      expect(res.status).toBe(401);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });
  it("devuelve solo la identidad de la sesión aunque el cliente envíe otro user_id", async () => {
    const res = await privateSessionResponse(
      request(ownerCookie, "?user_id=other"),
      access,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "owner" });
  });
  it("no autoriza a otro usuario aunque su sesión sea válida", async () => {
    const res = await privateSessionResponse(
      request(otherCookie, "?user_id=owner"),
      access,
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "FORBIDDEN" });
  });
  it("consulta la cuenta del usuario autenticado, no cualquier cuenta permitida", async () => {
    expect(await ownsGoogleIdentity(db, "owner", "google-owner")).toBe(true);
    expect(await ownsGoogleIdentity(db, "other", "google-owner")).toBe(false);
  });
  it("revalida cambios de identidad autorizada sin caché de cookie", async () => {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: ownerCookie }),
    });
    expect(
      await authorizeSession(session, (id) =>
        ownsGoogleIdentity(db, id, "changed-subject"),
      ),
    ).toEqual({ status: "forbidden" });
  });
  it("rechaza sesiones vencidas", async () => {
    await db
      .insert(schema.session)
      .values({
        id: "expired",
        userId: "owner",
        token: "expired-synthetic",
        expiresAt: new Date(now.getTime() - 60000),
      });
    const res = await privateSessionResponse(
      request(await signedCookie("expired-synthetic")),
      access,
    );
    expect(res.status).toBe(401);
  });
  it("cierra la sesión en persistencia y rechaza su reutilización", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-out", {
        method: "POST",
        headers: {
          cookie: ownerCookie,
          origin: config.baseURL,
          "content-type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(
      await db
        .select()
        .from(schema.session)
        .where(eq(schema.session.id, "session-owner")),
    ).toHaveLength(0);
    expect(
      (await privateSessionResponse(request(ownerCookie), access)).status,
    ).toBe(401);
  });
  it("no expone errores internos", async () => {
    const response = await privateSessionResponse(request(), async () => {
      throw new Error("synthetic-private-db-error");
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
  });
});

describe("inicio OAuth", () => {
  async function social(body: unknown, origin = config.baseURL) {
    return auth.handler(
      new Request(`${config.baseURL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { origin, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }
  it("solicita solo identidad, con estado y PKCE", async () => {
    const res = await social({ provider: "google", callbackURL: "/privado" });
    expect(res.status).toBe(200);
    const url = new URL((await res.json()).url);
    expect(url.hostname).toBe("accounts.google.com");
    expect(new Set(url.searchParams.get("scope")?.split(" "))).toEqual(
      new Set(["openid", "email", "profile"]),
    );
    expect(url.searchParams.get("include_granted_scopes")).not.toBe("true");
    expect(url.searchParams.get("access_type")).toBe("online");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
  });
  it("rechaza scopes extra, proveedores ajenos y origen externo", async () => {
    expect(
      (
        await social({
          provider: "google",
          scopes: ["https://mail.google.com/"],
        })
      ).status,
    ).toBe(403);
    expect((await social({ provider: "github" })).status).toBe(403);
    expect(
      (await social({ provider: "google" }, "https://untrusted.example.test"))
        .status,
    ).toBe(403);
  });
  it("no permite ingresar con tokens enviados directamente por el cliente", async () => {
    const res = await social({
      provider: "google",
      idToken: { token: "synthetic-token" },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
  it("no habilita autenticación por contraseña", async () => {
    const res = await auth.handler(
      new Request(`${config.baseURL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { origin: config.baseURL, "content-type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.test",
          password: "synthetic-password",
        }),
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
