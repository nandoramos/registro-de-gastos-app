// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PendingEntryForm } from "@/components/pending-entry-form";
import { PendingIncomeForm } from "@/components/pending-income-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("completa un pendiente y enlaza el gasto registrado", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json(
      {
        status: "registered",
        reviewedAt: "2026-10-22T12:00:00Z",
        expense: { id: "expense-completed" },
      },
      { status: 201 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(
    <PendingEntryForm
      entry={{
        id: "pending-1",
        interpretation: { title: "Compra pendiente", amount: "20,50" },
        issues: ["INVALID_DATE", "INVALID_ACCOUNT", "INVALID_CATEGORY"],
      }}
      accounts={[
        {
          id: "account-1",
          name: "Cuenta pesos",
          kind: "bank",
          currency: "UYU",
        },
      ]}
      categories={[
        { id: "category-1", name: "Alimentación", systemKey: "food" },
      ]}
    />,
  );

  await user.type(screen.getByLabelText("Fecha"), "2026-10-20");
  await user.selectOptions(
    screen.getByLabelText("Cuenta de origen"),
    "account-1",
  );
  await user.selectOptions(screen.getByLabelText("Categoría"), "category-1");
  await user.click(screen.getByRole("button", { name: "Guardar y registrar" }));

  const link = await screen.findByRole("link", {
    name: "Ver gasto registrado",
  });
  expect(link.getAttribute("href")).toBe("/privado/gastos/expense-completed");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/pending-entries/pending-1",
    expect.objectContaining({ method: "PATCH" }),
  );
});

it("muestra qué falta al intentar registrar un ingreso pendiente", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "pending", issues: ["INVALID_AMOUNT"] })));
  const user = userEvent.setup();
  render(<PendingIncomeForm entry={{ id: "income-pending", interpretation: { operationDate: "2026-10-20", title: "Ingreso", accountId: "account-1", amount: "10.00" }, issues: [] }} accounts={[{ id: "account-1", name: "Cuenta pesos", kind: "bank", currency: "UYU" }]} />);
  await user.click(screen.getByRole("button", { name: "Guardar y registrar" }));
  expect(await screen.findByText("Falta un importe positivo con hasta 2 decimales.")).toBeTruthy();
});
