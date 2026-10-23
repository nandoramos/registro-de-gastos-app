// @vitest-environment jsdom

import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryStatusActions } from "@/components/entry-status-actions";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  ["pending", "Descartar entrada", "/api/pending-entries/entry-1/discard"],
  [
    "discarded",
    "Recuperar a pendientes",
    "/api/discarded-entries/entry-1/recover",
  ],
] as const)(
  "ejecuta la acción de estado %s",
  async (status, label, endpoint) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "entry-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<EntryStatusActions entryId="entry-1" status={status} />);

    await user.click(screen.getByRole("button", { name: label }));

    await screen.findByText(
      status === "pending" ? "Entrada descartada." : "Entrada recuperada.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({ method: "POST" }),
    );
  },
);
