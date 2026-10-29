# Categorías compartidas — tickets #42 y #43

## Comportamiento implementado

Gestión, Registrar gasto, historial, edición, email y revisión de pendientes comparten una colección en memoria durante la navegación de la pestaña. Inicio no solicita categorías. La primera pantalla consumidora pide la colección completa, incluidas las archivadas; navegar entre pantallas reutiliza la respuesta. Recargar la app crea una colección nueva.

La colección pertenece al usuario autorizado de la página. Crear, renombrar, archivar y recuperar actualizan los datos después del éxito del servidor. Al recuperar el foco o volver a una pestaña visible, se vuelve a consultar; las solicitudes coincidentes se agrupan mientras haya una lectura pendiente. No hay polling, persistencia local ni sincronización continua.

El formulario conserva título, importe, fecha, cuenta, nota y selecciones válidas durante las actualizaciones. Un cambio de nombre conserva el identificador seleccionado. Si se archiva la categoría seleccionada, se mantiene la referencia visible pero se bloquea el registro y se pide elegir otra. No se sustituye automáticamente. Si cambia el usuario, los formularios y la colección se reinician para no conservar borradores ajenos.

Si falla la primera carga, se puede seguir completando el formulario y reintentar, pero no registrar un gasto hasta disponer de una categoría válida. Si falla una actualización con una lista anterior, se conserva esa lista y se muestra un aviso con reintento. El servidor sigue validando la categoría al guardar. Ante un rechazo de categoría se conserva el formulario y se inicia una lectura nueva, cancelando cualquier lectura anterior pendiente.

Cerrar sesión limpia la colección. Lecturas canceladas, respuestas anteriores a una mutación o respuestas de otra identidad no pueden repoblarla ni sobrescribir datos más recientes. Las mutaciones tardías también comprueban la identidad y la generación de la colección; su orden se controla por categoría. La cancelación de transporte es una optimización: los controles de versión siguen protegiendo cuando una respuesta llega a pesar de la cancelación.

## Frontera del servidor

Las páginas que consumen categorías conservan la autorización en servidor y dejaron de consultarlas durante el renderizado. Historial identifica Casa Nueva por `systemKey` en las consultas de gastos y ajustes, sin depender del nombre o estado archivado. Sus filtros usan navegación cliente para preservar la colección. Registrar gasto sigue solicitando las cuentas al servidor; no se incorpora caché de cuentas ni saldos.

- `GET /api/categories` conserva su respuesta de categorías activas.
- `GET /api/categories?includeArchived=true` devuelve activas y archivadas y el `userId` derivado de la sesión. Ese identificador vincula la respuesta a la colección correcta; nunca autoriza una consulta.
- Las respuestas exitosas de categorías incluyen `X-Category-User`, también derivado de la sesión, para comprobar la identidad de las mutaciones antes de actualizar la colección.
- Todas las respuestas conservan `Cache-Control: no-store`. La reutilización ocurre explícitamente en memoria, no en la caché HTTP.
- Una identidad inválida o una respuesta de otra sesión descarta la colección; un fallo temporal de lectura puede conservar datos previamente obtenidos para la misma identidad.

Las categorías iniciales se preparan de forma idempotente antes de crear una sesión autorizada, después de comprobar la identidad Google permitida. Listar categorías ahora es una lectura sin intentos de inserción. Las instalaciones o usuarios nuevos reciben las categorías al iniciar sesión; no hay migraciones ni cambios de esquema. Una sesión antigua que nunca hubiera inicializado categorías debe renovarse para ejecutar esa preparación. Las mutaciones de ajustes manuales conservan su preparación explícita existente.

No se modificó la autorización del ADR-0003 ni se habilitó caché de sesión en cookie. El identificador enviado por el navegador nunca sustituye la identidad derivada de sesión en la base de datos.

## Verificación

Pruebas de integración con PostgreSQL embebido:

- Lectura en una conexión de solo lectura, contrato de archivadas y aislamiento por usuario.
- Inicialización idempotente y categorías disponibles después del callback Google autorizado.
- Reglas existentes de gastos, edición, categorías archivadas y autorización.

Pruebas de componentes con las interfaces reales y respuestas controladas:

- Campos conservados al actualizar categorías y bloqueo de una selección archivada.
- Respuestas posteriores al cierre incluso si el transporte ignora la cancelación.
- Cambio de usuario, borradores separados y rechazo de datos identificados como ajenos.
- Lecturas anteriores a una creación que llegan tarde.
- Rechazo al guardar mientras había una lectura previa pendiente: se solicita una lista nueva y se conserva el formulario.

Cuatro recorridos de navegador sobre las páginas privadas reales y datos sintéticos:

1. Inicio sin consulta de categorías; registro y gestión comparten una sola lectura mientras se crea, renombra, archiva y recupera una categoría.
2. Fallo de primera carga, campos conservados, reintento y formulario habilitado al elegir una categoría válida.
3. Actualización al recuperar foco, fallo temporal con lista anterior, archivado externo y rechazo al guardar sin pérdida de campos.
4. Lectura atrasada tras una creación y limpieza al cerrar sesión, con nueva lectura al volver a ingresar.

El recorrido de rendimiento espera que los selectores estén habilitados antes de considerar el formulario utilizable; ver el título de una pantalla sin las categorías disponibles ya no alcanza.

Resultado final: 256 pruebas en 52 archivos, seis recorridos de navegador sobre compilación de producción, typecheck y lint completos satisfactorios. El ciclo de TDD observó los fallos de lectura con escrituras, preparación ausente en el callback, selección archivada, borrador entre usuarios y actualización posterior a un rechazo con una lectura previa pendiente antes de implementar sus correcciones.

## Alcance pendiente

La edición puede conservar la categoría archivada original del gasto, pero no asignar otra archivada. Si se archiva la selección durante la edición, conserva selección y borrador, bloquea el guardado y pide otra categoría. Email y pendientes mantienen sus reglas para categorías requeridas y entradas incompletas.

El recorrido de navegador comprueba la reutilización entre email, historial, edición y pendiente; cambios de nombre con texto conservado; categorías archivadas; Casa Nueva renombrada y archivada; y filtros sin recarga completa. Las pruebas de integración verifican aislamiento y reglas financieras. La comparación de rendimiento corresponde al #45 y no se atribuye aquí una mejora porcentual.
