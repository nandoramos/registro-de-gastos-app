import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { createPendingEntry } from "@/modules/pending-entries/service";
import { analyzeConversion } from "./domain";
import { registerManualConversion } from "./service";

export async function ingestManualConversion<T extends PgQueryResultHKT>(
  db: ExpensesDatabase<T>,
  userId: string,
  original: Record<string, unknown>,
) {
  const analysis = analyzeConversion(original);
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
  const registered = await registerManualConversion(
    db,
    userId,
    analysis.conversion,
    original,
  );
  return registered.ok
    ? { kind: "registered" as const, conversion: registered.conversion }
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
