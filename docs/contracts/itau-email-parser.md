# Formatos sintéticos del parser Itaú

La pantalla privada **Probar interpretación** ejecuta un parser puro en el navegador. No envía el texto al servidor y no crea eventos de fuente, entradas pendientes ni movimientos. Su propósito es mostrar qué campos están respaldados por el texto y qué datos faltan o son ambiguos.

Estos formatos son fixtures sintéticos para desarrollar el flujo. No prueban compatibilidad con emails reales de Itaú. Antes de declarar una variante como compatible se debe verificar su estructura real sin incorporar correos, nombres, cuentas ni movimientos reales al repositorio.

## Compra con débito, versión sintética 1

```text
ITAÚ
COMPRA CON DÉBITO
Fecha: 24/10/2026
Hora: 14:35
Comercio: Mercado Ejemplo
Importe debitado: UYU 1.234,56
```

`Hora` es opcional. `Fecha`, `Comercio` e `Importe debitado` se informan como problemas cuando faltan o no cumplen el formato. La moneda solo se detecta con el marcador explícito `UYU` o `USD`.

## Transferencia, versión sintética 1

```text
ITAÚ
TRANSFERENCIA
Fecha: 23/10/2026
Destinatario: Persona Ejemplo
Importe debitado: USD 25,00
```

La transferencia siempre informa que su naturaleza financiera requiere decisión manual: el texto bancario por sí solo no permite concluir si es un gasto o un traslado entre cuentas propias. No se inventan la hora ni el destinatario cuando están ausentes.

## Valores monetarios

Los valores admiten un importe positivo con coma decimal de uno o dos dígitos y puntos opcionales como separadores de miles. El símbolo `$` aislado conserva el importe detectado pero produce una ambigüedad de moneda; no se elige UYU ni USD por suposición.
