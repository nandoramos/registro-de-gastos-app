import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import type { TransferDetail, TransferInput } from "./domain";

type ReferenceError =
  | "SOURCE_ACCOUNT_NOT_FOUND"
  | "DESTINATION_ACCOUNT_NOT_FOUND"
  | "DIFFERENT_ACCOUNT_CURRENCIES"
  | "ACCOUNT_CURRENCY_MISMATCH"
  | "INVALID_WITHDRAWAL_ACCOUNTS"
  | "TRANSFER_KIND_MISMATCH";

export async function validateTransferReferences<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: TransferInput,
): Promise<{ ok: true } | { ok: false; error: ReferenceError }> {
  const accounts = await db
    .select({
      id: schema.financialAccount.id,
      kind: schema.financialAccount.kind,
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
  if (!destination) {
    return { ok: false, error: "DESTINATION_ACCOUNT_NOT_FOUND" };
  }
  if (source.currency !== destination.currency) {
    return { ok: false, error: "DIFFERENT_ACCOUNT_CURRENCIES" };
  }
  if (
    source.currency !== input.currency ||
    destination.currency !== input.currency
  ) {
    return { ok: false, error: "ACCOUNT_CURRENCY_MISMATCH" };
  }
  if (
    input.kind === "withdrawal" &&
    (source.kind !== "bank" || destination.kind !== "cash")
  ) {
    return { ok: false, error: "INVALID_WITHDRAWAL_ACCOUNTS" };
  }
  if (
    input.kind === "transfer" &&
    source.kind === "bank" &&
    destination.kind === "cash"
  ) {
    return { ok: false, error: "TRANSFER_KIND_MISMATCH" };
  }
  return { ok: true };
}

export async function getTransferDetail<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  transferId: string,
): Promise<TransferDetail | undefined> {
  const [row] = await db
    .select({
      id: schema.ownTransfer.id,
      kind: schema.ownTransfer.kind,
      operationDate: schema.ownTransfer.operationDate,
      title: schema.ownTransfer.title,
      note: schema.ownTransfer.note,
      sourceAccountId: schema.ownTransfer.sourceAccountId,
      destinationAccountId: schema.ownTransfer.destinationAccountId,
      sourceAmount: schema.ownTransfer.sourceAmount,
      destinationAmount: schema.ownTransfer.destinationAmount,
      currency: schema.ownTransfer.currency,
      sourceType: schema.sourceEvent.sourceType,
      receivedAt: schema.sourceEvent.receivedAt,
      original: schema.sourceEvent.originalPayload,
    })
    .from(schema.ownTransfer)
    .innerJoin(
      schema.sourceEvent,
      eq(schema.sourceEvent.id, schema.ownTransfer.sourceEventId),
    )
    .where(
      and(
        eq(schema.ownTransfer.id, transferId),
        eq(schema.ownTransfer.userId, userId),
        eq(schema.sourceEvent.userId, userId),
      ),
    );
  if (!row) return undefined;
  const accounts = await db
    .select({
      id: schema.financialAccount.id,
      name: schema.financialAccount.name,
      kind: schema.financialAccount.kind,
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
    kind: row.kind,
    operationDate: row.operationDate,
    title: row.title,
    note: row.note,
    source: {
      account: sourceAccount,
      amount: row.sourceAmount,
      currency: row.currency,
    },
    destination: {
      account: destinationAccount,
      amount: row.destinationAmount,
      currency: row.currency,
    },
    evidence: {
      type: row.sourceType,
      receivedAt: row.receivedAt,
      original: row.original,
    },
  };
}

export async function registerManualTransfer<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: TransferInput,
  original: Record<string, unknown>,
): Promise<
  { ok: true; transfer: TransferDetail } | { ok: false; error: ReferenceError }
> {
  const references = await validateTransferReferences(db, userId, input);
  if (!references.ok) return references;
  const sourceEventId = crypto.randomUUID();
  const transferId = crypto.randomUUID();
  await db.transaction(async (transaction) => {
    await transaction.insert(schema.sourceEvent).values({
      id: sourceEventId,
      userId,
      sourceType: "manual",
      originalPayload: original,
    });
    await transaction.insert(schema.ownTransfer).values({
      id: transferId,
      userId,
      sourceEventId,
      ...input,
    });
  });
  const transfer = await getTransferDetail(db, userId, transferId);
  if (!transfer) throw new Error("Registered transfer is unavailable");
  return { ok: true, transfer };
}
