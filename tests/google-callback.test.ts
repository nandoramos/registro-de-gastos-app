import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { createAuth } from "@/modules/auth/config";
import { authorizeSession } from "@/modules/auth/access";
import { ownsGoogleIdentity } from "@/modules/auth/identity-store";

const config = {
  baseURL: "http://localhost:3000",
  secret: "synthetic-callback-secret-not-for-deployment-0001",
  googleClientId: "synthetic-oauth-client",
  googleClientSecret: "synthetic-secret",
  allowedGoogleSub: "google-owner",
};
afterEach(() => vi.unstubAllGlobals());

async function callback(
  profile: { sub: string; verified: boolean },
  tamperState = false,
) {
  const database = new PGlite();
  const db = drizzle(database, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  const auth = createAuth(db, config);
  try {
    const start = await auth.handler(
      new Request(`${config.baseURL}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: config.baseURL },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/privado",
          errorCallbackURL: "/login?error=access",
        }),
      }),
    );
    expect(start.status).toBe(200);
    const authorizeURL = new URL((await start.json()).url);
    const cookies = start.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = {
      ...(await exportJWK(publicKey)),
      kid: "synthetic-key",
      alg: "RS256",
      use: "sig",
    };
    const idToken = await new SignJWT({
      email: "synthetic@example.test",
      email_verified: profile.verified,
      name: "Synthetic",
      nonce: authorizeURL.searchParams.get("nonce") ?? undefined,
    })
      .setProtectedHeader({ alg: "RS256", kid: "synthetic-key" })
      .setSubject(profile.sub)
      .setIssuer("https://accounts.google.com")
      .setAudience(config.googleClientId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.startsWith("https://oauth2.googleapis.com/token"))
          return Response.json({
            access_token: "synthetic-access-token",
            id_token: idToken,
            token_type: "Bearer",
            expires_in: 3600,
            scope: "openid email profile",
          });
        if (url.startsWith("https://www.googleapis.com/oauth2/v3/certs"))
          return Response.json({ keys: [jwk] });
        throw new Error("Unexpected external request in test");
      }),
    );
    const state = tamperState
      ? "forged-state"
      : authorizeURL.searchParams.get("state");
    const response = await auth.handler(
      new Request(
        `${config.baseURL}/api/auth/callback/google?code=synthetic-code&state=${encodeURIComponent(state!)}`,
        { headers: { cookie: cookies } },
      ),
    );
    const sessionCookie = response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: sessionCookie }),
    });
    const access = await authorizeSession(session, (id) =>
      ownsGoogleIdentity(db, id, config.allowedGoogleSub),
    );
    return {
      status: response.status,
      location: response.headers.get("location"),
      access,
      users: await db.select().from(schema.user),
      sessions: await db.select().from(schema.session),
      accounts: await db.select().from(schema.account),
    };
  } finally {
    await database.close();
  }
}

describe("callback Google con identidad sintética firmada", () => {
  it("crea usuario, cuenta y sesión para el subject autorizado", async () => {
    const result = await callback({ sub: "google-owner", verified: true });
    expect(result.status).toBe(302);
    expect(result.location).toContain("/privado");
    expect(result.access.status).toBe("authorized");
    expect(result.users).toHaveLength(1);
    expect(result.sessions).toHaveLength(1);
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].accountId).toBe("google-owner");
  });
  it.each([
    { sub: "google-other", verified: true },
    { sub: "google-owner", verified: false },
  ])(
    "rechaza $sub con verificación $verified antes de persistir identidad",
    async (profile) => {
      const result = await callback(profile);
      expect(result.access.status).toBe("unauthenticated");
      expect(result.users).toHaveLength(0);
      expect(result.accounts).toHaveLength(0);
      expect(result.sessions).toHaveLength(0);
    },
  );
  it("rechaza callback sin estado válido", async () => {
    const result = await callback(
      { sub: "google-owner", verified: true },
      true,
    );
    expect(result.access.status).toBe("unauthenticated");
    expect(result.users).toHaveLength(0);
  });
});
