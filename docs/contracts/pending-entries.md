# Contrato de entradas manuales pendientes

`POST /api/pending-entries` requiere sesión autorizada y un objeto JSON. Un JSON mal formado o un valor que no sea objeto responde `422` y no se conserva. Un objeto reconocido pero incompleto o contradictorio responde `202`, crea un evento de fuente `pending`, conserva el objeto original y devuelve `issues` con los campos por resolver. Una entrada completa puede registrarse directamente.

`GET /api/pending-entries` lista y cuenta todos los pendientes del usuario, sin limitar el contador por mes. `GET /api/pending-entries/:id` devuelve un pendiente propio. `PATCH /api/pending-entries/:id` guarda la interpretación corregida y registra la intervención. Si aún faltan datos, mantiene el estado pendiente; si queda completa, válida y coherente, crea el gasto y responde `201` sin una segunda confirmación.

La evidencia original nunca se reemplaza con la corrección. El estado actual se mantiene en una proyección `pending_entry`; cada intervención se agrega a `source_event_review` y conserva la interpretación, los problemas y el resultado de esa revisión. Al registrar el gasto se elimina únicamente la proyección pendiente, mientras el evento y todo su historial permanecen intactos.

Los errores de sesión usan `401` o `403`; un identificador inexistente o ajeno usa `404`; los fallos inesperados usan `503`. Este contrato no concede credenciales de ingesta externa ni incorpora descartes, que pertenecen a tickets posteriores.
