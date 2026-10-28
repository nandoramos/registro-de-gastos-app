import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth-buttons";
import { ExpenseEditForm } from "@/components/expense-edit-form";
import { ExpenseRevisionList } from "@/components/expense-revision-list";
import { MovementStatusActions } from "@/components/movement-status-actions";
import { listAccounts } from "@/modules/accounts/service";
import { requireAuthorizedPage } from "@/modules/auth/page";
import { getAuthRuntime } from "@/modules/auth/server";
import { listCategories } from "@/modules/categories/service";
import { getExpenseDetail } from "@/modules/expenses/service";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await requireAuthorizedPage();

  let expense;
  let accounts;
  let categories;
  try {
    [expense, accounts, categories] = await Promise.all([
      getExpenseDetail(getAuthRuntime().db, access.userId, (await params).id),
      listAccounts(getAuthRuntime().db, access.userId, true),
      listCategories(getAuthRuntime().db, access.userId, true),
    ]);
  } catch {
    redirect("/login?error=unavailable");
  }
  if (!expense) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-7">
        <Link href="/privado" className="font-semibold">
          Registro de Gastos
        </Link>
        <SignOutButton />
      </header>
      <div className="py-10 sm:py-14">
        <Link
          href="/privado/gastos/nuevo"
          className="text-sm font-semibold text-emerald-900 underline underline-offset-4"
        >
          Registrar otro gasto
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Gasto registrado
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {expense.title}
        </h1>
        {expense.voidedAt && <p className="mt-3 font-medium text-amber-800">Este movimiento está anulado y no participa en totales.</p>}
        <div className="mt-6"><MovementStatusActions type="expense" id={expense.id} voided={Boolean(expense.voidedAt)} /></div>
        <p className="mt-4 text-2xl font-semibold">
          {expense.currency} {expense.amount}
        </p>

        <dl className="mt-10 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Fecha del gasto
            </dt>
            <dd className="mt-1 font-medium">{expense.operationDate}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Hora
            </dt>
            <dd className="mt-1 font-medium">
              {expense.operationTime?.slice(0, 5) ?? "No indicada"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Cuenta de origen
            </dt>
            <dd className="mt-1 font-medium">{expense.account.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-stone-500">
              Categoría
            </dt>
            <dd className="mt-1 font-medium">{expense.category.name}</dd>
          </div>
          {expense.note && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-stone-500">
                Nota
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">{expense.note}</dd>
            </div>
          )}
        </dl>

        {!expense.voidedAt && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Corregir gasto</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Los cambios válidos se aplican al gasto. La evidencia original no se modifica.
            </p>
            <ExpenseEditForm
              expense={expense}
              accounts={accounts}
              categories={categories}
            />
          </section>
        )}

        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Historial de correcciones</h2>
          <ExpenseRevisionList
            history={expense.history}
            accounts={accounts}
            categories={categories}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="text-xl font-semibold">Evidencia y procedencia</h2>
          <p className="mt-3 text-sm text-stone-600">
            {expense.source.type === "email"
              ? "Texto de email recibido"
              : "Entrada manual recibida"}{" "}
            el {expense.source.receivedAt.toLocaleString("es-UY")}. El contenido
            original se conserva separado del gasto normalizado.
          </p>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-stone-900 p-4 text-xs leading-5 text-stone-100">
            {JSON.stringify(expense.source.original, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
