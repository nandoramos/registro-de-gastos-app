# Ingesta común con adaptadores por fuente

El proyecto necesita ingresar texto de emails Itaú y datos manuales, y prevé incorporar notificaciones de Android y otras fuentes en el futuro. Se acuerda que cada fuente adapte su entrada a un contrato común y que una misma función de negocio valide y coordine el registro de los datos. Esto concentra las reglas de integridad y autorización y evita duplicarlas al agregar fuentes.

Los parsers de texto son puros y no escriben movimientos por su cuenta. La entrada manual ya contiene datos estructurados y no necesita convertirse en un email ficticio. Las rutas del monolito llaman directamente a la lógica compartida; no necesitan realizar peticiones HTTP entre endpoints.

La normalización conserva la entrada original y su procedencia como evidencia inmutable, separada de los movimientos financieros interpretados. La identidad del usuario procede de la sesión o credencial autorizada, nunca de un `user_id` libre en el cuerpo de la solicitud.

Si una entrada autorizada no puede interpretarse o le faltan datos esenciales, se conserva como pendiente de revisión sin crear un movimiento financiero. El usuario puede completar o corregir su interpretación manteniendo la evidencia original. Los requisitos mínimos de gastos, transferencias propias y conversiones están documentados en [PROJECT.md](../PROJECT.md).

Un gasto completo, válido y confiable puede registrarse sin revisión humana adicional, conservando las validaciones y comprobaciones de autorización de la lógica común. La confianza requiere datos respaldados explícitamente, validaciones de formato, coherencia y pertenencia al usuario, y ausencia de ambigüedades o contradicciones sin resolver. Si persiste una ambigüedad, la entrada queda pendiente aunque tenga todos los campos.

Se descarta exigir el formato de email Itaú a todas las fuentes: facilitaría reutilizar un único parser, pero acoplaría la carga manual y las integraciones futuras al formato de un banco y dificultaría distinguir su procedencia real.

El alcance actual incluye únicamente texto de emails Itaú y entrada manual de datos estructurados. Las notificaciones NFC y otras fuentes siguen fuera del MVP. La opción «Probar interpretación» permite probar textos sintéticos sin crear eventos de fuente ni movimientos; las pruebas automáticas utilizan datos ficticios separados de los registros del usuario. Quedan pendientes el contrato concreto y las validaciones detalladas de entrada.
