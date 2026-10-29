import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth-buttons";
import { CachedEmailIngestionForm } from "@/components/cached-category-consumers";
import { listAccountOptions } from "@/modules/accounts/service";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";

export const dynamic = "force-dynamic";

export default async function NewEmailEntryPage() {
  const access = await requireAuthorizedPage();
  let accounts;
  try {
    accounts = (await listAccountOptions(getAuthRuntime().db, access.userId)).filter(item => item.openingBalance != null);
  } catch {
    redirect("/login?error=unavailable");
  }
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
          Entrada desde email
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Ingresar texto al registro
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-stone-600">
          Pegá el texto de un formato cubierto y elegí la cuenta. La app
          conserva el texto original; los datos ausentes o contradictorios
          quedan pendientes.
        </p>
        <div className="mt-10">
          <CachedEmailIngestionForm accounts={accounts} userId={access.userId} />
        </div>
      </div>
    </main>
  );
}
