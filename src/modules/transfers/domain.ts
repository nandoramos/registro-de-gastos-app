import {
  accountCurrencies,
  type AccountCurrency,
} from "@/modules/accounts/domain";
import {
  normalizeMoneyAmount,
  validOperationDate,
} from "@/modules/expenses/domain";

export type TransferKind = "transfer" | "withdrawal";

export type TransferInput = {
  kind: TransferKind;
  operationDate: string;
  title: string;
  note: string | null;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceAmount: string;
  destinationAmount: string;
  currency: AccountCurrency;
};

export type TransferDetail = Omit<
  TransferInput,
  | "sourceAccountId"
  | "destinationAccountId"
  | "sourceAmount"
  | "destinationAmount"
  | "currency"
> & {
  id: string;
  source: {
    account: {
      id: string;
      name: string;
      kind: "bank" | "cash";
      currency: AccountCurrency;
    };
    amount: string;
    currency: AccountCurrency;
  };
  destination: {
    account: {
      id: string;
      name: string;
      kind: "bank" | "cash";
      currency: AccountCurrency;
    };
    amount: string;
    currency: AccountCurrency;
  };
  evidence: {
    type: "manual";
    receivedAt: Date;
    original: Record<string, unknown>;
  };
};

export type TransferIssue =
  | "INVALID_TRANSFER_KIND"
  | "INVALID_DATE"
  | "INVALID_TITLE"
  | "INVALID_NOTE"
  | "INVALID_SOURCE_ACCOUNT"
  | "INVALID_DESTINATION_ACCOUNT"
  | "SAME_ACCOUNT"
  | "INVALID_SOURCE_AMOUNT"
  | "INVALID_DESTINATION_AMOUNT"
  | "INVALID_CURRENCY"
  | "AMOUNTS_MISMATCH";

const fields = [
  "kind",
  "operationDate",
  "title",
  "note",
  "sourceAccountId",
  "destinationAccountId",
  "sourceAmount",
  "destinationAmount",
  "currency",
] as const;

export type TransferAnalysis =
  | {
      complete: true;
      transfer: TransferInput;
      interpretation: Record<string, unknown>;
    }
  | {
      complete: false;
      issues: TransferIssue[];
      interpretation: Record<string, unknown>;
    };

export function analyzeTransfer(
  input: Record<string, unknown>,
): TransferAnalysis {
  const interpretation = {
    entryType: "own-transfer",
    ...Object.fromEntries(
      fields
        .filter((field) => input[field] !== undefined)
        .map((field) => [field, input[field]]),
    ),
  };
  const issues: TransferIssue[] = [];
  const kind = input.kind;
  if (kind !== "transfer" && kind !== "withdrawal") {
    issues.push("INVALID_TRANSFER_KIND");
  }
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
  if (sourceAmount && destinationAmount && sourceAmount !== destinationAmount) {
    issues.push("AMOUNTS_MISMATCH");
  }
  if (!accountCurrencies.includes(input.currency as AccountCurrency)) {
    issues.push("INVALID_CURRENCY");
  }
  if (issues.length > 0) return { complete: false, issues, interpretation };

  return {
    complete: true,
    interpretation,
    transfer: {
      kind: kind as TransferKind,
      operationDate: input.operationDate as string,
      title,
      note: note as string | null,
      sourceAccountId,
      destinationAccountId,
      sourceAmount: sourceAmount!,
      destinationAmount: destinationAmount!,
      currency: input.currency as AccountCurrency,
    },
  };
}

const issueLabels: Record<string, string> = {
  INVALID_TRANSFER_KIND: "Elegí transferencia o retiro.",
  INVALID_DATE: "Falta una fecha válida.",
  INVALID_TITLE: "Falta un título válido.",
  INVALID_NOTE: "La nota es demasiado extensa.",
  INVALID_SOURCE_ACCOUNT: "Falta la cuenta de origen.",
  INVALID_DESTINATION_ACCOUNT: "Falta la cuenta de destino.",
  SAME_ACCOUNT: "Origen y destino deben ser cuentas diferentes.",
  INVALID_SOURCE_AMOUNT: "Falta el importe debitado.",
  INVALID_DESTINATION_AMOUNT: "Falta el importe acreditado.",
  INVALID_CURRENCY: "Falta una moneda válida.",
  AMOUNTS_MISMATCH:
    "Los importes deben ser iguales en transferencias de la misma moneda.",
  SOURCE_ACCOUNT_NOT_FOUND: "La cuenta de origen no está disponible.",
  DESTINATION_ACCOUNT_NOT_FOUND: "La cuenta de destino no está disponible.",
  ACCOUNT_CURRENCY_MISMATCH: "Las cuentas deben usar la moneda indicada.",
  DIFFERENT_ACCOUNT_CURRENCIES:
    "Las conversiones entre monedas se registran por separado.",
  INVALID_WITHDRAWAL_ACCOUNTS:
    "Un retiro debe salir de una cuenta bancaria y llegar a efectivo.",
  TRANSFER_KIND_MISMATCH:
    "Un movimiento de banco a efectivo debe registrarse como retiro.",
};

export function transferIssueLabel(issue: string): string {
  return issueLabels[issue] ?? issue;
}
