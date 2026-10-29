import { describe, expect, it } from "vitest";
import {
  calculateEstimatedUsdTotal,
  quoteForConversion,
  validateQuoteSettings,
} from "@/modules/settings/domain";

describe("cotizaciones generales", () => {
  it("normaliza compra y venta y permite advertir sin bloquear el cruce", () => {
    expect(validateQuoteSettings({ buyRate: "40", sellRate: "39,5" })).toEqual({
      ok: true,
      value: { buyRate: "40.00", sellRate: "39.50", sellBelowBuy: true },
    });
  });

  it("rechaza cotizaciones cero, negativas o con más de dos decimales", () => {
    expect(validateQuoteSettings({ buyRate: "0", sellRate: "40.123" })).toEqual({
      ok: false,
      errors: ["INVALID_BUY_RATE", "INVALID_SELL_RATE"],
    });
  });

  it("elige compra para dólares a pesos y venta para pesos a dólares", () => {
    const quotes = { buyRate: "39.00", sellRate: "41.00" };
    expect(quoteForConversion("USD", "UYU", quotes)).toBe("39.00");
    expect(quoteForConversion("UYU", "USD", quotes)).toBe("41.00");
    expect(quoteForConversion("USD", "USD", quotes)).toBeUndefined();
  });

  it("estima en USD con la cotización de venta y redondea exactamente", () => {
    expect(calculateEstimatedUsdTotal("4050.00", "100.00", "40.00")).toBe("201.25");
    expect(calculateEstimatedUsdTotal("0.10", "0.00", "40.00")).toBe("0.00");
    expect(calculateEstimatedUsdTotal("0.20", "0.00", "40.00")).toBe("0.01");
  });
});
