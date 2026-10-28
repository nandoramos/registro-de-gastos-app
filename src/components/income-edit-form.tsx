"use client";

import { useState, type FormEvent } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import { wouldIncomeOverdraw, type IncomeDetail } from "@/modules/incomes/domain";
import { Button } from "@/components/ui/button";
import { IncomeFields, incomeErrorMessages, useIncomeFields } from "@/components/income-fields";

type EditableIncome = Pick<IncomeDetail, "id" | "operationDate" | "operationTime" | "title" | "note" | "amount" | "currency" | "accountId">;

export function IncomeEditForm({ income, accounts }: { income: EditableIncome; accounts: AccountView[] }) {
  const { fields, selectedAccount, input } = useIncomeFields(accounts, {
    operationDate: income.operationDate,
    operationTime: income.operationTime?.slice(0, 5) ?? "",
    title: income.title,
    note: income.note ?? "",
    amount: income.amount,
    accountId: income.accountId,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const wouldBeNegative = wouldIncomeOverdraw(selectedAccount?.balance, fields.amount.value, selectedAccount?.id === income.accountId ? income.amount : "0.00");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input) return;
    setPending(true);
    setError(undefined);
    setSaved(false);
    try {
      const response = await fetch("/api/incomes/" + income.id, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error);
      setSaved(true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(incomeErrorMessages[code] ?? "No pudimos guardar los cambios. Intentá nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={submit}>
      <IncomeFields accounts={accounts} fields={fields} />
      <div className="sm:col-span-2">
        {wouldBeNegative && <p role="status" className="mb-4 text-sm text-amber-900">Este cambio dejará la cuenta con saldo negativo. Podés guardarlo de todas formas.</p>}
        <Button disabled={pending || !selectedAccount}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
        {saved && <p role="status" className="mt-4 text-sm text-emerald-800">Cambios guardados. Los saldos se actualizaron.</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
      </div>
    </form>
  );
}
