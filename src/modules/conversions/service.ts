import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import {
  displayEffectiveRate,
  type ConversionDetail,
  type ConversionInput,
} from "./domain";

type ReferenceError =
  | "SOURCE_ACCOUNT_NOT_FOUND"
  | "DESTINATION_ACCOUNT_NOT_FOUND"
  | "ACCOUNT_CURRENCY_MISMATCH";

export async function validateConversionReferences<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: ConversionInput,
): Promise<{ ok: true } | { ok: false; error: ReferenceError }> {
  const accounts = await db
    .select({
      id: schema.financialAccount.id,
      currency: schema.financialAccount.currency,
    })
    .from(schema.financialAccount)
    .where(eq(schema.financialAccount.userId, userId));
  const source = accounts.find(
    (account) => account.id === input.sourceAccountId,
  );
  if (!source) return { ok: false, error: "SOURCE_ACCOUNT_NOT_FOUND" };
  const destination = accounts.find(
    (account) => account.id === input.destinationAccountId,
  );
  if (!destination)
    return { ok: false, error: "DESTINATION_ACCOUNT_NOT_FOUND" };
  if (
    source.currency !== input.sourceCurrency ||
    destination.currency !== input.destinationCurrency
  ) {
    return { ok: false, error: "ACCOUNT_CURRENCY_MISMATCH" };
  }
  return { ok: true };
}

export async function getConversionDetail<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  conversionId: string,
): Promise<ConversionDetail | undefined> {
  const [row] = await db
    .select({
      id: schema.currencyConversion.id,
      operationDate: schema.currencyConversion.operationDate,
      title: schema.currencyConversion.title,
      note: schema.currencyConversion.note,
      sourceAccountId: schema.currencyConversion.sourceAccountId,
      destinationAccountId: schema.currencyConversion.destinationAccountId,
      sourceAmount: schema.currencyConversion.sourceAmount,
      destinationAmount: schema.currencyConversion.destinationAmount,
      sourceCurrency: schema.currencyConversion.sourceCurrency,
      destinationCurrency: schema.currencyConversion.destinationCurrency,
      effectiveRate: schema.currencyConversion.effectiveRate,
      institutionKind: schema.currencyConversion.institutionKind,
      institutionName: schema.currencyConversion.institutionName,
      sourceType: schema.sourceEvent.sourceType,
      receivedAt: schema.sourceEvent.receivedAt,
      original: schema.sourceEvent.originalPayload,
    })
    .from(schema.currencyConversion)
    .innerJoin(
      schema.sourceEvent,
      eq(schema.sourceEvent.id, schema.currencyConversion.sourceEventId),
    )
    .where(
      and(
        eq(schema.currencyConversion.id, conversionId),
        eq(schema.currencyConversion.userId, userId),
        eq(schema.sourceEvent.userId, userId),
      ),
    );
  if (!row) return undefined;
  const accounts = await db
    .select({
      id: schema.financialAccount.id,
      name: schema.financialAccount.name,
      currency: schema.financialAccount.currency,
    })
    .from(schema.financialAccount)
    .where(eq(schema.financialAccount.userId, userId));
  const sourceAccount = accounts.find(
    (account) => account.id === row.sourceAccountId,
  );
  const destinationAccount = accounts.find(
    (account) => account.id === row.destinationAccountId,
  );
  if (!sourceAccount || !destinationAccount) return undefined;
  return {
    id: row.id,
    operationDate: row.operationDate,
    title: row.title,
    note: row.note,
    source: {
      account: sourceAccount,
      amount: row.sourceAmount,
      currency: row.sourceCurrency,
    },
    destination: {
      account: destinationAccount,
      amount: row.destinationAmount,
      currency: row.destinationCurrency,
    },
    effectiveRate: row.effectiveRate,
    effectiveRateDisplay: displayEffectiveRate(row.effectiveRate),
    institution:
      row.institutionKind && row.institutionName
        ? { kind: row.institutionKind, name: row.institutionName }
        : null,
    evidence: {
      type: row.sourceType,
      receivedAt: row.receivedAt,
      original: row.original,
    },
  };
}

export async function registerManualConversion<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: ConversionInput,
  original: Record<string, unknown>,
) {
  const references = await validateConversionReferences(db, userId, input);
  if (!references.ok) return references;
  const sourceEventId = crypto.randomUUID();
  const conversionId = crypto.randomUUID();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.sourceEvent).values({
      id: sourceEventId,
      userId,
      sourceType: "manual",
      originalPayload: original,
    });
    await transaction.insert(schema.currencyConversion).values({
      id: conversionId,
      userId,
      sourceEventId,
      ...input,
    });
  });
  const conversion = await getConversionDetail(db, userId, conversionId);
  if (!conversion) throw new Error("Registered conversion is unavailable");
  return { ok: true as const, conversion };
}
