import { describe, expect, it } from "vitest";
import { validateOpeningBalance } from "@/modules/accounts/domain";
import { validOperationDate } from "@/modules/expenses/domain";

describe("saldo inicial de cuenta", () => {
  it("acepta saldo cero o positivo con hasta dos decimales y fecha válida", () => {
    expect(validateOpeningBalance({ amount: "0", date: "2026-10-28" })).toEqual({ ok: true, value: { amount: "0.00", date: "2026-10-28" } });
    expect(validateOpeningBalance({ amount: "1250,50", date: "2026-10-28" })).toEqual({ ok: true, value: { amount: "1250.50", date: "2026-10-28" } });
    expect(validateOpeningBalance({ amount: "3.000,50", date: "2026-10-28" })).toEqual({ ok: true, value: { amount: "3000.50", date: "2026-10-28" } });
    expect(validateOpeningBalance({ amount: "3,000.50", date: "2026-10-28" })).toEqual({ ok: true, value: { amount: "3000.50", date: "2026-10-28" } });
  });
  it("rechaza saldo negativo, precisión excesiva y fecha inexistente", () => {
    for (const amount of ["-1", "1.001", "", "abc"]) expect(validateOpeningBalance({ amount, date: "2026-10-28" }).ok).toBe(false);
    expect(validateOpeningBalance({ amount: "10", date: "2026-02-30" }).ok).toBe(false);
    expect(validateOpeningBalance({ amount: "10", date: "9999-01-01" }).ok).toBe(false);
  });
});

it("rechaza fechas futuras para movimientos", () => {
  expect(validOperationDate("9999-01-01")).toBe(false);
});
