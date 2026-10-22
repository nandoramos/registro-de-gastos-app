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
