# Selectores de cuentas sin cálculo de saldo — ticket #44

Los formularios que solo necesitan identificar cuentas usan `listAccountOptions`. Esta consulta devuelve identidad, nombre, tipo, moneda, configuración de saldo inicial y fecha de apertura, filtradas por usuario y estado de archivo, sin ejecutar las siete subconsultas correlacionadas que calculan el saldo actual.

Se aplica a alta de ingresos, transferencias, conversiones, ingreso de email y corrección de pendientes. Esos flujos necesitan mostrar moneda, requerir cuentas configuradas o resolver cuentas, pero no presentan ni calculan saldos. Se conservan sus filtros de cuentas con apertura configurada.

La lista completa `listAccounts` continúa en gastos nuevos y editados, ajustes y vistas de cuentas porque sus formularios presentan advertencias o saldos. Historial mantiene la carga existente, incluidas sus necesidades de consulta. Las pantallas de detalle conservan la selección previa de cuentas archivadas cuando corresponde.

Verificación: integración sobre PGlite confirma que el selector queda limitado al usuario, respeta el filtro de archivadas y conserva moneda/configuración, sin incluir `balance`; la consulta completa sigue devolviendo el saldo. La comparación final de navegación se registra en el ticket #45; no se afirma aquí un porcentaje de mejora.
