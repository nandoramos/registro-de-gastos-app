import { describe, expect, it } from "vitest";
import {
  calculateDestinationAmount,
  calculateEffectiveRate,
  displayEffectiveRate,
} from "@/modules/conversions/domain";

describe("cálculos decimales de conversiones", () => {
  it("multiplica USD por la cotización y redondea empates hacia arriba", () => {
    expect(calculateDestinationAmount("USD", "1.00", "40.25")).toBe("40.25");
    expect(calculateDestinationAmount("USD", "0.10", "40.25")).toBe("4.03");
  });

  it("divide UYU por la cotización y redondea al centésimo", () => {
    expect(calculateDestinationAmount("UYU", "40.25", "40.25")).toBe("1.00");
    expect(calculateDestinationAmount("UYU", "1.00", "40.00")).toBe("0.03");
  });

  it("calcula el cambio efectivo desde los importes finales en ambos sentidos", () => {
    expect(calculateEffectiveRate("USD", "10.00", "UYU", "402.50")).toBe(
      "40.250000000000",
    );
    expect(calculateEffectiveRate("UYU", "402.50", "USD", "10.00")).toBe(
      "40.250000000000",
    );
    expect(displayEffectiveRate("40.255000000000")).toBe("1 USD = 40,26 UYU");
  });

  it("rechaza valores inválidos sin usar punto flotante", () => {
    expect(() => calculateDestinationAmount("USD", "1.001", "40.25")).toThrow();
    expect(() => calculateDestinationAmount("USD", "1.00", "0")).toThrow();
    expect(() =>
      calculateEffectiveRate("USD", "1.00", "USD", "40.25"),
    ).toThrow();
  });
});
