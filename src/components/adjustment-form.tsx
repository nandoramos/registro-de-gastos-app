"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AccountView } from "@/modules/accounts/domain";
import { observedDifference } from "@/modules/adjustments/domain";
import { Button } from "@/components/ui/button";

export function AdjustmentForm({ accounts }: { accounts: AccountView[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState("");
  const [observed, setObserved] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const selected = accounts.find((account) => account.id === accountId);
  const diff = useMemo(() => selected?.balance && observed.trim() ? observedDifference(selected.balance, observed.trim().replace(",", ".")) : undefined, [observed, selected]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/adjustments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId, observedBalance: observed, note }) });
      const body = await response.json() as { id?: string; status?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "ERROR");
      if (body.status === "already_equal") setMessage("El saldo observado coincide con el saldo actual. No se creó ningún ajuste.");
      else if (body.id) { setMessage("Ajuste registrado."); router.push(`/privado/ajustes/${body.id}`); }
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(code === "ACCOUNT_NOT_FOUND" ? "Elegí una cuenta activa configurada." : "No pudimos registrar el ajuste. Revisá los datos e intentá nuevamente.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="grid max-w-2xl gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
    <label className="grid gap-2 text-sm font-medium">Cuenta<select required value={accountId} onChange={(event) => { setAccountId(event.target.value); setObserved(""); }} className="min-h-12 rounded-lg border border-stone-300 bg-white px-3"><option value="">Seleccioná una cuenta</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.currency}</option>)}</select></label>
    {selected && <p className="rounded-lg bg-stone-50 p-4 text-sm">Saldo actual: <strong>{selected.currency} {selected.balance}</strong></p>}
    <label className="grid gap-2 text-sm font-medium">Saldo que muestra el banco o efectivo<input required inputMode="decimal" value={observed} onChange={(event) => setObserved(event.target.value)} placeholder="0,00" className="min-h-12 rounded-lg border border-stone-300 px-3" aria-describedby="adjustment-difference" /></label>
    <div id="adjustment-difference" aria-live="polite" className="rounded-lg border border-stone-200 p-4 text-sm">{!selected || !observed ? "La diferencia se calcula al ingresar el saldo observado." : diff?.cents === 0n ? "No hay diferencia: el saldo ya coincide." : diff ? <>Diferencia: <strong className={diff.direction === "increase" ? "text-emerald-700" : "text-red-700"}>{diff.direction === "increase" ? "+" : "−"}{selected.currency} {diff.amount}</strong></> : "Ingresá un saldo válido con hasta dos decimales."}</div>
    <p className="text-sm text-stone-600">Fecha del ajuste: hoy. La moneda se toma de la cuenta.</p>
    <label className="grid gap-2 text-sm font-medium">Nota opcional<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} className="rounded-lg border border-stone-300 p-3" /></label>
    <Button disabled={busy || !accountId || !observed || !diff || diff.cents === 0n}>{busy ? "Registrando…" : "Registrar ajuste"}</Button>
    {message && <p role="status" className="text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="text-sm text-red-800">{error}</p>}
  </form>;
}
