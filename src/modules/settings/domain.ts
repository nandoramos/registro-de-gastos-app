import type { AccountCurrency } from "@/modules/accounts/domain";
import { formatScaledInteger, normalizeMoneyAmount, parseBalanceCents, parseMoneyCents, roundHalfUp } from "@/modules/money/decimal";

export const DEFAULT_QUOTE_SETTINGS = {
  buyRate: "40.00",
  sellRate: "40.00",
} as const;

export type QuoteSettings = {
  buyRate: string;
  sellRate: string;
};

export function validateQuoteSettings(input: Record<string, unknown>) {
  const buyRate = normalizeMoneyAmount(input.buyRate);
  const sellRate = normalizeMoneyAmount(input.sellRate);
  const errors: string[] = [];
  if (!buyRate) errors.push("INVALID_BUY_RATE");
  if (!sellRate) errors.push("INVALID_SELL_RATE");
  if (!buyRate || !sellRate) return { ok: false as const, errors };
  return {
    ok: true as const,
    value: {
      buyRate,
      sellRate,
      sellBelowBuy: parseMoneyCents(sellRate) < parseMoneyCents(buyRate),
    },
  };
}

export function quoteForConversion(
  sourceCurrency: AccountCurrency,
  destinationCurrency: AccountCurrency,
  settings: QuoteSettings,
): string | undefined {
  if (sourceCurrency === "USD" && destinationCurrency === "UYU") {
    return settings.buyRate;
  }
  if (sourceCurrency === "UYU" && destinationCurrency === "USD") {
    return settings.sellRate;
  }
  return undefined;
}

export function calculateEstimatedUsdTotal(
  totalUyu: string,
  totalUsd: string,
  sellRate: string,
): string {
  const quoteCents = parseMoneyCents(sellRate);
  const totalCents = parseBalanceCents(totalUsd) + roundHalfUp(parseBalanceCents(totalUyu) * 100n, quoteCents);
  return formatScaledInteger(totalCents, 2);
}
