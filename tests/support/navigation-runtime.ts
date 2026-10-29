// Copied over the auth runtime ONLY in the disposable benchmark workspace.
// Never imported by application code or enabled by a runtime environment flag.
import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import { createAuth } from "@/modules/auth/config";
import { authorizeSession } from "@/modules/auth/access";
import { ownsGoogleIdentity } from "@/modules/auth/identity-store";
import { ensureInitialCategories } from "@/modules/categories/service";

const config = {
  baseURL: "http://localhost:3107",
  secret: "synthetic-benchmark-secret-not-for-deployment-0001",
  googleClientId: "synthetic-client",
  googleClientSecret: "synthetic-client-secret",
  allowedGoogleSub: "synthetic-benchmark-google",
};

function createRuntime() {
  const database = new PGlite();
  const db = drizzle(database, { schema });
  const auth = createAuth(db, config);
  const ready = (async () => {
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({
      id: "benchmark-owner",
      name: "Synthetic",
      email: "benchmark@example.test",
      emailVerified: true,
    });
    await db.insert(schema.account).values({
      id: "benchmark-google",
      userId: "benchmark-owner",
      providerId: "google",
      accountId: config.allowedGoogleSub,
    });
    await db.insert(schema.session).values({
      id: "benchmark-session",
      userId: "benchmark-owner",
      token: "synthetic-benchmark-token",
      expiresAt: new Date(Date.now() + 86400000),
    });
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Montevideo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    await db.insert(schema.financialAccount).values({
      id: "benchmark-cash",
      userId: "benchmark-owner",
      name: "Efectivo sintético",
      kind: "cash",
      currency: "UYU",
      openingBalance: "100000.00",
      openingDate: today,
    });
    await ensureInitialCategories(db, "benchmark-owner");
  })();
  return { db, auth, config, ready };
}

const isolatedGlobal = globalThis as typeof globalThis & {
  navigationRuntime?: ReturnType<typeof createRuntime>;
};
export function getAuthRuntime() {
  return (isolatedGlobal.navigationRuntime ??= createRuntime());
}
export async function getAccess(headers: Headers) {
  const { ready, auth, db } = getAuthRuntime();
  await ready;
  if (headers.get("cookie")?.includes("navigation-delay=1")) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return authorizeSession(await auth.api.getSession({ headers }), (id) =>
    ownsGoogleIdentity(db, id, config.allowedGoogleSub),
  );
}
