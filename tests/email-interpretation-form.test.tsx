// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmailInterpretationForm } from "@/components/email-interpretation-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("vista Probar interpretación", () => {
  it("muestra datos detectados y problemas sin enviar el texto", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EmailInterpretationForm />);
    await user.type(
      screen.getByLabelText("Texto sintético"),
      `ITAÚ
TRANSFERENCIA
Fecha: 23/10/2026
Destinatario: Persona Ejemplo
Importe debitado: USD 25,00`,
    );
    await user.click(screen.getByRole("button", { name: "Interpretar texto" }));

    expect(screen.getByText("Transferencia bancaria")).toBeTruthy();
    expect(screen.getByText("2026-10-23")).toBeTruthy();
    expect(screen.getByText("Persona Ejemplo")).toBeTruthy();
    expect(screen.getByText("USD 25.00")).toBeTruthy();
    expect(
      screen.getByText(
        "Hay que decidir si la transferencia es un gasto o un traslado propio.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Esta prueba se procesa en el navegador y no crea entradas ni movimientos.",
      ),
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
