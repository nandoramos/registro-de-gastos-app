"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { validateQuoteSettings, type QuoteSettings } from "@/modules/settings/domain";

export function QuoteSettingsForm({ initialSettings }: { initialSettings: QuoteSettings }) {
  const router = useRouter();
  const [buyRate, setBuyRate] = useState(initialSettings.buyRate);
  const [sellRate, setSellRate] = useState(initialSettings.sellRate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const validation = validateQuoteSettings({ buyRate, sellRate });

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(undefined);
    try {
      const response = await fetch("/api/settings/quotes", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buyRate, sellRate }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setBuyRate(body.buyRate);
      setSellRate(body.sellRate);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        code === "INVALID_BUY_RATE" || code === "INVALID_SELL_RATE"
          ? "Cada cotización debe ser positiva y tener hasta dos decimales."
          : "No pudimos guardar las cotizaciones. Revisá los valores e intentá de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid max-w-xl gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm leading-6 text-stone-600">Las cotizaciones se expresan en pesos uruguayos por dólar y sirven para sugerir conversiones y estimar el saldo total en USD.</p>
      <label className="text-sm font-medium">
        Cotización de compra (UYU por USD)
        <input aria-label="Cotización de compra" inputMode="decimal" value={buyRate} onChange={(event) => { setBuyRate(event.target.value); setSaved(false); }} required className="mt-2 min-h-12 w-full rounded-xl border px-4" />
      </label>
      <label className="text-sm font-medium">
        Cotización de venta (UYU por USD)
        <input aria-label="Cotización de venta" inputMode="decimal" value={sellRate} onChange={(event) => { setSellRate(event.target.value); setSaved(false); }} required className="mt-2 min-h-12 w-full rounded-xl border px-4" />
      </label>
      {validation.ok && validation.value.sellBelowBuy && <p role="note" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">La cotización de venta es menor que la de compra. Revisá los valores; podés guardarlos igualmente.</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{error}</p>}
      {saved && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Cotizaciones guardadas.</p>}
      <Button disabled={saving}>{saving ? "Guardando…" : "Guardar cotizaciones"}</Button>
    </form>
  );
}
