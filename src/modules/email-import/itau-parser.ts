export type EmailInterpretationKind = "expense" | "bank-transfer" | "unknown";

export type EmailInterpretationIssue =
  | "UNSUPPORTED_FORMAT"
  | "CONTRADICTORY_FORMAT"
  | "CONTRADICTORY_FIELD"
  | "MISSING_DATE"
  | "INVALID_DATE"
  | "INVALID_TIME"
  | "MISSING_MERCHANT"
  | "MISSING_RECIPIENT"
  | "MISSING_AMOUNT"
  | "INVALID_AMOUNT"
  | "AMBIGUOUS_CURRENCY"
  | "FINANCIAL_NATURE_REQUIRED";

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
  issues: EmailInterpretationIssue[];
};

type ParsedField =
  | { status: "missing" }
  | { status: "conflict" }
  | { status: "value"; value: string };

function field(lines: string[], label: string): ParsedField {
  const prefix = `${label.toLocaleLowerCase("es-UY")}:`;
  const values = lines
    .filter((candidate) =>
      candidate.toLocaleLowerCase("es-UY").startsWith(prefix),
    )
    .map((line) => line.slice(line.indexOf(":") + 1).trim())
    .filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.length === 0) return { status: "missing" };
  if (unique.length > 1) return { status: "conflict" };
  return { status: "value", value: unique[0] };
}

function parseDate(value: string): string | undefined {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
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

function parseTime(value: string): string | undefined {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined;
}

function parseAmount(raw: string | undefined): {
  amount?: string;
  currency?: "UYU" | "USD";
  issue?: EmailInterpretationIssue;
} {
  if (!raw) return { issue: "MISSING_AMOUNT" };
  const match = raw.match(/^(UYU|USD|\$)\s+(.+)$/i);
  if (!match) return { issue: "INVALID_AMOUNT" };
  const value = match[2];
  if (!/^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/.test(value)) {
    return { issue: "INVALID_AMOUNT" };
  }
  const amount = value.replaceAll(".", "").replace(",", ".");
  const [integer, decimals = ""] = amount.split(".");
  const normalized = `${integer}.${decimals.padEnd(2, "0")}`;
  if (BigInt(integer) === 0n && Number(decimals.padEnd(2, "0")) === 0) {
    return { issue: "INVALID_AMOUNT" };
  }
  const marker = match[1].toUpperCase();
  return marker === "$"
    ? { amount: normalized, issue: "AMBIGUOUS_CURRENCY" }
    : { amount: normalized, currency: marker as "UYU" | "USD" };
}

function addFieldIssue(issues: EmailInterpretationIssue[]) {
  issues.push("CONTRADICTORY_FIELD");
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
  if (isPurchase && isTransfer) {
    return {
      format: "unknown",
      kind: "unknown",
      fields: {},
      issues: ["CONTRADICTORY_FORMAT"],
    };
  }
  if (!isPurchase && !isTransfer) {
    return {
      format: "unknown",
      kind: "unknown",
      fields: {},
      issues: ["UNSUPPORTED_FORMAT"],
    };
  }

  const fields: EmailInterpretationFields = {};
  const issues: EmailInterpretationIssue[] = [];
  const dateField = field(lines, "Fecha");
  if (dateField.status === "conflict") addFieldIssue(issues);
  else if (dateField.status === "missing") issues.push("MISSING_DATE");
  else {
    const operationDate = parseDate(dateField.value);
    if (operationDate) fields.operationDate = operationDate;
    else issues.push("INVALID_DATE");
  }

  const timeField = field(lines, "Hora");
  if (timeField.status === "conflict") addFieldIssue(issues);
  else if (timeField.status === "value") {
    const operationTime = parseTime(timeField.value);
    if (operationTime) fields.operationTime = operationTime;
    else issues.push("INVALID_TIME");
  }

  if (isPurchase) {
    const titleField = field(lines, "Comercio");
    if (titleField.status === "conflict") addFieldIssue(issues);
    else if (titleField.status === "value") fields.title = titleField.value;
    else issues.push("MISSING_MERCHANT");
  } else {
    const recipientField = field(lines, "Destinatario");
    if (recipientField.status === "conflict") addFieldIssue(issues);
    else if (recipientField.status === "value") {
      fields.recipient = recipientField.value;
    } else issues.push("MISSING_RECIPIENT");
  }

  const amountField = field(lines, "Importe debitado");
  if (amountField.status === "conflict") addFieldIssue(issues);
  else {
    const parsedAmount = parseAmount(
      amountField.status === "value" ? amountField.value : undefined,
    );
    if (parsedAmount.amount) fields.amount = parsedAmount.amount;
    if (parsedAmount.currency) fields.currency = parsedAmount.currency;
    if (parsedAmount.issue) issues.push(parsedAmount.issue);
  }
  if (isTransfer) issues.push("FINANCIAL_NATURE_REQUIRED");

  return {
    format: isPurchase
      ? "synthetic-itau-debit-purchase-v1"
      : "synthetic-itau-transfer-v1",
    kind: isPurchase ? "expense" : "bank-transfer",
    fields,
    issues: [...new Set(issues)],
  };
}

const labels: Record<EmailInterpretationIssue, string> = {
  UNSUPPORTED_FORMAT: "El texto no coincide con un formato cubierto.",
  CONTRADICTORY_FORMAT:
    "El texto contiene encabezados de operación incompatibles.",
  CONTRADICTORY_FIELD:
    "El mismo campo aparece con valores distintos y no puede elegirse automáticamente.",
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

export function emailInterpretationIssueLabel(
  issue: EmailInterpretationIssue,
): string {
  return labels[issue];
}
