import { and, eq, gte, isNull, lte } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { ExpensesDatabase } from "@/modules/expenses/service";

export async function monthlySummary<T extends PgQueryResultHKT>(db: ExpensesDatabase<T>, userId: string, month: string, includeHouse = false) {
  const rows = await db.select({ amount: schema.expense.amount, currency: schema.expense.currency, category: schema.expenseCategory.name, systemKey: schema.expenseCategory.systemKey }).from(schema.expense).innerJoin(schema.expenseCategory, eq(schema.expenseCategory.id, schema.expense.categoryId)).where(and(eq(schema.expense.userId, userId), gte(schema.expense.operationDate, `${month}-01`), lte(schema.expense.operationDate, `${month}-31`), isNull(schema.expense.voidedAt)));
  const incomeRows = await db.select({ amount: schema.income.amount, currency: schema.income.currency }).from(schema.income).where(and(eq(schema.income.userId, userId), gte(schema.income.operationDate, `${month}-01`), lte(schema.income.operationDate, `${month}-31`), isNull(schema.income.voidedAt)));
  const adjustmentRows = await db.select({ amount: schema.manualAdjustment.amount, direction: schema.manualAdjustment.direction, currency: schema.financialAccount.currency, category: schema.expenseCategory.name }).from(schema.manualAdjustment).innerJoin(schema.financialAccount, eq(schema.financialAccount.id, schema.manualAdjustment.accountId)).leftJoin(schema.expenseCategory, eq(schema.expenseCategory.id, schema.manualAdjustment.categoryId)).where(and(eq(schema.manualAdjustment.userId, userId), gte(schema.manualAdjustment.operationDate, `${month}-01`), lte(schema.manualAdjustment.operationDate, `${month}-31`), isNull(schema.manualAdjustment.voidedAt)));
  const cents = (amount: string) => { const [whole, fraction = ""] = amount.split("."); return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2)); };
  const format = (amount: bigint) => `${amount / 100n}.${(amount % 100n).toString().padStart(2, "0")}`;
  const totals = new Map<string, bigint>(); const incomeTotals = new Map<string, bigint>(); const categories = new Map<string, bigint>();
  for (const row of rows) { if (!includeHouse && row.systemKey === "house_construction") continue; const value = cents(row.amount); totals.set(row.currency, (totals.get(row.currency) ?? 0n) + value); const key = `${row.currency}:${row.category}`; categories.set(key, (categories.get(key) ?? 0n) + value); }
  for (const row of incomeRows) { incomeTotals.set(row.currency, (incomeTotals.get(row.currency) ?? 0n) + cents(row.amount)); }
  for (const row of adjustmentRows) {
    const value = cents(row.amount);
    if (row.direction === "increase") incomeTotals.set(row.currency, (incomeTotals.get(row.currency) ?? 0n) + value);
    else {
      totals.set(row.currency, (totals.get(row.currency) ?? 0n) + value);
      const key = `${row.currency}:${row.category ?? "Ajuste manual"}`;
      categories.set(key, (categories.get(key) ?? 0n) + value);
    }
  }
  return { totals: [...totals].map(([currency, amount]) => ({ currency, amount: format(amount) })), incomeTotals: [...incomeTotals].map(([currency, amount]) => ({ currency, amount: format(amount) })), categories: [...categories].map(([key, amount]) => { const [currency, category] = key.split(":"); return { currency, category, amount: format(amount) }; }) };
}
