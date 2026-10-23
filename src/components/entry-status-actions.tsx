"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EntryStatusActions({
  entryId,
  status,
}: {
  entryId: string;
  status: "pending" | "discarded";
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const discarding = status === "pending";

  async function act() {
    setBusy(true);
    setError(false);
    try {
      const prefix = discarding ? "pending-entries" : "discarded-entries";
      const action = discarding ? "discard" : "recover";
      const response = await fetch(
        "/api/" + prefix + "/" + entryId + "/" + action,
        { method: "POST" },
      );
      if (!response.ok) throw new Error();
      setDone(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
        <p>{discarding ? "Entrada descartada." : "Entrada recuperada."}</p>
        <Link
          href={discarding ? "/privado/descartadas" : "/privado/pendientes"}
          className="mt-2 inline-block font-semibold underline"
        >
          Ver lista
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Button type="button" variant="outline" disabled={busy} onClick={act}>
        {busy
          ? "Guardando…"
          : discarding
            ? "Descartar entrada"
            : "Recuperar a pendientes"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          No pudimos guardar el cambio. Intentá nuevamente.
        </p>
      )}
    </div>
  );
}
