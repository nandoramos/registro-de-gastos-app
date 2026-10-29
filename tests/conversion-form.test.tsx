// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversionForm } from "@/components/conversion-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const accounts = [
  {
    id: "usd",
    name: "Dólares",
    kind: "bank" as const,
    currency: "USD" as const,
  },
  { id: "uyu", name: "Pesos", kind: "bank" as const, currency: "UYU" as const },
];

describe("formulario de conversiones", () => {
  it("usa la cotización como ayuda y envía importes confirmados", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ id: "conversion-1" }, { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ConversionForm accounts={accounts} />);

    await user.clear(screen.getByLabelText("Fecha"));
    await user.type(screen.getByLabelText("Fecha"), "2026-10-24");
    await user.type(screen.getByLabelText("Título"), "Compra de pesos");
    await user.type(screen.getByLabelText("Importe debitado"), "10");
    await user.clear(screen.getByLabelText("Cotización de referencia"));
    await user.type(screen.getByLabelText("Cotización de referencia"), "40,25");
    await user.click(
      screen.getByRole("button", { name: "Calcular acreditación" }),
    );
    expect(
      (screen.getByLabelText("Importe acreditado") as HTMLInputElement).value,
    ).toBe("402.50");
    await user.click(
      screen.getByLabelText("Confirmé el importe acreditado real"),
    );
    await user.selectOptions(
      screen.getByLabelText("Institución (opcional)"),
      "itau",
    );
    await user.click(
      screen.getByRole("button", { name: "Registrar conversión" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operationDate: "2026-10-24",
          title: "Compra de pesos",
          note: "",
          sourceAccountId: "usd",
          destinationAccountId: "uyu",
          sourceAmount: "10",
          destinationAmount: "402.50",
          sourceCurrency: "USD",
          destinationCurrency: "UYU",
          destinationConfirmed: true,
          quote: "40,25",
          institution: "itau",
          otherInstitutionName: "",
        }),
      }),
    );
    expect(
      (
        await screen.findByRole("link", { name: "Ver conversión" })
      ).getAttribute("href"),
    ).toBe("/privado/conversiones/conversion-1");
  });

  it("muestra el nombre requerido cuando se elige Otra", async () => {
    const user = userEvent.setup();
    render(<ConversionForm accounts={accounts} />);
    expect(screen.queryByLabelText("Nombre de la institución")).toBeNull();
    await user.selectOptions(
      screen.getByLabelText("Institución (opcional)"),
      "other",
    );
    expect(screen.getByLabelText("Nombre de la institución")).toBeTruthy();
  });

  it("sugiere compra al vender dólares y venta al comprar dólares", async () => {
    const user = userEvent.setup();
    render(<ConversionForm accounts={accounts} quoteSettings={{ buyRate: "39.00", sellRate: "41.00" }} />);
    expect((screen.getByLabelText("Cotización de referencia") as HTMLInputElement).value).toBe("39.00");
    expect(screen.getByText(/cotización de compra/i)).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Cuenta de origen"), "uyu");
    expect((screen.getByLabelText("Cotización de referencia") as HTMLInputElement).value).toBe("41.00");
    expect(screen.getByText(/cotización de venta/i)).toBeTruthy();
    expect((screen.getByLabelText("Cuenta de destino") as HTMLSelectElement).value).toBe("usd");
  });

  it("completa una conversión pendiente desde la misma interfaz", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { status: "registered", conversion: { id: "conversion-2" } },
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <ConversionForm
        accounts={accounts}
        entry={{
          id: "pending-1",
          issues: ["DESTINATION_NOT_CONFIRMED"],
          interpretation: {
            entryType: "conversion",
            operationDate: "2026-10-24",
            title: "Compra de pesos",
            sourceAccountId: "usd",
            destinationAccountId: "uyu",
            sourceAmount: "10.00",
            destinationAmount: "402.50",
            sourceCurrency: "USD",
            destinationCurrency: "UYU",
            quote: "40.25",
          },
        }}
      />,
    );
    await user.click(
      screen.getByLabelText("Confirmé el importe acreditado real"),
    );
    await user.click(
      screen.getByRole("button", { name: "Guardar y registrar" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pending-entries/pending-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(
      (
        await screen.findByRole("link", { name: "Ver conversión" })
      ).getAttribute("href"),
    ).toBe("/privado/conversiones/conversion-2");
  });
});
