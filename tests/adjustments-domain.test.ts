import { describe, expect, it } from "vitest";
import { adaptCreateAdjustment, adaptUpdateAdjustment, observedDifference } from "@/modules/adjustments/domain";

describe("dominio de ajustes manuales", () => {
  it("calcula diferencias exactas, incluido un saldo observado negativo", () => {
    expect(observedDifference("9500.25", "9000.10")).toEqual({ cents: -50015n, direction: "decrease", amount: "500.15" });
    expect(observedDifference("100.00", "125.50")).toEqual({ cents: 2550n, direction: "increase", amount: "25.50" });
    expect(observedDifference("100.00", "-25.00")).toEqual({ cents: -12500n, direction: "decrease", amount: "125.00" });
  });
  it("valida el saldo observado y conserva fecha de edición explícita", () => {
    expect(adaptCreateAdjustment({ accountId: "a", observedBalance: "-1.25" }).ok).toBe(true);
    expect(adaptCreateAdjustment({ accountId: "a", observedBalance: "1.234" }).ok).toBe(false);
    expect(adaptUpdateAdjustment({ accountId: "a", operationDate: "2026-10-20", direction: "increase", amount: "1.25", title: "Ajuste manual", note: "" }).ok).toBe(true);
    expect(adaptUpdateAdjustment({ accountId: "a", operationDate: "2026-02-31", direction: "increase", amount: "1.25", title: "Ajuste manual", note: "" })).toEqual({ ok: false, error: "INVALID_DATE" });
  });
});
