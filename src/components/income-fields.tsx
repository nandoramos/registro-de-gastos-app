"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { IncomeInput } from "@/modules/incomes/domain";
import { currentExpenseDateTime } from "@/components/expense-fields";

type TextField = { value: string; set: Dispatch<SetStateAction<string>> };
export type IncomeFieldsState = {
  operationDate: TextField;
  operationTime: TextField;
  title: TextField;
  note: TextField;
  accountId: TextField;
  amount: TextField;
};
type InitialIncome = Partial<Pick<IncomeInput, "operationDate" | "operationTime" | "title" | "note" | "accountId" | "amount">>;

export const incomeErrorMessages: Record<string, string> = {
  INVALID_DATE: "Ingresá una fecha válida para el ingreso.",
  MOVEMENT_VOIDED: "Restaurá el movimiento antes de editarlo.",
  INVALID_TIME: "Ingresá una hora válida.",
  INVALID_TITLE: "Ingresá un detalle de hasta 120 caracteres.",
  INVALID_NOTE: "La nota puede tener hasta 1000 caracteres.",
  INVALID_AMOUNT: "Ingresá un importe positivo con hasta 2 decimales.",
  INVALID_CURRENCY: "Elegí una moneda admitida.",
  ACCOUNT_NOT_FOUND: "La cuenta no está disponible o la fecha es anterior a su saldo inicial. Configurá el saldo o corregí la cuenta o la fecha.",
  CURRENCY_MISMATCH: "La moneda debe coincidir con la cuenta.",
};

export function useIncomeFields(accounts: AccountView[], initial: InitialIncome = {}) {
  const defaults = currentExpenseDateTime();
  const [operationDate, setOperationDate] = useState(initial.operationDate ?? defaults.operationDate);
  const [operationTime, setOperationTime] = useState(initial.operationTime ?? defaults.operationTime);
  const [title, setTitle] = useState(initial.title ?? "Sueldo");
  const [note, setNote] = useState(initial.note ?? "");
  const [accountId, setAccountId] = useState(initial.accountId ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState(initial.amount ?? "");
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const fields = {
    operationDate: { value: operationDate, set: setOperationDate },
    operationTime: { value: operationTime, set: setOperationTime },
    title: { value: title, set: setTitle },
    note: { value: note, set: setNote },
    accountId: { value: accountId, set: setAccountId },
    amount: { value: amount, set: setAmount },
  } satisfies IncomeFieldsState;
  return {
    fields,
    selectedAccount,
    input: selectedAccount ? {
      operationDate,
      operationTime,
      title,
      note,
      accountId,
      amount,
      currency: selectedAccount.currency,
    } : undefined,
  };
}

export function IncomeFields({ accounts, fields }: { accounts: AccountView[]; fields: IncomeFieldsState }) {
  const selectedAccount = accounts.find((account) => account.id === fields.accountId.value);
  return (
    <>
      <label className="block text-sm font-medium">
        Fecha
        <input type="date" required value={fields.operationDate.value} onChange={(event) => fields.operationDate.set(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none" />
      </label>
      <label className="block text-sm font-medium">
        Hora (opcional)
        <input type="time" value={fields.operationTime.value} onChange={(event) => fields.operationTime.set(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none" />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Detalle
        <input required maxLength={120} value={fields.title.value} onChange={(event) => fields.title.set(event.target.value)} placeholder="Sueldo" className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none" />
      </label>
      <label className="block text-sm font-medium">
        Cuenta
        <select required value={fields.accountId.value} onChange={(event) => fields.accountId.set(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none">
          {accounts.map((account) => <option key={account.id} value={account.id} disabled={Boolean(account.archivedAt) && account.id !== fields.accountId.value}>{account.name} · {account.currency}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Importe
        <input required inputMode="decimal" value={fields.amount.value} onChange={(event) => fields.amount.set(event.target.value)} placeholder="0,00" className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none" />
        {selectedAccount && <output className="mt-2 block text-xs text-stone-500">{selectedAccount.currency}</output>}
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Nota (opcional)
        <textarea maxLength={1000} value={fields.note.value} onChange={(event) => fields.note.set(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-stone-300 p-4 focus:border-emerald-800 focus:outline-none" />
      </label>
    </>
  );
}
