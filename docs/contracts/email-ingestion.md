# Ingreso de texto de email

`POST /api/email-entries` recibe `text`, la cuenta elegida y, cuando corresponde, categoría y naturaleza financiera. La identidad se deriva de la sesión. El texto se interpreta con el mismo parser puro usado por **Probar interpretación** y la ruta invoca directamente la lógica compartida; no realiza HTTP interno.

Una compra con débito completa, coherente y con cuenta y categoría propias se registra como gasto. El evento de fuente usa procedencia `email` y conserva `{ "text": "..." }` como evidencia inmutable. La cuenta solo identifica el origen: su moneda debe coincidir con la moneda explícita del débito y nunca convierte el importe.

Si no se envía una cuenta, la lógica consulta únicamente las cuentas del usuario autenticado. Asigna la cuenta cuando existe una sola candidata con la moneda explícita detectada. Con ninguna o varias candidatas, la entrada requiere selección manual. La interfaz muestra la asignación automática y permite reemplazarla antes de ingresar el texto al registro.

Una entrada incompleta, contradictoria, no reconocida o con referencias inválidas queda pendiente sin crear un movimiento. Una transferencia exige que el usuario elija si representa un gasto o un traslado propio. Al elegir traslado propio, el débito detectado se conserva como un lado de una transferencia pendiente y el usuario completa la cuenta y el importe de destino mediante el flujo existente.

La interfaz del MVP pega texto manualmente. No accede a Gmail, no recibe correos automáticamente y no amplía las variantes sintéticas documentadas del parser.
