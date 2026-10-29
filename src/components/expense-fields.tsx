"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import { preferredAccountId } from "@/modules/accounts/defaults";
import type { CategoryView } from "@/modules/categories/domain";

export const expenseErrorMessages: Record<string, string> = {
  INVALID_DATE: "Ingresá una fecha válida para el gasto.",
  MOVEMENT_VOIDED: "Restaurá el movimiento antes de editarlo.",
  INVALID_TIME: "Ingresá una hora válida.",
  INVALID_TITLE: "Ingresá un título de hasta 120 caracteres.",
  INVALID_NOTE: "La nota puede tener hasta 1000 caracteres.",
  INVALID_AMOUNT: "Ingresá un importe positivo con hasta 2 decimales.",
  INVALID_CURRENCY: "Elegí una moneda admitida.",
  ACCOUNT_NOT_FOUND: "La cuenta no está disponible, no tiene saldo inicial o la fecha del movimiento es anterior a su fecha inicial. Configurá el saldo o corregí la cuenta o la fecha.",
  CATEGORY_NOT_FOUND: "La categoría elegida ya no está disponible.",
  CURRENCY_MISMATCH: "La moneda debe coincidir con la cuenta de origen.",
};

type TextField = {
  value: string;
  set: Dispatch<SetStateAction<string>>;
};

export type ExpenseFieldsState = {
  operationDate: TextField;
  operationTime: TextField;
  title: TextField;
  note: TextField;
  accountId: TextField;
  categoryId: TextField;
  amount: TextField;
};

type InitialExpenseFields = {
  operationDate?: string;
  operationTime?: string;
  title?: string;
  note?: string;
  accountId?: string;
  categoryId?: string;
  amount?: string;
};

export function currentExpenseDateTime() {
  const now = new Date();
  return {
    operationDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Montevideo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now),
    operationTime: new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Montevideo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now),
  };
}

export function useExpenseFields(
  accounts: AccountView[],
  categories: CategoryView[],
  initial: InitialExpenseFields = {},
) {
  const defaults = currentExpenseDateTime();
  const [operationDate, setOperationDate] = useState(
    initial.operationDate ?? defaults.operationDate,
  );
  const [operationTime, setOperationTime] = useState(
    initial.operationTime ?? defaults.operationTime,
  );
  const [title, setTitle] = useState(initial.title ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [accountId, setAccountId] = useState(
    initial.accountId ?? preferredAccountId(accounts, "Itaú pesos", "UYU"),
  );
  const [categoryId, setCategoryId] = useState(
    initial.categoryId ?? "",
  );
  const [amount, setAmount] = useState(initial.amount ?? "");
  const selectedAccount = accounts.find((account) => account.id === accountId);

  return {
    fields: {
      operationDate: { value: operationDate, set: setOperationDate },
      operationTime: { value: operationTime, set: setOperationTime },
      title: { value: title, set: setTitle },
      note: { value: note, set: setNote },
      accountId: { value: accountId, set: setAccountId },
      categoryId: { value: categoryId, set: setCategoryId },
      amount: { value: amount, set: setAmount },
    } satisfies ExpenseFieldsState,
    selectedAccount,
    input: selectedAccount
      ? {
          operationDate,
          operationTime,
          title,
          note,
          accountId,
          categoryId,
          amount,
          currency: selectedAccount.currency,
        }
      : undefined,
  };
}

export function ExpenseFields({
  fields,
  accounts,
  categories,
}: {
  fields: ExpenseFieldsState;
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  const selectedAccount = accounts.find(
    (account) => account.id === fields.accountId.value,
  );

  return (
    <>
      <label className="block text-sm font-medium">
        Fecha
        <input
          type="date"
          required
          value={fields.operationDate.value}
          onChange={(event) => fields.operationDate.set(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium">
        Hora (opcional)
        <input
          type="time"
          value={fields.operationTime.value}
          onChange={(event) => fields.operationTime.set(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Título
        <input
          required
          maxLength={120}
          value={fields.title.value}
          onChange={(event) => fields.title.set(event.target.value)}
          placeholder="Ej. Compra en supermercado"
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium">
        Cuenta de origen
        <select
          required
          value={fields.accountId.value}
          onChange={(event) => fields.accountId.set(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none"
        >
          <option value="">Seleccioná una cuenta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id} disabled={Boolean(account.archivedAt) && account.id !== fields.accountId.value}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Categoría
        <select
          required
          value={fields.categoryId.value}
          onChange={(event) => fields.categoryId.set(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none"
        >
          <option value="">Elegí una categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id} disabled={Boolean(category.archivedAt) && category.id !== fields.categoryId.value}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Importe
        <input
          required
          inputMode="decimal"
          value={fields.amount.value}
          onChange={(event) => fields.amount.set(event.target.value)}
          placeholder="0,00"
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <div className="self-end rounded-xl bg-stone-100 px-4 py-3 text-sm">
        Moneda de la cuenta
        <output className="ml-2 font-semibold">
          {selectedAccount?.currency ?? "—"}
        </output>
      </div>
      <label className="block text-sm font-medium sm:col-span-2">
        Nota (opcional)
        <textarea
          maxLength={1000}
          value={fields.note.value}
          onChange={(event) => fields.note.set(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 focus:border-emerald-800 focus:outline-none"
        />
      </label>
    </>
  );
}
