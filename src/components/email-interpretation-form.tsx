"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  emailInterpretationIssueLabel,
  parseItauEmailText,
  type EmailInterpretation,
} from "@/modules/email-import/itau-parser";

const kindLabels = {
  expense: "Compra con débito",
  "bank-transfer": "Transferencia bancaria",
  unknown: "Formato no reconocido",
};

export function EmailInterpretationForm() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<EmailInterpretation>();

  function submit(event: FormEvent) {
    event.preventDefault();
    setResult(parseItauEmailText(text));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        onSubmit={submit}
      >
        <label className="text-sm font-medium">
          Texto sintético
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={14}
            className="mt-2 w-full rounded-xl border px-4 py-3 font-mono text-sm"
            placeholder={`ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Hora: 14:35
Comercio: Mercado Ejemplo
Importe debitado: UYU 1.234,56`}
          />
        </label>
        <Button className="mt-5">Interpretar texto</Button>
        <p className="mt-4 text-sm leading-6 text-stone-600">
          Esta prueba se procesa en el navegador y no crea entradas ni
          movimientos.
        </p>
      </form>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Resultado</h2>
        {!result ? (
          <p className="mt-4 text-stone-600">
            Pegá un texto sintético para ver los datos respaldados y los
            problemas detectados.
          </p>
        ) : (
          <div className="mt-5 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500">
                Tipo detectado
              </p>
              <p className="mt-1 font-semibold">{kindLabels[result.kind]}</p>
              <p className="mt-1 text-xs text-stone-500">
                Formato: {result.format}
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {result.fields.operationDate && (
                <Field label="Fecha" value={result.fields.operationDate} />
              )}
              {result.fields.operationTime && (
                <Field label="Hora" value={result.fields.operationTime} />
              )}
              {result.fields.title && (
                <Field label="Comercio" value={result.fields.title} />
              )}
              {result.fields.recipient && (
                <Field label="Destinatario" value={result.fields.recipient} />
              )}
              {result.fields.amount && (
                <Field
                  label="Importe debitado"
                  value={`${result.fields.currency ? `${result.fields.currency} ` : ""}${result.fields.amount}`}
                />
              )}
            </dl>
            <div>
              <h3 className="font-semibold">
                Problemas y decisiones pendientes
              </h3>
              {result.issues.length === 0 ? (
                <p className="mt-2 text-sm text-emerald-800">
                  No se detectaron problemas en los campos cubiertos.
                </p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {result.issues.map((issue) => (
                    <li key={issue}>{emailInterpretationIssueLabel(issue)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
