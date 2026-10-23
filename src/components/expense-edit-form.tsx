"use client";

import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import type { ExpenseDetail } from "@/modules/expenses/domain";
import { Button } from "@/components/ui/button";

type EditableExpense = Pick<
  ExpenseDetail,
  | "id"
  | "operationDate"
  | "operationTime"
  | "title"
  | "note"
  | "amount"
  | "currency"
  | "account"
  | "category"
>;

const errorMessages: Record<string, string> = {
  INVALID_DATE: "Ingresá una fecha válida para el gasto.",
  INVALID_TIME: "Ingresá una hora válida.",
  INVALID_TITLE: "Ingresá un título de hasta 120 caracteres.",
  INVALID_NOTE: "La nota puede tener hasta 1000 caracteres.",
  INVALID_AMOUNT: "Ingresá un importe positivo con hasta 2 decimales.",
  INVALID_CURRENCY: "Elegí una moneda admitida.",
  ACCOUNT_NOT_FOUND: "La cuenta elegida ya no está disponible.",
  CATEGORY_NOT_FOUND: "La categoría elegida ya no está disponible.",
  CURRENCY_MISMATCH: "La moneda debe coincidir con la cuenta de origen.",
};

export function ExpenseEditForm({
  expense,
  accounts,
  categories,
}: {
  expense: EditableExpense;
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  const [operationDate, setOperationDate] = useState(expense.operationDate);
  const [operationTime, setOperationTime] = useState(
    expense.operationTime?.slice(0, 5) ?? "",
  );
  const [title, setTitle] = useState(expense.title);
  const [note, setNote] = useState(expense.note ?? "");
  const [accountId, setAccountId] = useState(expense.account.id);
  const [categoryId, setCategoryId] = useState(expense.category.id);
  const [amount, setAmount] = useState(expense.amount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const selectedAccount = accounts.find((account) => account.id === accountId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedAccount) return;
    setPending(true);
    setError(undefined);
    setSaved(false);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operationDate,
          operationTime,
          title,
          note,
          accountId,
          categoryId,
          amount,
          currency: selectedAccount.currency,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setSaved(true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        errorMessages[code] ??
          "No pudimos guardar los cambios. Intentá nuevamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      onSubmit={submit}
    >
      <label className="block text-sm font-medium">
        Fecha
        <input
          type="date"
          required
          value={operationDate}
          onChange={(event) => setOperationDate(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium">
        Hora (opcional)
        <input
          type="time"
          value={operationTime}
          onChange={(event) => setOperationTime(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium sm:col-span-2">
        Título
        <input
          required
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium">
        Cuenta de origen
        <select
          required
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {account.currency}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Categoría
        <select
          required
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 bg-white px-4 focus:border-emerald-800 focus:outline-none"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
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
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
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
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 focus:border-emerald-800 focus:outline-none"
        />
      </label>
      <div className="sm:col-span-2">
        <Button disabled={pending || !selectedAccount}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
        {saved && (
          <div role="status" className="mt-4 text-sm text-emerald-800">
            <p>
              Cambios guardados. El historial y la evidencia fueron conservados.
            </p>
            <a
              href={`/privado/gastos/${expense.id}`}
              className="mt-2 inline-flex font-semibold underline underline-offset-4"
            >
              Actualizar detalle e historial
            </a>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
