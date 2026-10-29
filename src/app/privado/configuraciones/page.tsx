import Link from "next/link";
import { redirect } from "next/navigation";
import { QuoteSettingsForm } from "@/components/quote-settings-form";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { getQuoteSettings } from "@/modules/settings/service";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const access = await requireAuthorizedPage();
  let settings;
  try {
    settings = await getQuoteSettings(getAuthRuntime().db, access.userId);
  } catch {
    redirect("/login?error=unavailable");
  }
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-8 sm:px-12 sm:py-12">
      <Link href="/privado" className="font-semibold">Registro de Gastos</Link>
      <div className="py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Preferencias</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Configuraciones</h1>
        <h2 className="mb-4 mt-10 text-2xl font-semibold">Cotizaciones del dólar</h2>
        <QuoteSettingsForm initialSettings={settings} />
      </div>
    </main>
  );
}
