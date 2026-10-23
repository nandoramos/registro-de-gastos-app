export type EmailInterpretationKind = "expense" | "bank-transfer" | "unknown";

export type EmailInterpretationFields = {
  operationDate?: string;
  operationTime?: string;
  title?: string;
  recipient?: string;
  amount?: string;
  currency?: "UYU" | "USD";
};

export type EmailInterpretation = {
  format:
    | "synthetic-itau-debit-purchase-v1"
    | "synthetic-itau-transfer-v1"
    | "unknown";
  kind: EmailInterpretationKind;
  fields: EmailInterpretationFields;
  issues: string[];
};

function field(lines: string[], label: string): string | undefined {
  const prefix = `${label.toLocaleLowerCase("es-UY")}:`;
  const line = lines.find((candidate) =>
    candidate.toLocaleLowerCase("es-UY").startsWith(prefix),
  );
  const value = line?.slice(line.indexOf(":") + 1).trim();
  return value || undefined;
}

function parseDate(value: string | undefined): string | undefined {
  const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return undefined;
  }
  return `${year}-${month}-${day}`;
}

function parseTime(value: string | undefined): string | undefined {
  if (!value || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined;
  return value;
}

function parseAmount(raw: string | undefined) {
  if (!raw)
    return { amount: undefined, currency: undefined, issue: "MISSING_AMOUNT" };
  const match = raw.match(/^(UYU|USD|\$)\s+(.+)$/i);
  if (!match)
    return { amount: undefined, currency: undefined, issue: "INVALID_AMOUNT" };
  const value = match[2];
  if (!/^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/.test(value)) {
    return { amount: undefined, currency: undefined, issue: "INVALID_AMOUNT" };
  }
  const amount = value.replaceAll(".", "").replace(",", ".");
  const [integer, decimals = ""] = amount.split(".");
  const normalized = `${integer}.${decimals.padEnd(2, "0")}`;
  if (BigInt(integer) === 0n && Number(decimals.padEnd(2, "0")) === 0) {
    return { amount: undefined, currency: undefined, issue: "INVALID_AMOUNT" };
  }
  const marker = match[1].toUpperCase();
  return marker === "$"
    ? { amount: normalized, currency: undefined, issue: "AMBIGUOUS_CURRENCY" }
    : {
        amount: normalized,
        currency: marker as "UYU" | "USD",
        issue: undefined,
      };
}

export function parseItauEmailText(text: string): EmailInterpretation {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const normalized = new Set(
    lines.map((line) => line.toLocaleUpperCase("es-UY")),
  );
  const isPurchase =
    normalized.has("ITAÚ") && normalized.has("COMPRA CON DÉBITO");
  const isTransfer = normalized.has("ITAÚ") && normalized.has("TRANSFERENCIA");
  if (!isPurchase && !isTransfer) {
    return {
      format: "unknown",
      kind: "unknown",
      fields: {},
      issues: ["UNSUPPORTED_FORMAT"],
    };
  }

  const fields: EmailInterpretationFields = {};
  const issues: string[] = [];
  const rawDate = field(lines, "Fecha");
  const operationDate = parseDate(rawDate);
  if (operationDate) fields.operationDate = operationDate;
  else issues.push(rawDate ? "INVALID_DATE" : "MISSING_DATE");

  const rawTime = field(lines, "Hora");
  if (rawTime) {
    const operationTime = parseTime(rawTime);
    if (operationTime) fields.operationTime = operationTime;
    else issues.push("INVALID_TIME");
  }

  if (isPurchase) {
    const title = field(lines, "Comercio");
    if (title) fields.title = title;
    else issues.push("MISSING_MERCHANT");
  } else {
    const recipient = field(lines, "Destinatario");
    if (recipient) fields.recipient = recipient;
    else issues.push("MISSING_RECIPIENT");
  }

  const parsedAmount = parseAmount(field(lines, "Importe debitado"));
  if (parsedAmount.amount) fields.amount = parsedAmount.amount;
  if (parsedAmount.currency) fields.currency = parsedAmount.currency;
  if (parsedAmount.issue) issues.push(parsedAmount.issue);
  if (isTransfer) issues.push("FINANCIAL_NATURE_REQUIRED");

  return {
    format: isPurchase
      ? "synthetic-itau-debit-purchase-v1"
      : "synthetic-itau-transfer-v1",
    kind: isPurchase ? "expense" : "bank-transfer",
    fields,
    issues,
  };
}

const labels: Record<string, string> = {
  UNSUPPORTED_FORMAT: "El texto no coincide con un formato cubierto.",
  MISSING_DATE: "Falta la fecha de la operación.",
  INVALID_DATE: "La fecha no tiene un formato válido.",
  INVALID_TIME: "La hora no tiene un formato válido.",
  MISSING_MERCHANT: "Falta el comercio.",
  MISSING_RECIPIENT: "Falta el destinatario.",
  MISSING_AMOUNT: "Falta el importe debitado.",
  INVALID_AMOUNT: "El importe debitado no tiene un formato válido.",
  AMBIGUOUS_CURRENCY: "El símbolo $ no permite identificar UYU o USD.",
  FINANCIAL_NATURE_REQUIRED:
    "Hay que decidir si la transferencia es un gasto o un traslado propio.",
};

export function emailInterpretationIssueLabel(issue: string): string {
  return labels[issue] ?? issue;
}
