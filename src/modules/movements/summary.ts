import type { MovementHistoryItem } from "./history";
import type { AccountCurrency } from "@/modules/accounts/domain";
import { formatScaledInteger, parseBalanceCents } from "@/modules/money/decimal";

export function summarizeMovementHistory(movements: MovementHistoryItem[]) {
  const expenses = new Map<AccountCurrency, bigint>();
  const income = new Map<AccountCurrency, bigint>();
  for (const movement of movements) {
    if (movement.voidedAt) continue;
    if (movement.type === "expense") expenses.set(movement.currency, (expenses.get(movement.currency) ?? 0n) + parseBalanceCents(movement.amount));
    else if (movement.type === "income") income.set(movement.currency, (income.get(movement.currency) ?? 0n) + parseBalanceCents(movement.amount));
    else if (movement.type === "adjustment") {
      const target = movement.direction === "decrease" ? expenses : income;
      target.set(movement.currency, (target.get(movement.currency) ?? 0n) + parseBalanceCents(movement.amount));
    }
  }
  const amounts = (values: Map<AccountCurrency, bigint>) => [...values].sort(([a], [b]) => a.localeCompare(b)).map(([currency, cents]) => ({ currency, amount: formatScaledInteger(cents, 2) }));
  return { expenses: amounts(expenses), income: amounts(income) };
}
