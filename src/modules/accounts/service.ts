import { and, asc, eq, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { AccountCurrency, AccountKind, AccountView } from "./domain";

export type AccountsDatabase<T extends PgQueryResultHKT> = PgDatabase<
  T,
  typeof schema
>;

const accountSelection = {
  id: schema.financialAccount.id,
  name: schema.financialAccount.name,
  kind: schema.financialAccount.kind,
  currency: schema.financialAccount.currency,
  archivedAt: schema.financialAccount.archivedAt,
};

export async function listAccounts<T extends PgQueryResultHKT>(
  db: AccountsDatabase<T>,
  userId: string, includeArchived = false,
): Promise<AccountView[]> {
  return db
    .select(accountSelection)
    .from(schema.financialAccount)
    .where(and(eq(schema.financialAccount.userId, userId), ...(includeArchived ? [] : [isNull(schema.financialAccount.archivedAt)])))
    .orderBy(asc(schema.financialAccount.name));
}

export async function archiveAccount<T extends PgQueryResultHKT>(db: AccountsDatabase<T>, userId: string, accountId: string) {
  const [account] = await db.update(schema.financialAccount).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(schema.financialAccount.id, accountId), eq(schema.financialAccount.userId, userId), isNull(schema.financialAccount.archivedAt))).returning(accountSelection); return account;
}

export async function createAccount<T extends PgQueryResultHKT>(
  db: AccountsDatabase<T>,
  userId: string,
  input: { name: string; kind: AccountKind; currency: AccountCurrency },
): Promise<AccountView> {
  const [account] = await db
    .insert(schema.financialAccount)
    .values({ id: crypto.randomUUID(), userId, ...input })
    .returning(accountSelection);
  return account;
}

export async function renameAccount<T extends PgQueryResultHKT>(
  db: AccountsDatabase<T>,
  userId: string,
  accountId: string,
  name: string,
): Promise<AccountView | undefined> {
  const [account] = await db
    .update(schema.financialAccount)
    .set({ name, updatedAt: new Date() })
    .where(
      and(
        eq(schema.financialAccount.id, accountId),
        eq(schema.financialAccount.userId, userId),
      ),
    )
    .returning(accountSelection);
  return account;
}
