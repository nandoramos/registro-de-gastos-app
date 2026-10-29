import type { AccountView } from "@/modules/accounts/domain";
import type { CategoryView } from "@/modules/categories/domain";
import type { ExpenseInput, ExpenseRevision } from "@/modules/expenses/domain";
import { formatMoneyAmount } from "@/modules/money/format";

type ChangedField = {
  label: string;
  previous: string;
  current: string;
};

function changedFields(
  revision: ExpenseRevision,
  accounts: AccountView[],
  categories: CategoryView[],
): ChangedField[] {
  const accountName = (id: string) =>
    accounts.find((account) => account.id === id)?.name ?? id;
  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? id;
  const display: Record<
    keyof ExpenseInput,
    { label: string; value: (value: string | null) => string }
  > = {
    operationDate: { label: "Fecha", value: (value) => value ?? "" },
    operationTime: {
      label: "Hora",
      value: (value) => value?.slice(0, 5) || "Sin indicar",
    },
    title: { label: "Título", value: (value) => value ?? "" },
    note: { label: "Nota", value: (value) => value || "Sin nota" },
    accountId: { label: "Cuenta", value: (value) => accountName(value ?? "") },
    categoryId: {
      label: "Categoría",
      value: (value) => categoryName(value ?? ""),
    },
    amount: { label: "Importe", value: (value) => value ?? "" },
    currency: { label: "Moneda", value: (value) => value ?? "" },
  };

  return (Object.keys(display) as (keyof ExpenseInput)[])
    .filter((key) => revision.previous[key] !== revision.current[key])
    .map((key) => ({
      label: display[key].label,
      previous: key === "amount"
        ? formatMoneyAmount(revision.previous.currency, revision.previous.amount)
        : display[key].value(revision.previous[key]),
      current: key === "amount"
        ? formatMoneyAmount(revision.current.currency, revision.current.amount)
        : display[key].value(revision.current[key]),
    }));
}

export function ExpenseRevisionList({
  history,
  accounts,
  categories,
}: {
  history: ExpenseRevision[];
  accounts: AccountView[];
  categories: CategoryView[];
}) {
  if (history.length === 0) {
    return (
      <p className="mt-3 text-sm text-stone-600">
        Este gasto todavía no tiene correcciones.
      </p>
    );
  }

  return (
    <ol className="mt-5 grid gap-4">
      {history.map((revision) => (
        <li
          key={revision.id}
          className="rounded-xl border border-stone-200 p-4"
        >
          <p className="text-xs uppercase tracking-wide text-stone-500">
            {revision.changedAt.toLocaleString("es-UY")}
          </p>
          <dl className="mt-3 grid gap-2">
            {changedFields(revision, accounts, categories).map((field) => (
              <div key={field.label} className="text-sm">
                <dt className="inline font-medium">{field.label}:</dt>{" "}
                <dd className="inline">
                  {field.previous} → {field.current}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ol>
  );
}
