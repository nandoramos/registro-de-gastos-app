export function PageLoading({
  title,
  label,
}: {
  title: string;
  label: string;
}) {
  return (
    <main
      aria-busy="true"
      className="mx-auto min-h-dvh max-w-7xl px-5 py-8 sm:px-10 sm:py-12"
    >
      <div role="status" aria-label={label} className="py-8">
        <p className="text-sm text-stone-500">{label}…</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>
        <div
          aria-hidden="true"
          className="mt-8 grid gap-4 motion-safe:animate-pulse"
        >
          <div className="h-12 w-2/3 rounded-xl bg-stone-400/15" />
          <div className="h-28 rounded-xl bg-stone-400/15" />
          <div className="h-28 rounded-xl bg-stone-400/15" />
        </div>
      </div>
    </main>
  );
}
