"use client";

import { useState } from "react";
import Form from "next/form";
import Link from "next/link";
import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import type { MovementType } from "@/modules/movements/history";

const types: { value: MovementType; label: string }[] = [
  { value: "expense", label: "Gastos" }, { value: "income", label: "Ingresos" },
  { value: "transfer", label: "Transferencias" }, { value: "withdrawal", label: "Retiros" },
  { value: "conversion", label: "Conversiones" }, { value: "adjustment", label: "Ajustes manuales" },
];

export type MovementFilterValues = {
  month?: string;
  startDate?: string;
  endDate?: string;
  accountIds: string[];
  categoryIds: string[];
  types: MovementType[];
  currencies: ("UYU" | "USD")[];
  status: "active" | "voided" | "all";
  search?: string;
};

export function MovementFilters({ accounts, categories, values, houseMode, includeHouse = false, spendingOnly = false, summary, categoriesReady = true }: { accounts: AccountView[]; categories: CategoryView[]; values: MovementFilterValues; houseMode: boolean; includeHouse?: boolean; spendingOnly?: boolean; summary: string[]; categoriesReady?: boolean }) {
  const [open, setOpen] = useState(false);
  return <section className="mt-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" aria-expanded={open} aria-controls="movement-filters-panel" onClick={() => setOpen((value) => !value)} className="min-h-11 rounded-lg border border-stone-300/20 px-4">Filtros</button>
      <p className="text-sm text-stone-500">{summary.length ? `Filtros activos: ${summary.join(" · ")}` : "Sin filtros adicionales"}</p>
    </div>
    <Form action="" aria-label="Filtros de movimientos" id="movement-filters-panel" className={`${open ? "grid" : "hidden"} mt-4 gap-4 rounded-2xl border border-stone-300/15 p-4 sm:p-6`} onSubmit={() => setOpen(false)}>
      {houseMode && <input type="hidden" name="house" value="true" />}
      {!houseMode && includeHouse && <input type="hidden" name="includeHouse" value="true" />}
      {spendingOnly && <input type="hidden" name="spending" value="true" />}
      <fieldset data-filter-group className="rounded-lg border border-stone-300/15 p-4"><legend className="px-1 text-sm font-semibold">Buscar / mes / desde / hasta</legend><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-xs font-medium text-stone-500">Buscar en detalle y nota<input name="search" defaultValue={values.search} type="search" placeholder="Comercio, nota…" className="min-h-11 rounded-lg border border-stone-300/20 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-medium text-stone-500">Mes<input name="month" defaultValue={values.month} type="month" className="min-h-11 rounded-lg border border-stone-300/20 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-medium text-stone-500">Desde<input name="startDate" defaultValue={values.startDate} type="date" className="min-h-11 rounded-lg border border-stone-300/20 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-medium text-stone-500">Hasta<input name="endDate" defaultValue={values.endDate} type="date" className="min-h-11 rounded-lg border border-stone-300/20 px-3 text-sm" /></label>
      </div></fieldset>
      <fieldset data-filter-group className="rounded-lg border border-stone-300/15 p-4"><legend className="px-1 text-sm font-semibold">Estado / moneda</legend><div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-stone-500">Estado<select name="status" defaultValue={values.status} className="min-h-11 rounded-lg border border-stone-300/20 px-3 text-sm"><option value="active">Ingresados y pendientes</option><option value="voided">Anulados</option><option value="all">Todos los estados</option></select></label>
        <fieldset className="rounded-lg border border-stone-300/15 p-3"><legend className="px-1 text-xs font-medium text-stone-500">Moneda</legend><div className="mt-1 flex gap-4">{(["UYU", "USD"] as const).map((currency) => <label key={currency} className="flex items-center gap-2 text-sm"><input type="checkbox" name="currency" value={currency} defaultChecked={values.currencies.includes(currency)} />{currency}</label>)}</div></fieldset>
      </div></fieldset>
      <fieldset data-filter-group className="rounded-lg border border-stone-300/15 p-4"><legend className="px-1 text-sm font-semibold">Tipo / cuenta / categoría</legend><div className="grid gap-4 sm:grid-cols-3">
        <fieldset className="rounded-lg border border-stone-300/15 p-3"><legend className="px-1 text-xs font-medium text-stone-500">Tipo</legend><div className="mt-1 grid max-h-36 gap-2 overflow-auto">{types.map((type) => <label key={type.value} className="flex items-center gap-2 text-sm"><input type="checkbox" name="type" value={type.value} defaultChecked={values.types.includes(type.value)} />{type.label}</label>)}</div></fieldset>
        <fieldset className="rounded-lg border border-stone-300/15 p-3"><legend className="px-1 text-xs font-medium text-stone-500">Cuenta</legend><div className="mt-1 grid max-h-36 gap-2 overflow-auto">{accounts.map((account) => <label key={account.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="accountId" value={account.id} defaultChecked={values.accountIds.includes(account.id)} />{account.name} · {account.currency}</label>)}</div></fieldset>
        <fieldset disabled={!categoriesReady} className="rounded-lg border border-stone-300/15 p-3"><legend className="px-1 text-xs font-medium text-stone-500">Categoría</legend><div className="mt-1 grid max-h-36 gap-2 overflow-auto">{categories.map((category) => <label key={category.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="categoryId" value={category.id} defaultChecked={values.categoryIds.includes(category.id)} />{category.name}</label>)}</div></fieldset>
      </div></fieldset>
      <div className="flex flex-wrap items-center gap-3"><button className="min-h-11 rounded-lg bg-emerald-900 px-4 font-semibold text-white">Aplicar filtros</button><Link href={houseMode ? "/privado/historial?house=true" : "/privado/historial"} onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-stone-300/20 px-4 py-3 text-sm">Limpiar filtros</Link></div>
    </Form>
  </section>;
}
