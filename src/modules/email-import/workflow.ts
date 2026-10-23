import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import {
  registerExpense,
  type ExpensesDatabase,
} from "@/modules/expenses/service";
import { analyzePendingExpense } from "@/modules/pending-entries/domain";
import { createPendingEntry } from "@/modules/pending-entries/service";
import { analyzeTransfer } from "@/modules/transfers/domain";
import { parseItauEmailText } from "./itau-parser";
import { listAccounts } from "@/modules/accounts/service";
import { suggestAccountFromCurrency } from "./account-assignment";

export type EmailCandidateInput = {
  text: string;
  accountId?: string;
  categoryId?: string;
  nature?: "expense" | "own-transfer";
};

const parserIssueMap: Record<string, string> = {
  MISSING_DATE: "INVALID_DATE",
  INVALID_DATE: "INVALID_DATE",
  INVALID_TIME: "INVALID_TIME",
  MISSING_MERCHANT: "INVALID_TITLE",
  MISSING_RECIPIENT: "INVALID_TITLE",
  MISSING_AMOUNT: "INVALID_AMOUNT",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  AMBIGUOUS_CURRENCY: "INVALID_CURRENCY",
};

function parserIssues(issues: string[]): string[] {
  return issues
    .filter((issue) => issue !== "FINANCIAL_NATURE_REQUIRED")
    .map((issue) => parserIssueMap[issue] ?? issue);
}

export async function ingestEmailCandidate<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  input: EmailCandidateInput,
) {
  const original = { text: input.text };
  const parsed = parseItauEmailText(input.text);
  const accounts = await listAccounts(db, userId);
  const suggestion = suggestAccountFromCurrency(
    accounts,
    parsed.fields.currency,
  );
  const accountId =
    input.accountId ||
    (suggestion.status === "assigned" ? suggestion.account.id : undefined);

  if (parsed.kind === "bank-transfer" && !input.nature) {
    return {
      kind: "pending" as const,
      entry: await createPendingEntry(
        db,
        userId,
        original,
        {
          entryType: "email-transfer-choice",
          operationDate: parsed.fields.operationDate,
          operationTime: parsed.fields.operationTime,
          title: parsed.fields.recipient,
          amount: parsed.fields.amount,
          currency: parsed.fields.currency,
          accountId,
        },
        ["FINANCIAL_NATURE_REQUIRED", ...parserIssues(parsed.issues)],
        "email",
      ),
    };
  }

  if (parsed.kind === "bank-transfer" && input.nature === "own-transfer") {
    const candidate = {
      entryType: "own-transfer",
      kind: "transfer",
      operationDate: parsed.fields.operationDate,
      operationTime: parsed.fields.operationTime,
      title: parsed.fields.recipient,
      note: "",
      sourceAccountId: accountId,
      destinationAccountId: "",
      sourceAmount: parsed.fields.amount,
      destinationAmount: "",
      currency: parsed.fields.currency,
    };
    const analysis = analyzeTransfer(candidate);
    return {
      kind: "pending" as const,
      entry: await createPendingEntry(
        db,
        userId,
        original,
        analysis.interpretation,
        [
          ...new Set([
            ...(analysis.complete ? [] : analysis.issues),
            ...parserIssues(parsed.issues),
          ]),
        ],
        "email",
      ),
    };
  }

  const candidate = {
    operationDate: parsed.fields.operationDate,
    operationTime: parsed.fields.operationTime,
    title:
      parsed.kind === "expense" ? parsed.fields.title : parsed.fields.recipient,
    note: "",
    accountId,
    categoryId: input.categoryId,
    amount: parsed.fields.amount,
    currency: parsed.fields.currency,
  };
  const analysis = analyzePendingExpense(candidate);
  const issues = [
    ...new Set([
      ...(analysis.complete ? [] : analysis.issues),
      ...parserIssues(parsed.issues),
    ]),
  ];
  if (!analysis.complete || issues.length > 0) {
    return {
      kind: "pending" as const,
      entry: await createPendingEntry(
        db,
        userId,
        original,
        analysis.interpretation,
        issues,
        "email",
      ),
    };
  }

  const registered = await registerExpense(
    db,
    userId,
    analysis.expense,
    original,
    "email",
  );
  if (registered.ok) {
    return { kind: "registered" as const, expense: registered.expense };
  }
  return {
    kind: "pending" as const,
    entry: await createPendingEntry(
      db,
      userId,
      original,
      analysis.interpretation,
      [registered.error],
      "email",
    ),
  };
}
