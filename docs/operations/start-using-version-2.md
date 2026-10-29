# Inicio de uso de la versión 2

Este procedimiento prepara el cambio de datos de prueba a datos de uso. **No ejecuta borrados, cambios en Neon ni migraciones.** La limpieza de datos requiere una autorización específica después de revisar el inventario y confirmar el entorno.

## Inventario del modelo

El modelo distingue los datos de configuración de los registros de actividad:

| Tratamiento | Datos |
| --- | --- |
| Conservar | Usuario autorizado, cuentas (`financial_account`), categorías (`expense_category`) y cotizaciones (`user_settings`). |
| Revisar para limpiar | Gastos (`expense`), ingresos (`income`), transferencias/retiros (`own_transfer`), conversiones (`currency_conversion`) y ajustes (`manual_adjustment`), incluidos los anulados. |
| Limpiar junto con la actividad | Evidencia (`source_event`), pendientes (`pending_entry`), revisiones de fuentes (`source_event_review`) e historial de estados (`movement_status_event`). Las revisiones de gastos se eliminan en cascada al eliminar su gasto (`expense_revision`). |

Los movimientos registrados referencian eventos de fuente sin borrado en cascada; por eso se deben retirar primero los movimientos y después sus eventos. Los pendientes y las revisiones de fuente sí dependen del evento y se eliminan al retirarlo. El borrado debe limitarse al `user_id` autorizado.

No existe una marca técnica que diferencie un registro de prueba de uno real. El usuario indicó que los registros cargados hasta ahora son de prueba; antes de limpiar, hay que confirmarlo mirando en la app el inventario agregado (cantidades por tipo y estado) y contrastarlo con este alcance. No usar títulos, fechas o importes como detector automático de datos de prueba.

## Procedimiento antes de empezar

1. Confirmar que se va a empezar a usar la app y elegir explícitamente el proyecto y branch de Neon correctos.
2. Crear o verificar un punto de restauración/backup de ese branch.
3. Revisar en la app las cuentas y categorías que se conservarán, las cuentas archivadas y los saldos iniciales actuales. No copiar nombres, importes ni evidencia bancaria a logs, capturas o commits.
4. Obtener un inventario de solo lectura: cantidad por cada tabla de actividad de arriba, separados por usuario y estado (activos, anulados, pendientes/descartados). Confirmar que todas las filas del usuario son descartables de prueba. El inventario puede mostrar cantidades; no necesita imprimir títulos ni payloads.
5. Revisar la lista exacta de tablas a limpiar y las cuentas/categorías que quedan. Pedir autorización específica para ejecutar la limpieza. Si algo no coincide, detenerse y conservar los datos.

## Limpieza, solo después de autorización específica

En una transacción y con el `user_id` autorizado como parámetro, eliminar en este orden:

1. `movement_status_event`.
2. `expense`, `income`, `own_transfer`, `currency_conversion` y `manual_adjustment`.
3. `source_event` (esto elimina sus pendientes y revisiones asociadas por cascada; las revisiones de gastos ya habrán cascado desde `expense`).

Antes de confirmar la transacción, comprobar que las cantidades de actividad quedaron en cero para ese usuario y que las cuentas, categorías y cotizaciones esperadas siguen presentes. Si una comprobación falla, hacer rollback. No usar `TRUNCATE`, no omitir el filtro por usuario y no incluir tablas de configuración en el borrado. Este repositorio no contiene un comando de limpieza porque el proyecto exige autorización específica antes de borrar datos.

## Configurar los saldos reales

- Abrir **Cuentas**. Las cuentas sin saldo inicial muestran el formulario para cargar el importe y la fecha desde la que se calculará el saldo; los movimientos anteriores a esa fecha no se permiten. No se asume cero.
- La pantalla avisa cuando hay cuentas activas sin configurar y mantiene los totales marcados como incompletos. Completar cada cuenta antes de registrar movimientos.
- El saldo inicial configurado es de una sola carga. Si conserva un saldo inicial de prueba, después de la limpieza comparar el saldo calculado con el saldo real observado en el banco/efectivo y usar **Ajuste manual** para registrar la diferencia a la fecha actual. Así se conserva el historial de conciliación y se evita cambiar cuentas o borrar configuración.
- Confirmar por separado UYU y USD; no convertir ni sumar ambas monedas en un total único.

## Verificación con datos ficticios

Las pruebas no usan la base personal ni datos bancarios reales:

- `tests/accounts-manager.test.tsx` comprueba que una cuenta sin saldo se identifica como pendiente, que el total se marca incompleto y que se puede configurar un saldo inicial.
- `tests/opening-balance.integration.test.ts` comprueba autorización, saldos iniciales, bloqueo de cuentas sin configurar y efecto de movimientos.
- `tests/startup-workflow.integration.test.ts` recorre con datos sintéticos la configuración inicial, un gasto, un ajuste al saldo observado, los movimientos/totales y la anulación.
- `tests/adjustments.integration.test.ts` comprueba además la conciliación, el historial y la restauración con datos ficticios.
- `npm run test:e2e` verifica acceso, protección de rutas y reintento ante error tanto en escritorio como en móvil. Usa Google Chrome instalado y el servidor local; no inicia OAuth real. Las integraciones usan PGlite aislado y no abren la base personal.

Para la última revisión manual de uso, iniciar sesión en un branch aislado y cargar cuentas, categorías y movimientos inventados; repetir el recorrido **Cuentas → saldo inicial → gasto → ajuste manual → Movimientos → anular/restaurar** en escritorio y en un teléfono. No hacer esa prueba contra el branch con los datos personales.
