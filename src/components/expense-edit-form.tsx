"use client";

import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import type { ExpenseDetail } from "@/modules/expenses/domain";
import {
  ExpenseFields,
  expenseErrorMessages,
  useExpenseFields,
} from "@/components/expense-fields";
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

export function ExpenseEditForm({
  expense,
  accounts,
  categories,
}: {
  expense: EditableExpense;
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  const { fields, selectedAccount, input } = useExpenseFields(
    accounts,
    categories,
    {
      operationDate: expense.operationDate,
      operationTime: expense.operationTime?.slice(0, 5) ?? "",
      title: expense.title,
      note: expense.note ?? "",
      accountId: expense.account.id,
      categoryId: expense.category.id,
      amount: expense.amount,
    },
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input) return;
    setPending(true);
    setError(undefined);
    setSaved(false);
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setSaved(true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        expenseErrorMessages[code] ??
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
      <ExpenseFields
        accounts={accounts}
        categories={categories}
        fields={fields}
      />
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
