# ADR-0004: representación del tipo de cambio efectivo

## Contexto

Las conversiones guardan los importes finales realmente debitado y acreditado. Para USD y UYU, el tipo efectivo debe expresarse siempre como pesos uruguayos por dólar, mostrarse con dos decimales y no puede depender de aritmética de punto flotante ni sustituir los importes confirmados.

## Decisión

Los importes siguen siendo `numeric(18,2)` y constituyen la fuente de verdad. El tipo efectivo se calcula con enteros que representan centésimos y se guarda como `numeric(30,12)` en UYU por USD, independientemente del sentido de la operación. La división se redondea a 12 decimales con empate hacia arriba.

La presentación redondea ese valor a dos decimales con la misma regla y usa el formato `1 USD = 40,25 UYU`. Nunca se recalculan los importes finales desde la presentación ni se guarda la cotización opcional de ayuda como referencia separada.

## Consecuencias

Doce decimales internos permiten reproducir una relación estable para los importes admitidos sin introducir `float`. Los importes originales siguen disponibles para recalcular o auditar la relación. La aplicación debe hacer multiplicación, división y redondeo mediante enteros o decimales exactos.
