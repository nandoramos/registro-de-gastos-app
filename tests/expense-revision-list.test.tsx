// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExpenseRevisionList } from "@/components/expense-revision-list";

afterEach(cleanup);

describe("historial visible de correcciones", () => {
  it("muestra cada campo modificado con nombres de cuenta y categoría", () => {
    render(
      <ExpenseRevisionList
        accounts={[
          { id: "cash", name: "Efectivo", kind: "cash", currency: "UYU" },
          { id: "bank", name: "Banco", kind: "bank", currency: "UYU" },
        ]}
        categories={[
          { id: "food", name: "Alimentación", systemKey: "food" },
          { id: "health", name: "Salud", systemKey: "health" },
        ]}
        history={[
          {
            id: "revision-1",
            changedAt: new Date("2026-10-20T12:00:00Z"),
            previous: {
              operationDate: "2026-10-18",
              operationTime: null,
              title: "Compra",
              note: null,
              accountId: "cash",
              categoryId: "food",
              amount: "42.50",
              currency: "UYU",
            },
            current: {
              operationDate: "2026-10-19",
              operationTime: "09:30",
              title: "Compra",
              note: "Corregida",
              accountId: "bank",
              categoryId: "health",
              amount: "42.50",
              currency: "UYU",
            },
          },
        ]}
      />,
    );

    const revision = screen.getByRole("listitem").textContent;
    expect(revision).toContain("Fecha: 2026-10-18 → 2026-10-19");
    expect(revision).toContain("Hora: Sin indicar → 09:30");
    expect(revision).toContain("Nota: Sin nota → Corregida");
    expect(revision).toContain("Cuenta: Efectivo → Banco");
    expect(revision).toContain("Categoría: Alimentación → Salud");
    expect(screen.queryByText(/Importe/)).toBeNull();
  });
});
