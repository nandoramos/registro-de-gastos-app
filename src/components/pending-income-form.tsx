"use client";

import { FormEvent, useState } from "react";
import type { AccountView } from "@/modules/accounts/domain";
import { Button } from "@/components/ui/button";
import { IncomeFields, useIncomeFields } from "@/components/income-fields";
import { pendingIssueLabel } from "@/modules/pending-entries/domain";

export function PendingIncomeForm({ entry, accounts, onSaved }: { entry: { id: string; interpretation: Record<string, unknown>; issues: string[] }; accounts: AccountView[]; onSaved?: () => void }) {
  const text = (value: unknown) => typeof value === "string" ? value : undefined;
  const { fields, input } = useIncomeFields(accounts, {
    operationDate: text(entry.interpretation.operationDate), operationTime: text(entry.interpretation.operationTime),
    title: text(entry.interpretation.title), note: text(entry.interpretation.note), accountId: text(entry.interpretation.accountId), amount: text(entry.interpretation.amount),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState(entry.issues);
  const [registeredId, setRegisteredId] = useState<string>();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!input) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/pending-entries/${entry.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, entryType: "income" }) });
      const body = await response.json() as { income?: { id: string }; issues?: string[]; error?: string };
      if (!response.ok) throw new Error(body.error);
      if (body.income) { setRegisteredId(body.income.id); onSaved?.(); }
      else { setIssues(body.issues ?? []); setError("El ingreso sigue pendiente. Revisá los datos y volvé a intentar."); }
    } catch { setError("No se pudo guardar el ingreso. Revisá la fecha, la cuenta y el importe."); }
    finally { setBusy(false); }
  }
  if (registeredId) return <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">Ingreso registrado. <a className="underline" href={`/privado/ingresos/${registeredId}`}>Ver ingreso</a></p>;
  return <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
    {issues.length > 0 && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950 sm:col-span-2"><p className="font-semibold">Falta resolver:</p><ul className="mt-2 list-disc pl-5">{issues.map((issue) => <li key={issue}>{pendingIssueLabel(issue)}</li>)}</ul></div>}
    <IncomeFields accounts={accounts} fields={fields} />
    <div className="sm:col-span-2"><Button disabled={busy || !input}>{busy ? "Guardando…" : "Guardar y registrar"}</Button>{error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}</div>
  </form>;
}
