import { and, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

export type AuthDatabase<T extends PgQueryResultHKT> = PgDatabase<
  T,
  typeof schema
>;

export async function ownsGoogleIdentity<T extends PgQueryResultHKT>(
  db: AuthDatabase<T>,
  userId: string,
  subject: string,
): Promise<boolean> {
  if (!subject) return false;
  const identities = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .innerJoin(schema.user, eq(schema.account.userId, schema.user.id))
    .where(
      and(
        eq(schema.account.userId, userId),
        eq(schema.account.providerId, "google"),
        eq(schema.account.accountId, subject),
        eq(schema.user.emailVerified, true),
      ),
    )
    .limit(1);
  return identities.length === 1;
}
