export function normalizeMoneyAmount(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const input = value.trim();
  const normalized = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(input) ? input.replaceAll(".", "").replace(",", ".")
    : /^\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(input) ? input.replaceAll(",", "") : input;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) return undefined;
  const [rawWhole, rawFraction = ""] = normalized.split(/[.,]/);
  const whole = rawWhole.replace(/^0+(?=\d)/, "");
  const fraction = rawFraction.padEnd(2, "0");
  if (whole.length > 16 || (/^0+$/.test(whole) && /^0*$/.test(fraction))) return undefined;
  return `${whole}.${fraction}`;
}

export function parseMoneyCents(value: string): bigint {
  const normalized = normalizeMoneyAmount(value);
  if (!normalized) throw new Error("Invalid positive money amount");
  return BigInt(normalized.replace(".", ""));
}

export function parseBalanceCents(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("Invalid balance amount");
  const cents = BigInt(match[2]!) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("Invalid decimal denominator");
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return sign * ((absolute * 2n + denominator) / (2n * denominator));
}

export function formatScaledInteger(value: bigint, scale: number): string {
  const sign = value < 0n ? "-" : "";
  const digits = (value < 0n ? -value : value).toString().padStart(scale + 1, "0");
  return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
