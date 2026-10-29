# Feedback acordado para la versión 2

Este documento consolida las preferencias de interfaz y las reglas confirmadas para la siguiente versión. Los importes de ejemplo ilustran el formato; los totales deben calcularse con los saldos y la cotización vigentes.

## Movimientos

### Filtros

- El panel aparece cerrado al entrar tanto en escritorio como en móvil.
- Al abrirlo, los controles se organizan en este orden:
  1. Buscar, Mes, Desde y Hasta.
  2. Estado y Moneda juntos.
  3. Tipo, Cuenta y Categoría juntos.

### Tabla y filas

- La columna Estado es estrecha y no tiene encabezado visible. Muestra un punto con etiqueta accesible y, en escritorio, una etiqueta al pasar el cursor:
  - Verde: movimiento ingresado.
  - Amarillo: entrada pendiente de revisión.
  - Rojo: movimiento anulado.
- Las entradas pendientes aparecen como filas del listado, pero no afectan saldos ni totales.
- El punto de estado permanece visible en las filas compactas de móvil, junto a la fecha.
- La fecha se muestra como `dd/mm/yy`; la hora, cuando existe, queda debajo.
- En Detalle se muestra primero el título y debajo la nota. La nota se trunca con puntos suspensivos cuando no entra; el texto completo sigue disponible al editar el movimiento.
- Se elimina la columna Moneda. La moneda se muestra debajo del nombre de la cuenta. En móvil, los datos secundarios siguen accesibles desde cada fila.
- La categoría y el acceso para editar se mantienen.

### Formato de importes

En toda la aplicación se usa punto para separar miles y coma para decimales:

- Pesos uruguayos (UYU): `$34.456,22`.
- Dólares estadounidenses (USD): `U$S 2.456,34`.

En transferencias y conversiones se conserva visible qué moneda corresponde a cada importe.

## Formularios

- Registrar gasto preselecciona **Itaú pesos**.
- Registrar ingreso preselecciona **Itaú dólares**.
- La persona puede elegir otra cuenta activa. Si la cuenta predeterminada no existe o está archivada, el formulario no selecciona otra cuenta automáticamente y requiere una elección explícita.

## Transferencias, retiros y conversiones

- Se permite operar entre cualquier par de cuentas activas distintas; no se puede elegir la misma cuenta como origen y destino.
- Si ambas cuentas usan la misma moneda, la operación es una transferencia. Si usan monedas distintas, se registra una conversión y se capturan por separado los importes de origen y destino.
- Ejemplos que deben estar permitidos, entre otros:
  - Prex dólares → Itaú pesos.
  - Itaú dólares → Itaú pesos.
  - Itaú dólares → Santander dólares.
- En una conversión, ambos importes son editables. El tipo de cambio efectivo se calcula a partir de esos importes y se muestra como detalle de ayuda; no sustituye los importes ingresados.
- Las transferencias, conversiones y retiros no son gastos. Actualizan los saldos de las cuentas involucradas sin duplicar gastos.
- Una operación desde una cuenta bancaria hacia una cuenta de efectivo se identifica como retiro. Si las monedas difieren, también se identifica como conversión y conserva ambos importes y el tipo de cambio efectivo.

## Cuentas

### Tarjetas y orden

- Las tarjetas ocupan menos espacio interno.
- El saldo y el acceso para ver movimientos aparecen en la misma línea; el acceso se representa con un icono de ojo.
- Renombrar se representa con un lápiz y archivar con una papelera. La papelera archiva; no elimina la cuenta.
- Orden de cuentas:
  1. Itaú pesos.
  2. Billetera.
  3. Itaú dólares.
  4. Santander dólares.
  5. Prex dólares.
  6. Las demás cuentas, en orden alfabético.

### Resumen y acciones

- El resumen muestra:
  - Total UYU.
  - Total USD.
  - Total estimado en USD, calculado con el total USD más el total UYU convertido a la cotización de venta vigente.
- Los tres totales incluyen cuentas activas y archivadas. Debajo del estimado en USD se indica la cotización usada, por ejemplo: `al tipo de venta: 40,00 UYU/USD`.
- Los valores anotados originalmente (`119.572,94 UYU`, `83.009,00 USD` y `85.998,32 USD estimados`) son ejemplos de presentación, no valores fijos.
- El resumen se ubica a la derecha de la lista cuando hay espacio y se apila en pantallas angostas.
- “Mostrar archivadas” queda después de la lista y antes de “Agregar cuenta”. “Agregar cuenta” queda al final.
- Se eliminan estos textos de ayuda de la pantalla de Cuentas:
  - “Identificá dónde mantenés tu dinero. Una cuenta bancaria o de efectivo se configura por separado para cada moneda.”
  - “Cotización de venta: 40,00 UYU por USD. Incluye cuentas bancarias y efectivo.”
  - “Cada cuenta tiene una sola moneda. Configurá su saldo inicial para usarla en movimientos.”

## Categorías

- Se muestra una categoría por línea, en lugar de dos columnas.
- Cada fila tiene menos espacio interno.
- Renombrar se representa con un lápiz y archivar con una papelera. La papelera archiva; no elimina la categoría.
