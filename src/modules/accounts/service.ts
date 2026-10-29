import { and, asc, eq, isNull, isNotNull, sql } from "drizzle-orm";
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
  openingBalance: schema.financialAccount.openingBalance,
  openingDate: schema.financialAccount.openingDate,
};

export function accountBalanceExpression() {
  return sql<string | null>`case when ${schema.financialAccount.openingBalance} is null then null else (
    ${schema.financialAccount.openingBalance}
    - coalesce((select sum(e.amount) from expense e where e.user_id = financial_account.user_id and e.account_id = financial_account.id and e.voided_at is null and e.operation_date >= financial_account.opening_date and e.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
    + coalesce((select sum(i.amount) from income i where i.user_id = financial_account.user_id and i.account_id = financial_account.id and i.voided_at is null and i.operation_date >= financial_account.opening_date and i.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
    - coalesce((select sum(t.source_amount) from own_transfer t where t.user_id = financial_account.user_id and t.source_account_id = financial_account.id and t.voided_at is null and t.operation_date >= financial_account.opening_date and t.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
    + coalesce((select sum(t.destination_amount) from own_transfer t where t.user_id = financial_account.user_id and t.destination_account_id = financial_account.id and t.voided_at is null and t.operation_date >= financial_account.opening_date and t.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
    - coalesce((select sum(c.source_amount) from currency_conversion c where c.user_id = financial_account.user_id and c.source_account_id = financial_account.id and c.voided_at is null and c.operation_date >= financial_account.opening_date and c.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
    + coalesce((select sum(c.destination_amount) from currency_conversion c where c.user_id = financial_account.user_id and c.destination_account_id = financial_account.id and c.voided_at is null and c.operation_date >= financial_account.opening_date and c.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
    + coalesce((select sum(case when a.direction = 'increase' then a.amount else -a.amount end) from manual_adjustment a where a.user_id = financial_account.user_id and a.account_id = financial_account.id and a.voided_at is null and a.operation_date >= financial_account.opening_date and a.operation_date <= (now() at time zone 'America/Montevideo')::date), 0)
  )::text end`;
}

export async function configureOpeningBalance<T extends PgQueryResultHKT>(db: AccountsDatabase<T>, userId: string, accountId: string, input: { amount: string; date: string }) {
  const [account] = await db.update(schema.financialAccount)
    .set({ openingBalance: input.amount, openingDate: input.date, updatedAt: new Date() })
    .where(and(eq(schema.financialAccount.id, accountId), eq(schema.financialAccount.userId, userId), isNull(schema.financialAccount.openingBalance)))
    .returning(accountSelection);
  return account;
}

export async function listAccounts<T extends PgQueryResultHKT>(
  db: AccountsDatabase<T>,
  userId: string, includeArchived = false,
): Promise<AccountView[]> {
  return db
    .select({ ...accountSelection, balance: accountBalanceExpression() })
    .from(schema.financialAccount)
    .where(and(eq(schema.financialAccount.userId, userId), ...(includeArchived ? [] : [isNull(schema.financialAccount.archivedAt)])))
    .orderBy(asc(schema.financialAccount.name));
}

export async function archiveAccount<T extends PgQueryResultHKT>(db: AccountsDatabase<T>, userId: string, accountId: string) {
  const [account] = await db.update(schema.financialAccount).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(schema.financialAccount.id, accountId), eq(schema.financialAccount.userId, userId), isNull(schema.financialAccount.archivedAt))).returning(accountSelection); return account;
}

export async function unarchiveAccount<T extends PgQueryResultHKT>(db: AccountsDatabase<T>, userId: string, accountId: string) {
  const [account] = await db.update(schema.financialAccount).set({ archivedAt: null, updatedAt: new Date() }).where(and(eq(schema.financialAccount.id, accountId), eq(schema.financialAccount.userId, userId), isNotNull(schema.financialAccount.archivedAt))).returning(accountSelection);
  return account;
}

export async function createAccount<T extends PgQueryResultHKT>(
  db: AccountsDatabase<T>,
  userId: string,
  input: { name: string; kind: AccountKind; currency: AccountCurrency; openingBalance: string; openingDate: string },
): Promise<AccountView> {
  const [account] = await db
    .insert(schema.financialAccount)
    .values({ id: crypto.randomUUID(), userId, ...input })
    .returning(accountSelection);
  return { ...account, balance: account.openingBalance };
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
