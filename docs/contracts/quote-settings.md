# Cotizaciones generales

`GET /api/settings/quotes` devuelve las cotizaciones vigentes del usuario autenticado. Si aún no las guardó, ambas son `40.00` UYU por USD. `PATCH /api/settings/quotes` guarda compra y venta juntas, derivando el usuario de la sesión.

Cada cotización debe ser positiva y admitir hasta dos decimales. Se conserva solo el valor vigente, sin historial. Si venta queda debajo de compra, la interfaz advierte y permite guardar. Las cotizaciones ayudan a calcular conversiones, pero nunca reemplazan los importes reales confirmados ni cambian conversiones existentes.

La pantalla de cuentas muestra saldos UYU y USD por separado. Además suma ambos en un total estimado en USD: convierte UYU usando la cotización de venta, redondea a dos decimales y cuenta tanto cuentas bancarias como efectivo, incluidas las cuentas archivadas que tengan saldo. Mientras alguna cuenta activa carezca de saldo inicial, informa que el total estimado está incompleto.
