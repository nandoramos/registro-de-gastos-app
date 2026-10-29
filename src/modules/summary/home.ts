import type { AccountCurrency } from "@/modules/accounts/domain";

export type CurrencyTotal = { currency: AccountCurrency; amount: string };

export function completeHomeExpenseTotals(totals: readonly { currency: string; amount: string }[]): CurrencyTotal[] {
  const amounts = new Map(totals.map(({ currency, amount }) => [currency, amount]));
  return (["UYU", "USD"] as const).map((currency) => ({
    currency,
    amount: amounts.get(currency) ?? "0.00",
  }));
}

export function montevideoMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export function montevideoHour(date: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date));
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Buen día, Totei";
  if (hour >= 12 && hour < 20) return "Buenas tardes, Totei";
  return "Buenas noches, Totei";
}
