"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import type { MovementHistoryItem } from "@/modules/movements/history";
import type { MovementType } from "@/modules/movements/status";
import { ExpenseEditForm } from "@/components/expense-edit-form";
import { IncomeEditForm } from "@/components/income-edit-form";
import { TransferForm } from "@/components/transfer-form";
import { ConversionEditForm } from "@/components/conversion-edit-form";
import { AdjustmentEditForm } from "@/components/adjustment-edit-form";
import { MovementStatusActions } from "@/components/movement-status-actions";
import { formatMoneyAmount } from "@/modules/money/format";

type SelectedMovement = { movement: MovementHistoryItem; detail?: Record<string, unknown> };
const apiTypes: Record<MovementHistoryItem["type"], string> = { expense: "expenses", income: "incomes", transfer: "transfers", withdrawal: "transfers", conversion: "conversions", adjustment: "adjustments" };
const status = (movement: MovementHistoryItem) => movement.voidedAt ? "Anulado" : "Ingresado";
function isTwoSided(movement: MovementHistoryItem): movement is Extract<MovementHistoryItem, { type: "transfer" | "withdrawal" | "conversion" }> { return movement.type === "transfer" || movement.type === "withdrawal" || movement.type === "conversion"; }
function statusType(movement: MovementHistoryItem): MovementType { return movement.type === "withdrawal" ? "transfer" : movement.type; }

function amountLabel(movement: MovementHistoryItem) {
  if (isTwoSided(movement)) return `${formatMoneyAmount(movement.source.currency, movement.source.amount)} → ${formatMoneyAmount(movement.destination.currency, movement.destination.amount)}`;
  const sign = movement.type === "income" || movement.type === "adjustment" && movement.direction === "increase" ? "+" : "−";
  return `${sign} ${formatMoneyAmount(movement.currency, movement.amount)}`;
}
function accountLabel(movement: MovementHistoryItem) {
  return isTwoSided(movement) ? `${movement.source.account} → ${movement.destination.account}` : movement.account;
}
function currencyLabel(movement: MovementHistoryItem) {
  return isTwoSided(movement) ? `${movement.source.currency} → ${movement.destination.currency}` : movement.currency;
}
function statusClass(movement: MovementHistoryItem) { return movement.voidedAt ? "bg-red-500" : "bg-emerald-500"; }

export function MovementTable({ movements, accounts, categories }: { movements: MovementHistoryItem[]; accounts: AccountView[]; categories: CategoryView[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedMovement>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLButtonElement>(null);
  const dialogOpen = Boolean(selected);
  useEffect(() => { if (dialogOpen) closeButton.current?.focus(); else returnFocus.current?.focus(); }, [dialogOpen]);
  useEffect(() => {
    if (!selected || selected.detail) return;
    let cancelled = false;
    fetch(`/api/${apiTypes[selected.movement.type]}/${selected.movement.id}`).then(async (response) => {
      if (!response.ok) throw new Error("No se pudo cargar el movimiento.");
      const detail = await response.json() as Record<string, unknown>;
      if (!cancelled) setSelected((current) => current ? { ...current, detail } : current);
    }).catch(() => { if (!cancelled) setError("No se pudo cargar el movimiento. Intentá nuevamente."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selected]);

  function open(movement: MovementHistoryItem, trigger: HTMLButtonElement) { returnFocus.current = trigger; setDirty(false); setError(""); setLoading(true); setSelected({ movement }); }
  function close() {
    if (dirty && !window.confirm("¿Cerrar sin guardar? Se descartarán los cambios.")) return;
    setSelected(undefined); setDirty(false); setError("");
  }
  function afterSave() { setDirty(false); setSelected(undefined); router.refresh(); }

  function editForm(selection: SelectedMovement) {
    const detail = selection.detail;
    if (!detail) return null;
    const movement = selection.movement;
    if (movement.type === "expense") return <ExpenseEditForm expense={detail as never} accounts={accounts} categories={categories} onSaved={afterSave} />;
    if (movement.type === "income") return <IncomeEditForm income={detail as never} accounts={accounts} onSaved={afterSave} />;
    if (movement.type === "transfer" || movement.type === "withdrawal") return <TransferForm accounts={accounts} transfer={detail as never} onSaved={afterSave} />;
    if (movement.type === "conversion") return <ConversionEditForm conversion={detail as never} accounts={accounts} onSaved={afterSave} />;
    return <AdjustmentEditForm adjustment={detail as never} accounts={accounts} onSaved={afterSave} />;
  }

  return <>
    {movements.length === 0 ? <div className="mt-8 rounded-xl border border-stone-200 p-8 text-center"><p className="font-medium">No hay movimientos para mostrar.</p><p className="mt-2 text-sm text-stone-600">Probá cambiar el mes o los filtros.</p></div> : <div className="mt-8 rounded-xl border border-stone-200">
      <table aria-label="Movimientos" className="w-full table-fixed border-collapse text-left text-sm md:table-auto">
        <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-600"><tr><th scope="col" className="hidden px-3 py-3 md:table-cell">Estado</th><th scope="col" className="w-24 px-2 py-3 text-xs md:w-auto md:px-3">Fecha</th><th scope="col" className="px-2 py-3 md:px-3">Detalle</th><th scope="col" className="w-28 px-2 py-3 text-right text-xs md:w-auto md:px-3 md:text-sm">Importe</th><th scope="col" className="hidden px-3 py-3 md:table-cell">Moneda</th><th scope="col" className="hidden px-3 py-3 md:table-cell">Cuenta</th><th scope="col" className="hidden px-3 py-3 lg:table-cell">Categoría</th><th scope="col" className="w-12 px-1 py-3 md:px-3"><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody className="divide-y divide-stone-200">{movements.map((movement) => <tr key={`${movement.type}-${movement.id}`} className="align-top hover:bg-stone-50/60">
          <td className="hidden px-3 py-4 md:table-cell"><span title={status(movement)} aria-label={status(movement)} className={`inline-block h-2.5 w-2.5 rounded-full ${statusClass(movement)}`} /><span className="sr-only">{status(movement)}</span></td>
          <td className="whitespace-nowrap px-2 py-4 text-xs tabular-nums md:px-3 md:text-sm">{movement.date}{movement.operationTime && <span className="block text-xs text-stone-500">{movement.operationTime.slice(0, 5)}</span>}</td>
          <td className="break-words px-2 py-4 md:px-3"><span className="font-medium">{movement.title}</span><span className="block text-xs text-stone-500">{movement.type === "withdrawal" ? "Retiro" : movement.type === "adjustment" ? "Ajuste manual" : movement.type === "conversion" ? `${movement.withdrawal ? "Retiro · " : ""}Conversión · ${currencyLabel(movement)}` : movement.type === "transfer" ? "Transferencia" : movement.type === "expense" ? movement.category : "Ingreso"}</span><details className="mt-2 text-xs md:hidden"><summary className="cursor-pointer text-stone-500">Más datos</summary><p className="mt-2">Estado: {status(movement)}</p><p>Cuenta: {accountLabel(movement)}</p><p>Moneda: {currencyLabel(movement)}</p><p>Categoría: {movement.category ?? "—"}</p></details></td>
          <td className={`break-words px-2 py-4 text-right text-xs font-medium tabular-nums md:whitespace-nowrap md:px-3 md:text-sm ${movement.type === "expense" || movement.type === "adjustment" && movement.direction === "decrease" ? "text-red-700" : movement.type === "income" || movement.type === "adjustment" && movement.direction === "increase" ? "text-emerald-400" : ""}`}>{amountLabel(movement)}</td>
          <td className="hidden px-3 py-4 md:table-cell">{currencyLabel(movement)}</td>
          <td className="hidden px-3 py-4 md:table-cell">{accountLabel(movement)}<span className="block text-xs text-stone-500">{currencyLabel(movement)}</span></td>
          <td className="hidden px-3 py-4 lg:table-cell">{movement.category ?? "—"}</td>
          <td className="px-1 py-4 text-right md:px-3"><button type="button" aria-label={`${movement.voidedAt ? "Consultar" : "Editar"} ${movement.title}`} title={movement.voidedAt ? "Consultar movimiento" : "Editar movimiento"} onClick={(event) => open(movement, event.currentTarget)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg hover:bg-stone-100 focus-visible:outline">{movement.voidedAt ? "⌕" : "✎"}</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section role="dialog" aria-modal="true" aria-labelledby="movement-dialog-title" tabIndex={-1} onChangeCapture={() => setDirty(true)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }} className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-8"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{status(selected.movement)} · {selected.movement.date}</p><h2 id="movement-dialog-title" className="mt-2 text-2xl font-semibold">Editar movimiento</h2><p className="mt-1 text-sm text-stone-600">{selected.movement.title}</p></div><button ref={closeButton} type="button" onClick={close} aria-label="Cerrar popup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl hover:bg-stone-100">×</button></header>
      {loading && <p role="status" className="mt-8">Cargando movimiento…</p>}{error && <p role="alert" className="mt-8 text-red-800">{error}</p>}
      {selected.detail && (selected.movement.voidedAt ? <div className="mt-6"><p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">Este movimiento está anulado; no se puede editar.</p><MovementStatusActions type={statusType(selected.movement)} id={selected.movement.id} voided onChanged={(action) => { if (action === "restore") { setSelected((current) => current ? { ...current, movement: { ...current.movement, voidedAt: null } } : current); setDirty(false); } }} /><a className="mt-4 inline-block text-sm underline" href={`/privado/${selected.movement.type === "adjustment" ? "ajustes" : selected.movement.type === "conversion" ? "conversiones" : selected.movement.type === "transfer" || selected.movement.type === "withdrawal" ? "transferencias" : selected.movement.type === "income" ? "ingresos" : "gastos"}/${selected.movement.id}`}>Ver detalle completo</a></div> : <div className="mt-5">{editForm(selected)}<div className="mt-4 flex flex-wrap gap-3"><MovementStatusActions type={statusType(selected.movement)} id={selected.movement.id} voided={false} onChanged={(action) => { if (action === "void") { setSelected((current) => current ? { ...current, movement: { ...current.movement, voidedAt: new Date() } } : current); setDirty(false); } }} /><button type="button" onClick={close} className="min-h-12 rounded-xl border border-stone-300 px-5 text-sm font-semibold">Cancelar</button></div></div>)}
    </section></div>}
  </>;
}
