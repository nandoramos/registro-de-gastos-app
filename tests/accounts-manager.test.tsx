// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountsManager } from "@/components/accounts-manager";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("gestión de cuentas", () => {
  it("ofrece preparar la cuenta Billetera en pesos sin inventar su saldo", async () => {
    const user = userEvent.setup();
    render(<AccountsManager initialAccounts={[]} />);
    await user.click(screen.getByRole("button", { name: "Agregar Billetera" }));
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Billetera");
    expect((screen.getByLabelText("Tipo") as HTMLSelectElement).value).toBe("cash");
    expect((screen.getByLabelText("Saldo inicial") as HTMLInputElement).value).toBe("");
  });
  it("muestra totales iniciales por moneda e indica cuentas sin configurar", () => {
    render(<AccountsManager initialAccounts={[
      { id: "a", name: "Pesos", kind: "bank", currency: "UYU", openingBalance: "100.20", openingDate: "2026-10-28" },
      { id: "b", name: "Sin saldo", kind: "bank", currency: "USD", openingBalance: null, openingDate: null },
    ]} />);
    expect(screen.getByText(/total general está incompleto/i)).toBeTruthy();
    expect(screen.getByText(/total UYU: 100,20/i)).toBeTruthy();
    expect(screen.getByText(/total estimado en USD: incompleto/i)).toBeTruthy();
  });
  it("estima el total en USD a cotización de venta e incluye cuentas en efectivo", () => {
    render(<AccountsManager
      initialAccounts={[
        { id: "usd", name: "Banco USD", kind: "bank", currency: "USD", openingBalance: "50.00", openingDate: "2026-10-28", balance: "50.00" },
        { id: "cash", name: "Billetera UYU", kind: "cash", currency: "UYU", openingBalance: "2000.00", openingDate: "2026-10-28", balance: "2000.00" },
      ]}
      quoteSettings={{ buyRate: "39.00", sellRate: "40.00" }}
    />);
    expect(screen.getByText(/total UYU: 2000,00/i)).toBeTruthy();
    expect(screen.getByText(/total USD: 50,00/i)).toBeTruthy();
    expect(screen.getByText(/total estimado en USD: 100,00/i)).toBeTruthy();
    expect(screen.getByText(/cotización de venta: 40,00/i)).toBeTruthy();
  });
  it("incluye saldos archivados en totales aunque oculte las cuentas", () => {
    const archivedAt = new Date("2026-10-01T00:00:00Z");
    render(<AccountsManager
      initialAccounts={[
        { id: "active-uyu", name: "Itaú pesos", kind: "bank", currency: "UYU", openingBalance: "100.00", openingDate: "2026-10-01", balance: "100.00" },
        { id: "archived-uyu", name: "Cuenta archivada", kind: "bank", currency: "UYU", openingBalance: "50.00", openingDate: "2026-10-01", balance: "50.00", archivedAt },
        { id: "usd", name: "Itaú dólares", kind: "bank", currency: "USD", openingBalance: "25.00", openingDate: "2026-10-01", balance: "25.00" },
      ]}
      quoteSettings={{ buyRate: "45.00", sellRate: "50.00" }}
    />);
    expect(screen.queryByText("Cuenta archivada")).toBeNull();
    expect(screen.getByText(/total UYU: 150,00/i)).toBeTruthy();
    expect(screen.getByText(/total estimado en USD: 28,00/i)).toBeTruthy();
  });
  it("muestra cuentas archivadas y permite recuperarlas", async () => {
    const user = userEvent.setup();
    const account = { id: "old", name: "Cuenta anterior", kind: "bank" as const, currency: "UYU" as const, archivedAt: new Date(), openingBalance: "20.00", openingDate: "2026-10-28" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...account, archivedAt: null })));
    render(<AccountsManager initialAccounts={[account]} />);
    expect(screen.queryByText("Cuenta anterior")).toBeNull();
    await user.click(screen.getByLabelText("Mostrar archivadas"));
    await user.click(screen.getByRole("button", { name: "Desarchivar" }));
    expect(await screen.findByRole("button", { name: "Archivar" })).toBeTruthy();
  });
  it("permite configurar el saldo inicial de una cuenta existente sin asumir cero", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "existing", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: "150.00", openingDate: "2026-10-28" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AccountsManager initialAccounts={[{ id: "existing", name: "Billetera", kind: "cash", currency: "UYU", openingBalance: null, openingDate: null }]} />);
    expect(screen.getByText(/saldo inicial pendiente/i)).toBeTruthy();
    await user.type(screen.getByLabelText("Saldo inicial de Billetera"), "150");
    await user.clear(screen.getByLabelText("Fecha inicial de Billetera"));
    await user.type(screen.getByLabelText("Fecha inicial de Billetera"), "2026-10-28");
    await user.click(screen.getByRole("button", { name: "Guardar saldo inicial de Billetera" }));
    expect(await screen.findByText(/Saldo: UYU 150,00/)).toBeTruthy();
  });
  it("crea una cuenta desde la interfaz y la muestra sin recargar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          id: "new-account",
          name: "Efectivo dólares",
          kind: "cash",
          currency: "USD",
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<AccountsManager initialAccounts={[]} />);
    await user.type(screen.getByLabelText("Nombre"), "Efectivo dólares");
    await user.selectOptions(screen.getByLabelText("Tipo"), "cash");
    await user.selectOptions(screen.getByLabelText("Moneda"), "USD");
    await user.type(screen.getByLabelText("Saldo inicial"), "120,50");
    await user.clear(screen.getByLabelText("Fecha inicial"));
    await user.type(screen.getByLabelText("Fecha inicial"), "2026-10-28");
    await user.click(screen.getByRole("button", { name: "Agregar cuenta" }));

    await screen.findByText("Efectivo dólares");
    expect(screen.getByText("Efectivo · USD")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/accounts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Efectivo dólares",
          kind: "cash",
          currency: "USD",
          openingBalance: "120,50",
          openingDate: "2026-10-28",
        }),
      }),
    );
  });

  it("renombra sin ofrecer cambios de tipo o moneda", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        id: "account-1",
        name: "Itaú pesos",
        kind: "bank",
        currency: "UYU",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <AccountsManager
        initialAccounts={[
          {
            id: "account-1",
            name: "Itaú",
            kind: "bank",
            currency: "UYU",
          },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Renombrar" }));
    const accountRow = within(screen.getByRole("listitem"));
    expect(accountRow.queryByLabelText("Tipo")).toBeNull();
    expect(accountRow.queryByLabelText("Moneda")).toBeNull();
    const input = screen.getByLabelText("Nuevo nombre");
    await user.clear(input);
    await user.type(input, "Itaú pesos");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByText("Itaú pesos")).toBeTruthy());
    expect(screen.getByText("Cuenta bancaria · UYU")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/accounts/account-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Itaú pesos" }),
      }),
    );
  });

  it("muestra el error de validación y permite corregir", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "INVALID_NAME" }, { status: 422 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<AccountsManager initialAccounts={[]} />);
    await user.type(screen.getByLabelText("Nombre"), "Cuenta");
    await user.type(screen.getByLabelText("Saldo inicial"), "0");
    await user.click(screen.getByRole("button", { name: "Agregar cuenta" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ingresá un nombre de hasta 80 caracteres.",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Agregar cuenta",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
