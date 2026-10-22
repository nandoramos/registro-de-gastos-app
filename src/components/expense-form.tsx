"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import { Button } from "@/components/ui/button";

type CreatedExpense = {
  id: string;
  title: string;
  amount: string;
  currency: "UYU" | "USD";
};

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

export function ExpenseForm({
  accounts,
  categories,
}: {
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  const [operationDate, setOperationDate] = useState("");
  const [operationTime, setOperationTime] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<CreatedExpense>();
  const selectedAccount = accounts.find((account) => account.id === accountId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedAccount) return;
    setPending(true);
    setError(undefined);
    setCreated(undefined);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
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
      const body = (await response.json()) as CreatedExpense & {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error);
      setCreated(body);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        errorMessages[code] ??
          "No pudimos registrar el gasto. Intentá nuevamente.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form
        className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2"
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
            placeholder="Ej. Compra en supermercado"
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
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 focus:border-emerald-800 focus:outline-none"
          />
        </label>
        <div className="sm:col-span-2">
          <Button disabled={pending || !selectedAccount}>
            {pending ? "Registrando…" : "Registrar gasto"}
          </Button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-800">
              {error}
            </p>
          )}
        </div>
      </form>

      <aside className="h-fit rounded-2xl border border-stone-200 bg-stone-50 p-6">
        {created ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Gasto registrado
            </p>
            <h2 className="mt-3 text-xl font-semibold">{created.title}</h2>
            <p className="mt-2 text-stone-600">
              {created.currency} {created.amount}
            </p>
            <Link
              href={"/privado/gastos/" + created.id}
              className="mt-6 inline-flex min-h-12 items-center text-sm font-semibold text-emerald-900 underline underline-offset-4"
            >
              Ver detalle y evidencia
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-semibold">Registro directo</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Un gasto completo y coherente se registra al guardar. La fecha de
              carga queda separada de la fecha del gasto.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
