const amountPattern = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export function formatMoneyAmount(currency: string, amount: string): string {
  if (currency !== "UYU" && currency !== "USD") {
    throw new RangeError("Unsupported currency for display");
  }

  const match = amountPattern.exec(amount);
  if (!match) throw new RangeError("Invalid amount for display");

  const fraction = (match[3] ?? "").padEnd(2, "0");
  const whole = match[2]!.replace(/^0+(?=\d)/, "");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const isZero = /^0+$/.test(whole) && /^0+$/.test(fraction);
  const sign = match[1] === "-" && !isZero ? "-" : "";
  const prefix = currency === "UYU" ? "$" : "U$S ";

  return `${sign}${prefix}${groupedWhole},${fraction}`;
}
