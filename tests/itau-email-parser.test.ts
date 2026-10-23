import { describe, expect, it } from "vitest";
import { parseItauEmailText } from "@/modules/email-import/itau-parser";

describe("parser puro de textos sintéticos Itaú", () => {
  it("detecta una compra con débito con campos explícitos", () => {
    const result = parseItauEmailText(`
ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Hora: 14:35
Comercio: Mercado Ejemplo
Importe debitado: UYU 1.234,56
`);
    expect(result).toEqual({
      format: "synthetic-itau-debit-purchase-v1",
      kind: "expense",
      fields: {
        operationDate: "2026-10-24",
        operationTime: "14:35",
        title: "Mercado Ejemplo",
        amount: "1234.56",
        currency: "UYU",
      },
      issues: [],
    });
  });

  it("detecta una transferencia sin decidir si es gasto o traslado propio", () => {
    const result = parseItauEmailText(`ITAÚ
TRANSFERENCIA
Fecha: 23/10/2026
Destinatario: Persona Ejemplo
Importe debitado: USD 25,00`);
    expect(result).toEqual({
      format: "synthetic-itau-transfer-v1",
      kind: "bank-transfer",
      fields: {
        operationDate: "2026-10-23",
        recipient: "Persona Ejemplo",
        amount: "25.00",
        currency: "USD",
      },
      issues: ["FINANCIAL_NATURE_REQUIRED"],
    });
  });

  it("informa fecha ausente y moneda ambigua sin inventarlas", () => {
    const result = parseItauEmailText(`ITAÚ
COMPRA CON DÉBITO
Comercio: Ejemplo
Importe debitado: $ 250,00`);
    expect(result.fields).toEqual({ title: "Ejemplo", amount: "250.00" });
    expect(result.issues).toEqual(["MISSING_DATE", "AMBIGUOUS_CURRENCY"]);
  });

  it("rechaza texto y valores que no responden al formato documentado", () => {
    expect(parseItauEmailText("Un mensaje cualquiera")).toEqual({
      format: "unknown",
      kind: "unknown",
      fields: {},
      issues: ["UNSUPPORTED_FORMAT"],
    });
    const invalid = parseItauEmailText(`ITAÚ
COMPRA CON DÉBITO
Fecha: ayer
Comercio: Ejemplo
Importe debitado: UYU -20`);
    expect(invalid.fields).toEqual({ title: "Ejemplo" });
    expect(invalid.issues).toEqual(["INVALID_DATE", "INVALID_AMOUNT"]);
  });

  it("señala encabezados y campos explícitos que se contradicen", () => {
    expect(
      parseItauEmailText(`ITAÚ
COMPRA CON DÉBITO
TRANSFERENCIA
Fecha: 24/10/2026
Importe debitado: UYU 20,00`),
    ).toEqual({
      format: "unknown",
      kind: "unknown",
      fields: {},
      issues: ["CONTRADICTORY_FORMAT"],
    });

    const duplicate = parseItauEmailText(`ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Comercio: Ejemplo
Importe debitado: UYU 20,00
Importe debitado: UYU 30,00`);
    expect(duplicate.fields).toEqual({
      operationDate: "2026-10-24",
      title: "Ejemplo",
    });
    expect(duplicate.issues).toEqual(["CONTRADICTORY_FIELD"]);
  });
});
