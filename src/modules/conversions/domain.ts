import type { AccountCurrency } from "@/modules/accounts/domain";
import { normalizeMoneyAmount } from "@/modules/expenses/domain";

function parseCents(value: string): bigint {
  const normalized = normalizeMoneyAmount(value);
  if (!normalized) throw new Error("Invalid decimal amount");
  return BigInt(normalized.replace(".", ""));
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error("Invalid decimal operation");
  }
  return (numerator * 2n + denominator) / (denominator * 2n);
}

function formatFixed(value: bigint, scale: number): string {
  const digits = value.toString().padStart(scale + 1, "0");
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

function parseRate(value: string): bigint {
  if (!/^\d+\.\d{12}$/.test(value)) throw new Error("Invalid effective rate");
  const parsed = BigInt(value.replace(".", ""));
  if (parsed <= 0n) throw new Error("Invalid effective rate");
  return parsed;
}

export function calculateDestinationAmount(
  sourceCurrency: AccountCurrency,
  sourceAmount: string,
  quote: string,
): string {
  const sourceCents = parseCents(sourceAmount);
  const quoteHundredths = parseCents(quote);
  const destinationCents =
    sourceCurrency === "USD"
      ? roundHalfUp(sourceCents * quoteHundredths, 100n)
      : roundHalfUp(sourceCents * 100n, quoteHundredths);
  if (destinationCents <= 0n) throw new Error("Invalid destination amount");
  return formatFixed(destinationCents, 2);
}

export function calculateEffectiveRate(
  sourceCurrency: AccountCurrency,
  sourceAmount: string,
  destinationCurrency: AccountCurrency,
  destinationAmount: string,
): string {
  if (sourceCurrency === destinationCurrency) {
    throw new Error("A conversion requires different currencies");
  }
  const sourceCents = parseCents(sourceAmount);
  const destinationCents = parseCents(destinationAmount);
  const usdCents = sourceCurrency === "USD" ? sourceCents : destinationCents;
  const uyuCents = sourceCurrency === "UYU" ? sourceCents : destinationCents;
  const scaledRate = roundHalfUp(uyuCents * 10n ** 12n, usdCents);
  return formatFixed(scaledRate, 12);
}

export function displayEffectiveRate(rate: string): string {
  const hundredths = roundHalfUp(parseRate(rate), 10n ** 10n);
  return `1 USD = ${formatFixed(hundredths, 2).replace(".", ",")} UYU`;
}
