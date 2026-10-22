import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { createAuth } from "./config";
import { readAuthEnv } from "./env";
import { authorizeSession } from "./access";
import { ownsGoogleIdentity } from "./identity-store";

function createRuntime() {
  const config = readAuthEnv(process.env);
  const pool = new Pool({ connectionString: config.databaseURL, max: 5 });
  pool.on("error", () => {
    /* Do not log connection strings or database payloads. */
  });
  const db = drizzle(pool, { schema });
  return { auth: createAuth(db, config), db, config };
}
const runtimeGlobal = globalThis as typeof globalThis & {
  authRuntime?: ReturnType<typeof createRuntime>;
};
export function getAuthRuntime() {
  return (runtimeGlobal.authRuntime ??= createRuntime());
}
export async function getAccess(headers: Headers) {
  const { auth, db, config } = getAuthRuntime();
  const session = await auth.api.getSession({ headers });
  return authorizeSession(session, (userId) =>
    ownsGoogleIdentity(db, userId, config.allowedGoogleSub),
  );
}
