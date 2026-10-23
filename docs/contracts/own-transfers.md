# Transferencias propias y retiros

`POST /api/transfers` recibe una operación estructurada con `kind` (`transfer` o `withdrawal`), fecha, título, nota opcional, cuentas de origen y destino, importes efectivamente debitado y acreditado, y moneda. La identidad se deriva de la sesión.

En el alcance del ticket #8 ambas cuentas deben pertenecer al usuario y usar la misma moneda. Los importes se reciben como texto decimal positivo con hasta dos decimales y deben ser iguales. Si falta un lado, las cuentas usan monedas distintas o los importes difieren, la entrada y su evidencia se conservan para revisión sin crear una operación financiera. Las conversiones se incorporan en el ticket #9.

Un retiro exige una cuenta bancaria como origen y una cuenta de efectivo como destino. Transferencias y retiros se guardan como una sola operación vinculada a ambos lados, sin categoría y sin crear un gasto ni calcular saldos.

Una entrada pendiente conserva el evento de fuente original. `PATCH /api/pending-entries/:id` permite completar ambos lados y registra la operación en una sola transacción cuando todas las validaciones quedan satisfechas. `GET /api/transfers/:id` devuelve únicamente una operación del usuario autenticado junto con su evidencia inmutable.
