import type { AccountCurrency } from "@/modules/accounts/domain";
import {
  normalizeMoneyAmount,
  validOperationDate,
} from "@/modules/expenses/domain";

export type ConversionInstitutionKind = "itau" | "prex" | "other";

export type ConversionInput = {
  operationDate: string;
  title: string;
  note: string | null;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAmount: string;
  destinationAmount: string;
  sourceCurrency: AccountCurrency;
  destinationCurrency: AccountCurrency;
  effectiveRate: string;
  institutionKind: ConversionInstitutionKind | null;
  institutionName: string | null;
};

export type ConversionDetail = Omit<
  ConversionInput,
  | "sourceAccountId"
  | "destinationAccountId"
  | "sourceAmount"
  | "destinationAmount"
  | "sourceCurrency"
  | "destinationCurrency"
  | "institutionKind"
  | "institutionName"
> & {
  id: string;
  source: {
    account: { id: string; name: string; currency: AccountCurrency };
    amount: string;
    currency: AccountCurrency;
  };
  destination: {
    account: { id: string; name: string; currency: AccountCurrency };
    amount: string;
    currency: AccountCurrency;
  };
  effectiveRateDisplay: string;
  institution: { kind: ConversionInstitutionKind; name: string } | null;
  evidence: {
    type: "manual";
    receivedAt: Date;
    original: Record<string, unknown>;
  };
};

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

const conversionFields = [
  "operationDate",
  "title",
  "note",
  "sourceAccountId",
  "destinationAccountId",
  "sourceAmount",
  "destinationAmount",
  "sourceCurrency",
  "destinationCurrency",
  "destinationConfirmed",
  "quote",
  "institution",
  "otherInstitutionName",
] as const;

export function analyzeConversion(input: Record<string, unknown>) {
  const interpretation = {
    entryType: "conversion",
    ...Object.fromEntries(
      conversionFields
        .filter((field) => input[field] !== undefined)
        .map((field) => [field, input[field]]),
    ),
  };
  const issues: string[] = [];
  if (!validOperationDate(input.operationDate)) issues.push("INVALID_DATE");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title || title.length > 120) issues.push("INVALID_TITLE");
  const note =
    input.note === undefined || input.note === "" ? null : input.note;
  if (note !== null && (typeof note !== "string" || note.length > 1000)) {
    issues.push("INVALID_NOTE");
  }
  const sourceAccountId =
    typeof input.sourceAccountId === "string" ? input.sourceAccountId : "";
  const destinationAccountId =
    typeof input.destinationAccountId === "string"
      ? input.destinationAccountId
      : "";
  if (!sourceAccountId) issues.push("INVALID_SOURCE_ACCOUNT");
  if (!destinationAccountId) issues.push("INVALID_DESTINATION_ACCOUNT");
  if (sourceAccountId && sourceAccountId === destinationAccountId) {
    issues.push("SAME_ACCOUNT");
  }
  const sourceAmount = normalizeMoneyAmount(input.sourceAmount);
  const destinationAmount = normalizeMoneyAmount(input.destinationAmount);
  if (!sourceAmount) issues.push("INVALID_SOURCE_AMOUNT");
  if (!destinationAmount) issues.push("INVALID_DESTINATION_AMOUNT");
  if (input.destinationConfirmed !== true) {
    issues.push("DESTINATION_NOT_CONFIRMED");
  }
  const sourceCurrency = input.sourceCurrency;
  const destinationCurrency = input.destinationCurrency;
  if (sourceCurrency !== "UYU" && sourceCurrency !== "USD") {
    issues.push("INVALID_SOURCE_CURRENCY");
  }
  if (destinationCurrency !== "UYU" && destinationCurrency !== "USD") {
    issues.push("INVALID_DESTINATION_CURRENCY");
  }
  if (
    (sourceCurrency === "UYU" || sourceCurrency === "USD") &&
    sourceCurrency === destinationCurrency
  ) {
    issues.push("SAME_CURRENCY");
  }
  if (input.quote !== undefined && input.quote !== "") {
    if (!normalizeMoneyAmount(input.quote)) issues.push("INVALID_QUOTE");
  }
  const institution = input.institution;
  if (
    institution !== undefined &&
    institution !== null &&
    institution !== "" &&
    institution !== "itau" &&
    institution !== "prex" &&
    institution !== "other"
  ) {
    issues.push("INVALID_INSTITUTION");
  }
  const otherInstitutionName =
    typeof input.otherInstitutionName === "string"
      ? input.otherInstitutionName.trim()
      : "";
  if (institution === "other" && !otherInstitutionName) {
    issues.push("INVALID_INSTITUTION_NAME");
  }
  if (otherInstitutionName.length > 120) {
    issues.push("INVALID_INSTITUTION_NAME");
  }
  if (issues.length > 0)
    return { complete: false as const, issues, interpretation };

  const effectiveRate = calculateEffectiveRate(
    sourceCurrency as AccountCurrency,
    sourceAmount!,
    destinationCurrency as AccountCurrency,
    destinationAmount!,
  );
  const institutionKind =
    institution === "itau" || institution === "prex" || institution === "other"
      ? institution
      : null;
  return {
    complete: true as const,
    interpretation,
    conversion: {
      operationDate: input.operationDate as string,
      title,
      note: note as string | null,
      sourceAccountId,
      destinationAccountId,
      sourceAmount: sourceAmount!,
      destinationAmount: destinationAmount!,
      sourceCurrency: sourceCurrency as AccountCurrency,
      destinationCurrency: destinationCurrency as AccountCurrency,
      effectiveRate,
      institutionKind,
      institutionName:
        institutionKind === "itau"
          ? "Itaú"
          : institutionKind === "prex"
            ? "Prex"
            : institutionKind === "other"
              ? otherInstitutionName
              : null,
    } satisfies ConversionInput,
  };
}

const issueLabels: Record<string, string> = {
  INVALID_DATE: "Falta una fecha válida.",
  INVALID_TITLE: "Falta un título válido.",
  INVALID_NOTE: "La nota es demasiado extensa.",
  INVALID_SOURCE_ACCOUNT: "Falta la cuenta de origen.",
  INVALID_DESTINATION_ACCOUNT: "Falta la cuenta de destino.",
  SOURCE_ACCOUNT_NOT_FOUND: "La cuenta de origen no está disponible.",
  DESTINATION_ACCOUNT_NOT_FOUND: "La cuenta de destino no está disponible.",
  SAME_ACCOUNT: "Origen y destino deben ser cuentas diferentes.",
  INVALID_SOURCE_AMOUNT: "Falta el importe debitado.",
  INVALID_DESTINATION_AMOUNT: "Falta el importe acreditado.",
  DESTINATION_NOT_CONFIRMED: "Confirmá el importe realmente acreditado.",
  INVALID_SOURCE_CURRENCY: "La moneda de origen no es válida.",
  INVALID_DESTINATION_CURRENCY: "La moneda de destino no es válida.",
  SAME_CURRENCY: "Una conversión requiere monedas diferentes.",
  ACCOUNT_CURRENCY_MISMATCH: "La moneda debe coincidir con cada cuenta.",
  INVALID_QUOTE: "La cotización debe ser positiva y tener hasta 2 decimales.",
  INVALID_INSTITUTION: "La institución no es válida.",
  INVALID_INSTITUTION_NAME: "Indicá el nombre de la otra institución.",
};

export function conversionIssueLabel(issue: string): string {
  return issueLabels[issue] ?? issue;
}
