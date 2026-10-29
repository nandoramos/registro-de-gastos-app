# Contrato: ajustes manuales

## Crear

`POST /api/adjustments` recibe `accountId`, `observedBalance` y una nota opcional. La identidad se deriva de la sesión. El servidor valida que la cuenta activa pertenezca al usuario, tenga saldo inicial configurado y calcula el saldo vigente de la cuenta. La fecha se asigna al día actual de Montevideo y la moneda se toma de la cuenta.

Si el saldo observado coincide con el saldo calculado, responde `200 { "status": "already_equal" }` sin crear evento ni movimiento. Si hay diferencia, crea un movimiento con detalle `Ajuste manual`, importe positivo y dirección `increase` o `decrease`; responde `201` con el movimiento. No existe estado pendiente. El saldo observado admite hasta dos decimales y puede ser negativo.

## Editar y estado

`GET /api/adjustments/:id` y `PATCH /api/adjustments/:id` solo consultan o editan movimientos del usuario autenticado. La edición permite cambiar cuenta, fecha, dirección, importe, detalle y nota. No escribe historial de versiones ni modifica el evento de origen. No se puede editar un ajuste anulado. Anular y restaurar usan `/api/movements/adjustment/:id/void` y `/restore`.

Las fechas no pueden ser futuras ni anteriores a la fecha inicial de la cuenta. Una cuenta archivada puede conservarse en el movimiento existente, pero no usarse para crear uno nuevo.

## Contabilidad

Los ajustes aumentativos suman al saldo y al total de ingresos mensual. Los ajustes disminutivos restan del saldo y cuentan como gasto mensual en la categoría de sistema `Ajuste manual`. La moneda siempre es la de la cuenta. Los anulados no participan en saldos, historial normal ni totales; al restaurarlos vuelven a participar.
