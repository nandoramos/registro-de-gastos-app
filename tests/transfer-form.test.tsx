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

  it("sugiere Billetera como destino al elegir retiro y permite elegir otra cuenta de efectivo", async () => {
    const user = userEvent.setup();
    render(<TransferForm accounts={accounts} />);
    await user.selectOptions(screen.getByLabelText("Tipo de operación"), "withdrawal");
    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("cash");
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Retiro: Banco A → Billetera");
    await user.selectOptions(screen.getByLabelText("Cuenta de destino"), "cash-other");
    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("cash-other");
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
