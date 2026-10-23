import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { createPendingEntry } from "@/modules/pending-entries/service";
import { analyzeTransfer } from "./domain";
import { registerManualTransfer } from "./service";

export async function ingestManualTransfer<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  original: Record<string, unknown>,
) {
  const analysis = analyzeTransfer(original);
  if (!analysis.complete) {
    return {
      kind: "pending" as const,
      entry: await createPendingEntry(
        db,
        userId,
        original,
        analysis.interpretation,
        analysis.issues,
      ),
    };
  }
  const registered = await registerManualTransfer(
    db,
    userId,
    analysis.transfer,
    original,
  );
  return registered.ok
    ? { kind: "registered" as const, transfer: registered.transfer }
    : {
        kind: "pending" as const,
        entry: await createPendingEntry(
          db,
          userId,
          original,
          analysis.interpretation,
          [registered.error],
        ),
      };
}
