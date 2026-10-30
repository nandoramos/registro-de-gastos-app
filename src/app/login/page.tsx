import { SignInButton } from "@/components/auth-buttons";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-between px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-xl bg-emerald-900 text-xl text-white"
        >
          ↗
        </span>
        <span className="text-sm font-semibold tracking-tight">
          Registro de Gastos APP 
        </span>
      </header>
      <section className="mx-auto w-full max-w-md py-16">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Tu espacio personal
        </p>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Entender tus gastos.
          <br />
          <span className="text-stone-500">Con más calma.</span>
        </h1>
        <p className="mt-6 text-base leading-7 text-stone-600">
          Un lugar privado para llevar tu registro y ver adónde va tu dinero.
        </p>
        <div className="mt-9 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 font-semibold">Ingresá a tu registro</h2>
          <p className="mb-6 text-sm leading-6 text-stone-600">
            Usá la cuenta de Google autorizada para este espacio.
          </p>
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"
            >
              {error === "unavailable"
                ? "El servicio no está disponible temporalmente. Intentá nuevamente en unos minutos."
                : "No se pudo autorizar el acceso. Intentá con la cuenta habilitada."}
            </p>
          )}
          <SignInButton />
          <p className="mt-4 text-xs leading-5 text-stone-500">
            Google se usa únicamente para identificarte. No accedemos a Gmail ni
            a tus correos.
          </p>
        </div>
      </section>
      <footer className="text-xs text-stone-500">
        Registro personal · Acceso privado
      </footer>
    </main>
  );
}
