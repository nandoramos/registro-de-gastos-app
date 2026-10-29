"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import {
  ExpenseFields,
  currentExpenseDateTime,
  expenseErrorMessages,
  useExpenseFields,
} from "@/components/expense-fields";
import { Button } from "@/components/ui/button";
import { expenseWouldOverdraw } from "@/modules/expenses/domain";
import { SavePendingButton } from "@/components/save-pending-button";
import { formatMoneyAmount } from "@/modules/money/format";

type CreatedExpense = {
  id: string;
  title: string;
  amount: string;
  currency: "UYU" | "USD";
};

export function ExpenseForm({
  accounts,
  categories,
}: {
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  const router = useRouter();
  const { fields, selectedAccount, input } = useExpenseFields(
    accounts,
    categories,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<CreatedExpense>();
  const wouldBeNegative = expenseWouldOverdraw(
    selectedAccount?.balance,
    fields.amount.value,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input) return;
    setPending(true);
    setError(undefined);
    setCreated(undefined);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await response.json()) as CreatedExpense & {
        error?: string;
      };
      if (!response.ok) throw new Error(body.error);
      setCreated(body);
      fields.title.set("");
      fields.note.set("");
      fields.amount.set("");
      fields.categoryId.set("");
      const defaults = currentExpenseDateTime();
      fields.operationDate.set(defaults.operationDate);
      fields.operationTime.set(defaults.operationTime);
      fields.accountId.set(accounts[0]?.id ?? "");
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        expenseErrorMessages[code] ??
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
        <ExpenseFields
          accounts={accounts}
          categories={categories}
          fields={fields}
        />
        <div className="sm:col-span-2">
          {wouldBeNegative && (
            <p className="mb-4 text-sm text-amber-900" role="status">
              Este gasto dejará la cuenta con saldo negativo. Podés registrarlo de todas formas.
            </p>
          )}
          <Button disabled={pending || !selectedAccount}>
            {pending ? "Registrando…" : "Registrar gasto"}
          </Button>
          <SavePendingButton entryType="expense" draft={{ operationDate: fields.operationDate.value, operationTime: fields.operationTime.value, title: fields.title.value, note: fields.note.value, accountId: fields.accountId.value, categoryId: fields.categoryId.value, amount: fields.amount.value, currency: selectedAccount?.currency }} />
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
              {formatMoneyAmount(created.currency, created.amount)}
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
