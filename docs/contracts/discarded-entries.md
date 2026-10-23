# Contrato de descarte y recuperación

`POST /api/pending-entries/:id/discard` cambia una proyección pendiente propia a `discarded`, registra una revisión append-only y conserva intactos el evento de fuente, su evidencia y las interpretaciones anteriores. La entrada deja inmediatamente la lista y el contador de pendientes. La acción solo se aplica a pendientes; un identificador ajeno, inexistente o ya registrado responde `404`.

`GET /api/discarded-entries` lista las entradas descartadas del usuario y `GET /api/discarded-entries/:id` permite consultar su evidencia. `POST /api/discarded-entries/:id/recover` devuelve la proyección a `pending` y agrega otra revisión. Recuperar no crea un movimiento financiero.

Las entradas descartadas no existen en `expense`, no forman parte de los totales y permanecen separadas de la anulación de movimientos registrados. Todas las operaciones derivan el usuario de la sesión.
