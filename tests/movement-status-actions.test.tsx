// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovementStatusActions } from "@/components/movement-status-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("mantiene el mensaje de restauración después de refrescar el estado", async () => {
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "active", changed: true })));
  const user = userEvent.setup();
  const view = render(<MovementStatusActions type="income" id="income-1" voided />);
  await user.click(screen.getByRole("button", { name: "Restaurar movimiento" }));
  expect(await screen.findByText(/Movimiento restaurado/i)).toBeTruthy();
  view.rerender(<MovementStatusActions type="income" id="income-1" voided={false} />);
  expect(screen.getByText(/Movimiento restaurado/i)).toBeTruthy();
});

it("pide confirmación antes de anular el movimiento", async () => {
  const confirm = vi.fn().mockReturnValue(false);
  const fetchMock = vi.fn();
  vi.stubGlobal("confirm", confirm); vi.stubGlobal("fetch", fetchMock);
  const user = userEvent.setup(); render(<MovementStatusActions type="expense" id="expense-1" voided={false} />);
  await user.click(screen.getByRole("button", { name: "Anular movimiento" }));
  expect(confirm).toHaveBeenCalledOnce(); expect(fetchMock).not.toHaveBeenCalled();
});
