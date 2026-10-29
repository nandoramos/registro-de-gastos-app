// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransferForm } from "@/components/transfer-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accounts = [
  {
    id: "bank-a",
    name: "Banco A",
    kind: "bank" as const,
    currency: "UYU" as const,
  },
  {
    id: "bank-b",
    name: "Banco B",
    kind: "bank" as const,
    currency: "UYU" as const,
  },
  {
    id: "cash",
    name: "Billetera",
    kind: "cash" as const,
    currency: "UYU" as const,
  },
  {
    id: "cash-other",
    name: "Cajoncete",
    kind: "cash" as const,
    currency: "UYU" as const,
  },
  {
    id: "bank-usd",
    name: "Prex dólares",
    kind: "bank" as const,
    currency: "USD" as const,
  },
  {
    id: "cash-usd",
    name: "Cajoncete dólares",
    kind: "cash" as const,
    currency: "USD" as const,
  },
];

describe("formulario de transferencias propias", () => {
  it("usa fecha actual, genera el detalle y completa ambos importes al ingresar una vez", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { id: "transfer-1", title: "Traslado", kind: "transfer" },
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} />);

    const operationDate = (screen.getByLabelText("Fecha") as HTMLInputElement).value;
    expect(operationDate).not.toBe("");
    expect(screen.getByRole("button", { name: "Guardar pendiente" })).toBeTruthy();
    await user.selectOptions(
      screen.getByLabelText("Cuenta de destino"),
      "bank-b",
    );
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Transferencia: Banco A → Banco B");
    await user.type(screen.getByLabelText("Importe"), "100,25");
    await user.click(
      screen.getByRole("button", { name: "Registrar transferencia" }),
    );

    expect(
      (await screen.findByRole("link", { name: "Ver operación" })).getAttribute(
        "href",
      ),
    ).toBe("/privado/transferencias/transfer-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transfers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          kind: "transfer",
          operationDate,
          title: "Transferencia: Banco A → Banco B",
          note: "",
          sourceAccountId: "bank-a",
          destinationAccountId: "bank-b",
          sourceAmount: "100,25",
          destinationAmount: "100,25",
          currency: "UYU",
        }),
      }),
    );
  });

  it("clasifica el destino en efectivo como retiro y permite elegir otra cuenta de efectivo", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} />);
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "cash");
    expect(screen.getByText("Retiro")).toBeTruthy();
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Retiro: Banco A → Billetera");
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "cash-other");
    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("cash-other");
  });

  it("clasifica banco a efectivo como retiro sin restringir la cuenta de destino", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "withdrawal-1", kind: "withdrawal" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} />);
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "cash");
    expect(screen.getByRole("button", { name: "Registrar retiro" })).toBeTruthy();
    await user.type(screen.getByLabelText("Importe"), "250");
    await user.click(screen.getByRole("button", { name: "Registrar retiro" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/transfers", expect.objectContaining({
      body: expect.stringContaining('"kind":"withdrawal"'),
    }));
  });

  it("registra una conversión con dos importes editables y clasifica banco a efectivo como retiro también", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "conversion-1" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} />);
    await user.selectOptions(screen.getByLabelText("Cuenta de origen"), "bank-usd");
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "cash");

    expect(screen.getByText("Conversión y retiro")).toBeTruthy();
    await user.type(screen.getByLabelText("Importe debitado"), "100");
    await user.type(screen.getByLabelText("Importe acreditado"), "4050");
    await user.click(screen.getByLabelText("Confirmé el importe acreditado real"));
    await user.click(screen.getByRole("button", { name: "Registrar conversión y retiro" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/conversions", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"sourceAmount":"100"'),
    }));
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual(expect.objectContaining({
      sourceAccountId: "bank-usd",
      destinationAccountId: "cash",
      sourceAmount: "100",
      destinationAmount: "4050",
      sourceCurrency: "USD",
      destinationCurrency: "UYU",
      destinationConfirmed: true,
    }));
  });

  it("enlaza una carga incompleta con su revisión pendiente", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { id: "pending-1", issues: ["INVALID_DESTINATION_AMOUNT"] },
            { status: 202 },
          ),
        ),
    );
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} />);
    await user.clear(screen.getByLabelText("Título"));
    await user.selectOptions(
      screen.getByLabelText("Cuenta de destino"),
      "bank-b",
    );
    await user.type(screen.getByLabelText("Importe"), "100");
    await user.click(
      screen.getByRole("button", { name: "Registrar transferencia" }),
    );

    expect(
      (
        await screen.findByRole("link", {
          name: "Completar entrada pendiente",
        })
      ).getAttribute("href"),
    ).toBe("/privado/pendientes/pending-1");
  });

  it("completa una transferencia pendiente desde la misma interfaz", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        {
          status: "registered",
          transfer: { id: "transfer-2", kind: "transfer" },
        },
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <TransferForm
        accounts={accounts}
        entry={{
          id: "pending-2",
          issues: ["INVALID_DESTINATION_AMOUNT"],
          interpretation: {
            kind: "transfer",
            operationDate: "2026-10-23",
            title: "Traslado pendiente",
            sourceAccountId: "bank-a",
            destinationAccountId: "bank-b",
            sourceAmount: "75.00",
            currency: "UYU",
          },
        }}
      />,
    );
    await user.type(screen.getByLabelText("Importe acreditado"), "75.00");
    await user.click(
      screen.getByRole("button", { name: "Guardar y registrar" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pending-entries/pending-2",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(
      (await screen.findByRole("link", { name: "Ver operación" })).getAttribute(
        "href",
      ),
    ).toBe("/privado/transferencias/transfer-2");
  });
});
