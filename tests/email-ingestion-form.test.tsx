// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailIngestionForm } from "@/components/email-ingestion-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accounts = [
  { id: "uyu", name: "Pesos", kind: "bank" as const, currency: "UYU" as const },
];
const categories = [
  { id: "food", name: "Alimentación", systemKey: "food" as const },
];

it("conserva texto y selección si la categoría elegida se archiva durante una actualización", async () => {
  const user = userEvent.setup();
  const view = render(<EmailIngestionForm accounts={accounts} categories={categories} />);
  await user.type(screen.getByLabelText("Texto del email"), "Texto sintético conservado");
  await user.selectOptions(screen.getByLabelText("Categoría"), "food");
  view.rerender(<EmailIngestionForm accounts={accounts} categories={[{ ...categories[0], archivedAt: new Date() }]} />);
  expect((screen.getByLabelText("Texto del email") as HTMLTextAreaElement).value).toBe("Texto sintético conservado");
  expect((screen.getByLabelText("Categoría") as HTMLSelectElement).value).toBe("food");
  expect((screen.getByRole("button", { name: "Ingresar al registro" }) as HTMLButtonElement).disabled).toBe(true);
});

it("envía una compra interpretada con la selección manual y enlaza el gasto", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(Response.json({ id: "expense-1" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup();
  render(<EmailIngestionForm accounts={accounts} categories={categories} />);
  const text = `ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Comercio: Mercado Ejemplo
Importe debitado: UYU 100,00`;
  await user.type(screen.getByLabelText("Texto del email"), text);
  await user.selectOptions(screen.getByLabelText("Cuenta de origen"), "uyu");
  await user.selectOptions(screen.getByLabelText("Categoría"), "food");
  await user.click(
    screen.getByRole("button", { name: "Ingresar al registro" }),
  );
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/email-entries",
    expect.objectContaining({
      body: JSON.stringify({
        text,
        accountId: "uyu",
        categoryId: "food",
        nature: "expense",
      }),
    }),
  );
  expect(
    (await screen.findByRole("link", { name: "Ver gasto" })).getAttribute(
      "href",
    ),
  ).toBe("/privado/gastos/expense-1");
});

it("muestra una asignación inequívoca y permite corregirla", async () => {
  const user = userEvent.setup();
  const choices = [
    ...accounts,
    {
      id: "usd",
      name: "Dólares",
      kind: "bank" as const,
      currency: "USD" as const,
    },
  ];
  render(<EmailIngestionForm accounts={choices} categories={categories} />);
  await user.type(
    screen.getByLabelText("Texto del email"),
    `ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Comercio: Mercado Ejemplo
Importe debitado: USD 20,00`,
  );
  const select = screen.getByLabelText("Cuenta de origen") as HTMLSelectElement;
  expect(select.value).toBe("usd");
  expect(screen.getByText(/Asignada automáticamente/)).toBeTruthy();
  await user.selectOptions(select, "uyu");
  expect(select.value).toBe("uyu");
  expect(screen.queryByText(/Asignada automáticamente/)).toBeNull();
});
