// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteSettingsForm } from "@/components/quote-settings-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("configuración de cotizaciones", () => {
  it("advierte si venta queda debajo de compra pero permite guardar ambas juntas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ buyRate: "42.00", sellRate: "39.00" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<QuoteSettingsForm initialSettings={{ buyRate: "40.00", sellRate: "40.00" }} />);

    await user.clear(screen.getByLabelText("Cotización de compra"));
    await user.type(screen.getByLabelText("Cotización de compra"), "42");
    await user.clear(screen.getByLabelText("Cotización de venta"));
    await user.type(screen.getByLabelText("Cotización de venta"), "39");
    expect(screen.getByText(/venta es menor que la de compra/i)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Guardar cotizaciones" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings/quotes",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ buyRate: "42", sellRate: "39" }),
      }),
    );
    expect(await screen.findByRole("status")).toBeTruthy();
  });
});
