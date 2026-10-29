# Conversiones entre USD y UYU

`POST /api/conversions` recibe una conversión estructurada con fecha, título, nota opcional, cuentas de origen y destino, importes realmente debitado y acreditado, monedas, confirmación del importe de destino e institución opcional. La identidad se deriva de la sesión.

Ambas cuentas deben pertenecer al usuario, ser diferentes y usar monedas distintas entre UYU y USD. Los importes se reciben como texto decimal positivo con hasta dos decimales. El destino debe estar confirmado explícitamente. Si falta un dato obligatorio, una cuenta no está disponible o el destino aún no fue confirmado, la entrada y su evidencia quedan pendientes sin crear una operación financiera.

La cotización editable inicia con la cotización vigente del usuario: compra al cambiar USD por UYU y venta al cambiar UYU por USD. Es una ayuda para calcular el destino: multiplica USD por UYU/USD o divide UYU por UYU/USD. El cálculo usa precisión entera decimal y redondea al centésimo, con los empates hacia arriba. El usuario puede corregir el resultado y debe confirmarlo; la cotización auxiliar no se persiste por separado.

El tipo de cambio efectivo se calcula con ambos importes finales, se guarda como UYU por USD con doce decimales y se presenta con dos, por ejemplo `1 USD = 40,25 UYU`. Esa presentación no modifica ni recalcula los importes confirmados.

La institución puede omitirse o ser Itaú, Prex u Otra con nombre. No se infiere de las cuentas. La conversión se guarda como una sola operación vinculada a ambos lados, conserva la evidencia original y no crea un gasto ni una transferencia.

`PATCH /api/pending-entries/:id` completa una conversión pendiente en una sola transacción. `GET /api/conversions/:id` devuelve únicamente una conversión del usuario autenticado junto con su evidencia inmutable.
