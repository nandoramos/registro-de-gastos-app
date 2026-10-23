# Correcciones de gastos registrados

`PATCH /api/expenses/:id` recibe la misma forma normalizada que el alta manual: fecha, hora opcional, título, nota opcional, cuenta, categoría, importe decimal como texto y moneda. El usuario se deriva siempre de la sesión; un gasto ajeno responde como inexistente.

Una corrección válida actualiza el gasto dentro de una transacción y agrega una revisión append-only con las instantáneas normalizadas anterior y nueva. La consulta del detalle devuelve esas revisiones en `history`. El evento de fuente, su contenido original y la procedencia permanecen intactos.

Las validaciones de fecha, título, nota, importe, moneda y pertenencia de cuenta y categoría son las mismas que al registrar. Una corrección inválida responde `422` y no modifica el gasto ni agrega historial. Cambiar la categoría modifica únicamente la referencia del gasto corregido; no renombra categorías, no crea reglas y no altera otros movimientos.
