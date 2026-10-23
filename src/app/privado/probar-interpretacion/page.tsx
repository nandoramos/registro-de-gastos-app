import Link from "next/link";
import { SignOutButton } from "@/components/auth-buttons";
import { EmailInterpretationForm } from "@/components/email-interpretation-form";
import { requireAuthorizedPage } from "@/modules/auth/page";

export const dynamic = "force-dynamic";

export default async function TryInterpretationPage() {
  await requireAuthorizedPage();
  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7">
        <Link href="/privado" className="font-semibold">
          Registro de Gastos
        </Link>
        <SignOutButton />
      </header>
      <div className="py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Prueba sin guardar
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Probar interpretación
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">
          Probá textos sintéticos con los formatos documentados de compra con
          débito o transferencia. Esta herramienta muestra únicamente datos
          explícitos y señala lo que falta o sigue siendo ambiguo.
        </p>
        <div className="mt-10">
          <EmailInterpretationForm />
        </div>
      </div>
    </main>
  );
}
