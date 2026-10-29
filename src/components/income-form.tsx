"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import { Button } from "@/components/ui/button";
import { currentExpenseDateTime } from "@/components/expense-fields";
import { IncomeFields, incomeErrorMessages, useIncomeFields } from "@/components/income-fields";
import { SavePendingButton } from "@/components/save-pending-button";

type CreatedIncome = { id: string; title: string; amount: string; currency: "UYU" | "USD" };

export function IncomeForm({ accounts }: { accounts: AccountView[] }) {
  const router = useRouter();
  const { fields, selectedAccount, input } = useIncomeFields(accounts);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState<CreatedIncome>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input) return;
    setPending(true);
    setError(undefined);
    setCreated(undefined);
    try {
      const response = await fetch("/api/incomes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json() as CreatedIncome & { error?: string };
      if (!response.ok) throw new Error(body.error);
      setCreated(body);
      fields.title.set("Sueldo");
      fields.note.set("");
      fields.amount.set("");
      const defaults = currentExpenseDateTime();
      fields.operationDate.set(defaults.operationDate);
      fields.operationTime.set(defaults.operationTime);
      fields.accountId.set(accounts[0]?.id ?? "");
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(incomeErrorMessages[code] ?? "No pudimos registrar el ingreso. Intentá nuevamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <form className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2" onSubmit={submit}>
        <IncomeFields accounts={accounts} fields={fields} />
        <div className="sm:col-span-2">
          <Button disabled={pending || !selectedAccount}>{pending ? "Registrando…" : "Registrar ingreso"}</Button>
          <SavePendingButton entryType="income" draft={{ operationDate: fields.operationDate.value, operationTime: fields.operationTime.value, title: fields.title.value, note: fields.note.value, accountId: fields.accountId.value, amount: fields.amount.value, currency: selectedAccount?.currency }} />
          {error && <p role="alert" className="mt-4 text-sm text-red-800">{error}</p>}
        </div>
      </form>
      <aside className="h-fit rounded-2xl border border-stone-200 bg-stone-50 p-6">
        {created ? <>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Ingreso registrado</p>
          <h2 className="mt-3 text-xl font-semibold">{created.title}</h2>
          <p className="mt-2 text-stone-600">{created.currency} {created.amount}</p>
          <Link href={"/privado/ingresos/" + created.id} className="mt-6 inline-flex min-h-12 items-center text-sm font-semibold text-emerald-900 underline underline-offset-4">Ver ingreso</Link>
        </> : <>
          <h2 className="font-semibold">Registro directo</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">El ingreso se suma al saldo de la cuenta elegida. La moneda se toma de esa cuenta.</p>
        </>}
      </aside>
    </div>
  );
}
