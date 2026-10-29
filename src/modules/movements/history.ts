import { and, eq, gte, inArray, isNull, isNotNull, lte, or } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import type { AccountCurrency } from "@/modules/accounts/domain";
import type { ExpensesDatabase } from "@/modules/expenses/service";
import { formatScaledInteger, parseBalanceCents } from "@/modules/money/decimal";

export type MovementType = "expense" | "income" | "transfer" | "withdrawal" | "conversion" | "adjustment";
export type MovementStatusFilter = "active" | "voided" | "all";
export type HistoryFilters = {
  month?: string;
  startDate?: string;
  endDate?: string;
  accountId?: string;
  accountIds?: string[];
  categoryId?: string;
  categoryIds?: string[];
  type?: MovementType;
  types?: MovementType[];
  currencies?: AccountCurrency[];
  status?: MovementStatusFilter;
  search?: string;
  includeHouse?: boolean;
  spendingOnly?: boolean;
  includeVoided?: boolean;
};

type MovementBase = { id: string; date: string; operationTime: string | null; title: string; note: string | null; voidedAt: Date | null; createdAt: Date };
type AccountSide = { accountId: string; account: string; amount: string; currency: AccountCurrency };
export type MovementHistoryItem = MovementBase & (
  | { type: "expense"; amount: string; currency: AccountCurrency; accountId: string; account: string; categoryId: string; category: string }
  | { type: "income"; amount: string; currency: AccountCurrency; accountId: string; account: string; categoryId: null; category: null }
  | { type: "transfer" | "withdrawal"; source: AccountSide; destination: AccountSide; categoryId: null; category: null }
  | { type: "conversion"; source: AccountSide; destination: AccountSide; effectiveRate: string; categoryId: null; category: null }
  | { type: "adjustment"; amount: string; currency: AccountCurrency; accountId: string; account: string; direction: "increase" | "decrease"; categoryId: string | null; category: string | null }
);

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

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit" }).format(new Date());
}

function includesStatus(filters: HistoryFilters) {
  return filters.status ?? (filters.includeVoided ? "all" : "active");
}

export async function listMovementHistory<T extends PgQueryResultHKT>(db: ExpensesDatabase<T>, userId: string, filters: HistoryFilters): Promise<MovementHistoryItem[]> {
  const hasDateRange = Boolean(filters.startDate || filters.endDate);
  const month = filters.month ?? currentMonth();
  const startDate = hasDateRange ? filters.startDate : `${month}-01`;
  const endDate = hasDateRange ? filters.endDate : `${month}-31`;
  const accountIds = [...new Set([...(filters.accountIds ?? []), ...(filters.accountId ? [filters.accountId] : [])])];
  const categoryIds = [...new Set([...(filters.categoryIds ?? []), ...(filters.categoryId ? [filters.categoryId] : [])])];
  const types = [...new Set([...(filters.types ?? []), ...(filters.type ? [filters.type] : [])])];
  const status = includesStatus(filters);
  const dateConditions = (column: typeof schema.expense.operationDate | typeof schema.income.operationDate | typeof schema.ownTransfer.operationDate | typeof schema.currencyConversion.operationDate | typeof schema.manualAdjustment.operationDate) => [
    ...(startDate ? [gte(column, startDate)] : []),
    ...(endDate ? [lte(column, endDate)] : []),
  ];
  const statusConditions = (column: typeof schema.expense.voidedAt | typeof schema.income.voidedAt | typeof schema.ownTransfer.voidedAt | typeof schema.currencyConversion.voidedAt | typeof schema.manualAdjustment.voidedAt) => status === "active" ? [isNull(column)] : status === "voided" ? [isNotNull(column)] : [];
  const hasType = (type: MovementType) => !types.length || types.includes(type);
  const hasAnyType = (...candidates: MovementType[]) => !types.length || candidates.some((type) => types.includes(type));

  const expenses = !hasType("expense") ? [] : await db.select({ id: schema.expense.id, date: schema.expense.operationDate, operationTime: schema.expense.operationTime, title: schema.expense.title, note: schema.expense.note, voidedAt: schema.expense.voidedAt, createdAt: schema.expense.createdAt, amount: schema.expense.amount, currency: schema.expense.currency, accountId: schema.financialAccount.id, account: schema.financialAccount.name, categoryId: schema.expenseCategory.id, category: schema.expenseCategory.name, systemKey: schema.expenseCategory.systemKey }).from(schema.expense).innerJoin(schema.financialAccount, eq(schema.financialAccount.id, schema.expense.accountId)).innerJoin(schema.expenseCategory, eq(schema.expenseCategory.id, schema.expense.categoryId)).where(and(eq(schema.expense.userId, userId), eq(schema.financialAccount.userId, userId), eq(schema.expenseCategory.userId, userId), ...dateConditions(schema.expense.operationDate), ...(accountIds.length ? [inArray(schema.expense.accountId, accountIds)] : []), ...(categoryIds.length ? [inArray(schema.expense.categoryId, categoryIds)] : []), ...statusConditions(schema.expense.voidedAt)));
  const incomes = !hasType("income") || categoryIds.length ? [] : await db.select({ id: schema.income.id, date: schema.income.operationDate, operationTime: schema.income.operationTime, title: schema.income.title, note: schema.income.note, voidedAt: schema.income.voidedAt, createdAt: schema.income.createdAt, amount: schema.income.amount, currency: schema.income.currency, accountId: schema.financialAccount.id, account: schema.financialAccount.name }).from(schema.income).innerJoin(schema.financialAccount, eq(schema.financialAccount.id, schema.income.accountId)).where(and(eq(schema.income.userId, userId), eq(schema.financialAccount.userId, userId), ...dateConditions(schema.income.operationDate), ...(accountIds.length ? [inArray(schema.income.accountId, accountIds)] : []), ...statusConditions(schema.income.voidedAt)));
  const transferKinds: ("transfer" | "withdrawal")[] = types.length ? types.filter((type): type is "transfer" | "withdrawal" => type === "transfer" || type === "withdrawal") : ["transfer", "withdrawal"];
  const transfers = !hasAnyType("transfer", "withdrawal") || categoryIds.length ? [] : await db.select({ id: schema.ownTransfer.id, date: schema.ownTransfer.operationDate, title: schema.ownTransfer.title, note: schema.ownTransfer.note, voidedAt: schema.ownTransfer.voidedAt, createdAt: schema.ownTransfer.createdAt, kind: schema.ownTransfer.kind, sourceAccountId: schema.ownTransfer.sourceAccountId, destinationAccountId: schema.ownTransfer.destinationAccountId, sourceAmount: schema.ownTransfer.sourceAmount, destinationAmount: schema.ownTransfer.destinationAmount, currency: schema.ownTransfer.currency }).from(schema.ownTransfer).where(and(eq(schema.ownTransfer.userId, userId), ...dateConditions(schema.ownTransfer.operationDate), ...(transferKinds.length ? [inArray(schema.ownTransfer.kind, transferKinds)] : []), ...(accountIds.length ? [or(...accountIds.flatMap((id) => [eq(schema.ownTransfer.sourceAccountId, id), eq(schema.ownTransfer.destinationAccountId, id)]))] : []), ...statusConditions(schema.ownTransfer.voidedAt)));
  const conversions = !hasType("conversion") || categoryIds.length ? [] : await db.select({ id: schema.currencyConversion.id, date: schema.currencyConversion.operationDate, title: schema.currencyConversion.title, note: schema.currencyConversion.note, voidedAt: schema.currencyConversion.voidedAt, createdAt: schema.currencyConversion.createdAt, sourceAccountId: schema.currencyConversion.sourceAccountId, destinationAccountId: schema.currencyConversion.destinationAccountId, sourceAmount: schema.currencyConversion.sourceAmount, destinationAmount: schema.currencyConversion.destinationAmount, sourceCurrency: schema.currencyConversion.sourceCurrency, destinationCurrency: schema.currencyConversion.destinationCurrency, effectiveRate: schema.currencyConversion.effectiveRate }).from(schema.currencyConversion).where(and(eq(schema.currencyConversion.userId, userId), ...dateConditions(schema.currencyConversion.operationDate), ...(accountIds.length ? [or(...accountIds.flatMap((id) => [eq(schema.currencyConversion.sourceAccountId, id), eq(schema.currencyConversion.destinationAccountId, id)]))] : []), ...statusConditions(schema.currencyConversion.voidedAt)));
  const adjustments = !hasType("adjustment") ? [] : await db.select({ id: schema.manualAdjustment.id, date: schema.manualAdjustment.operationDate, title: schema.manualAdjustment.title, note: schema.manualAdjustment.note, voidedAt: schema.manualAdjustment.voidedAt, createdAt: schema.manualAdjustment.createdAt, amount: schema.manualAdjustment.amount, direction: schema.manualAdjustment.direction, accountId: schema.financialAccount.id, account: schema.financialAccount.name, currency: schema.financialAccount.currency, categoryId: schema.expenseCategory.id, category: schema.expenseCategory.name, systemKey: schema.expenseCategory.systemKey }).from(schema.manualAdjustment).innerJoin(schema.financialAccount, eq(schema.financialAccount.id, schema.manualAdjustment.accountId)).leftJoin(schema.expenseCategory, eq(schema.expenseCategory.id, schema.manualAdjustment.categoryId)).where(and(eq(schema.manualAdjustment.userId, userId), eq(schema.financialAccount.userId, userId), or(isNull(schema.manualAdjustment.categoryId), eq(schema.expenseCategory.userId, userId)), ...dateConditions(schema.manualAdjustment.operationDate), ...(accountIds.length ? [inArray(schema.manualAdjustment.accountId, accountIds)] : []), ...(categoryIds.length ? [inArray(schema.manualAdjustment.categoryId, categoryIds)] : []), ...statusConditions(schema.manualAdjustment.voidedAt)));

  const accountIdsInRows = new Set<string>();
  for (const row of [...transfers, ...conversions]) { accountIdsInRows.add(row.sourceAccountId); accountIdsInRows.add(row.destinationAccountId); }
  const accounts = accountIdsInRows.size ? await db.select({ id: schema.financialAccount.id, name: schema.financialAccount.name }).from(schema.financialAccount).where(and(eq(schema.financialAccount.userId, userId), inArray(schema.financialAccount.id, [...accountIdsInRows]))) : [];
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const sides = (sourceId: string, sourceAmount: string, sourceCurrency: AccountCurrency, destinationId: string, destinationAmount: string, destinationCurrency: AccountCurrency) => {
    const source = accountById.get(sourceId); const destination = accountById.get(destinationId);
    if (!source || !destination) return undefined;
    return { source: { accountId: source.id, account: source.name, amount: sourceAmount, currency: sourceCurrency }, destination: { accountId: destination.id, account: destination.name, amount: destinationAmount, currency: destinationCurrency } };
  };
  const selectedHouseCategory = categoryIds.length > 0;
  let movementRows: MovementHistoryItem[] = [
    ...expenses.filter((item) => filters.includeHouse || selectedHouseCategory || item.systemKey !== "house_construction").map((item) => ({ id: item.id, date: item.date, operationTime: item.operationTime, title: item.title, note: item.note, voidedAt: item.voidedAt, createdAt: item.createdAt, amount: item.amount, currency: item.currency, accountId: item.accountId, account: item.account, categoryId: item.categoryId, category: item.category, type: "expense" as const })),
    ...incomes.map((item) => ({ ...item, type: "income" as const, categoryId: null, category: null })),
    ...transfers.flatMap((item) => { const transferSides = sides(item.sourceAccountId, item.sourceAmount, item.currency, item.destinationAccountId, item.destinationAmount, item.currency); return transferSides ? [{ id: item.id, date: item.date, operationTime: null, title: item.title, note: item.note, voidedAt: item.voidedAt, createdAt: item.createdAt, type: item.kind, ...transferSides, categoryId: null, category: null } satisfies MovementHistoryItem] : []; }),
    ...conversions.flatMap((item) => { const conversionSides = sides(item.sourceAccountId, item.sourceAmount, item.sourceCurrency, item.destinationAccountId, item.destinationAmount, item.destinationCurrency); return conversionSides ? [{ id: item.id, date: item.date, operationTime: null, title: item.title, note: item.note, voidedAt: item.voidedAt, createdAt: item.createdAt, type: "conversion" as const, ...conversionSides, effectiveRate: item.effectiveRate, categoryId: null, category: null } satisfies MovementHistoryItem] : []; }),
    ...adjustments.filter((item) => filters.includeHouse || selectedHouseCategory || item.systemKey !== "house_construction").map((item) => ({ ...item, operationTime: null, type: "adjustment" as const })),
  ];
  const selectedCurrencies = new Set(filters.currencies ?? []);
  if (selectedCurrencies.size) movementRows = movementRows.filter((item) => {
    let currencies: AccountCurrency[];
    if ("source" in item) currencies = [item.source.currency, item.destination.currency];
    else currencies = [item.currency];
    return currencies.some((currency) => selectedCurrencies.has(currency));
  });
  const search = filters.search?.trim().toLocaleLowerCase("es-UY");
  if (search) movementRows = movementRows.filter((item) => `${item.title} ${item.note ?? ""}`.toLocaleLowerCase("es-UY").includes(search));
  if (filters.spendingOnly) movementRows = movementRows.filter((item) => item.type === "expense" || (item.type === "adjustment" && item.direction === "decrease"));
  return movementRows.sort((a, b) => b.date.localeCompare(a.date) || (b.operationTime ?? "").localeCompare(a.operationTime ?? "") || b.createdAt.getTime() - a.createdAt.getTime());
}
