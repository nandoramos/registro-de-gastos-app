# Especificación: Registro de Gastos v2

## Problema

Necesito registrar de forma sencilla mis movimientos y saber cuánto dinero tengo en cada cuenta. La versión actual no calcula saldos, no contempla ingresos ni ajustes y no presenta una vista integrada que sea cómoda en el teléfono. También necesito separar la lectura de los gastos de construcción de mis gastos habituales.

## Solución

Una aplicación web privada, usable en Android y escritorio, con saldos por cuenta, carga manual de movimientos, ajustes, historial filtrable y una pantalla principal sencilla. Cada cuenta parte de un saldo inicial y se actualiza con sus movimientos registrados. La app conserva la separación entre gastos, ingresos y transferencias, y permite revisar pendientes y anular movimientos.

## Historias de usuario

Como usuario quiero:

1. Iniciar sesión con mi cuenta autorizada y cerrar sesión desde la navegación para mantener mis datos privados.
2. Ver un saludo según la hora y mi nombre para identificar mi espacio.
3. Ver el gasto del mes en UYU y USD separados, incluso cuando sea cero, para conocer mis gastos sin mezclar monedas.
4. Abrir desde ese total los gastos y ajustes negativos que lo componen, excluyendo Casa Nueva.
5. Ver cuántos pendientes tengo en total y abrirlos sin límite de fecha para no olvidarlos.
6. Ver un mensaje claro cuando no tengo pendientes.
7. Ver los movimientos del mes actual, más recientes arriba, para revisar mi actividad.
8. Distinguir el estado, fecha y hora, detalle, importe, moneda, cuenta y categoría de cada movimiento.
9. Reconocer ingresos con + y verde y salidas con − y rojo, y consultar el nombre de los estados por interacción con sus iconos.
10. Buscar por detalle o nota respetando los filtros activos.
11. Filtrar por fechas inclusivas, monedas, estados y selección múltiple de cuentas, categorías y tipos.
12. Ver los filtros aplicados, la cantidad de resultados y totales de gastos e ingresos separados por moneda.
13. Limpiar filtros y volver al mes actual sin Casa Nueva.
14. Abrir gastos de Casa Nueva desde el inicio hasta hoy, limpiando los filtros, y modificar luego esos filtros.
15. Ver el total de casa por moneda sin sumar pendientes ni anulados.
16. Volver de casa a los movimientos habituales con un botón.
17. Elegir todas las categorías para incluir Casa Nueva y movimientos sin categoría de gasto.
18. Ver pendientes sin categoría en la vista habitual y los de casa en la vista de casa y el acceso global a pendientes.
19. Registrar un gasto con fecha, cuenta, importe, detalle y categoría para reducir el saldo de esa cuenta.
20. Registrar un ingreso con fecha, cuenta, importe y detalle para aumentar el saldo; el detalle sugiere Sueldo.
21. Guardar una carga manual incompleta como pendiente indicando al menos su tipo.
22. Ver pendientes sin que afecten saldos ni totales, y completarlos con «Guardar y registrar».
23. Cancelar una edición sin guardar cambios parciales y borrar definitivamente un pendiente manual con confirmación.
24. Transferir dinero entre cuentas propias con una fecha, dos cuentas distintas y ambos importes para actualizar ambos saldos sin crear gasto o ingreso.
25. Ver la transferencia en una fila con ambas cuentas e importes y encontrarla filtrando cualquiera de sus cuentas o monedas.
26. Ingresar una vez el importe de una transferencia en la misma moneda y ver el mismo importe en destino.
27. Ingresar importes reales de ambos lados de una conversión y consultar su cotización efectiva.
28. Usar opcionalmente compra para sugerir pesos por dólares y venta para sugerir dólares por pesos, pudiendo corregir y confirmar el destino real.
29. Registrar un retiro desde una cuenta bancaria hacia efectivo, con Billetera sugerida pero editable, sin contarlo como gasto.
30. Identificar retiros por separado y filtrarlos por tipo.
31. Usar Cajoncete y Billetera como cuentas en pesos y transferir efectivo entre ellas.
32. Editar un movimiento desde un popup y anularlo con confirmación, recalculando los saldos y totales.
33. Consultar y restaurar anulados, incluso si su cuenta o categoría está archivada, sin reactivarla.
34. Conservar una cuenta o categoría archivada al editar un movimiento anterior, sin ofrecerla para nuevas cargas.
35. Ver cada cuenta y su saldo en su moneda, incluyendo cuentas archivadas con saldo en el total.
36. Configurar saldo y fecha inicial por cuenta; el saldo corresponde al comienzo de esa fecha.
37. Configurar las cuentas existentes antes de usarlas, sin asumir saldos cero y mostrando si el total está incompleto.
38. Crear cuentas con nombre, moneda, saldo y fecha inicial y mantener fija su moneda.
39. Abrir desde una cuenta sus movimientos del mes, incluyendo Casa Nueva.
40. Crear, renombrar, archivar y desarchivar cuentas y categorías conservando su historial.
41. Hacer un ajuste manual indicando el saldo observado y viendo antes la diferencia calculada.
42. Ver el ajuste en movimientos, editar su cuenta, fecha, signo e importe, o anularlo y restaurarlo.
43. Contar ajustes negativos en gastos con categoría automática Ajuste manual y positivos en ingresos.
44. No crear un ajuste si el saldo observado coincide; corregir un ajuste erróneo anulándolo o editándolo.
45. Ver totales por moneda y el total estimado en USD con la cotización de venta, incluyendo efectivo.
46. Configurar cotizaciones de compra y venta, inicialmente 40, y ver actualizado el total estimado.
47. Configurar una cuenta predeterminada para gastos, ingresos y origen de transferencias y retiros.
48. Recibir advertencias de saldo negativo sin bloquear el movimiento.
49. Cargar fecha y hora actuales por defecto y editarlas; impedir registros futuros o anteriores al saldo inicial de una cuenta involucrada.
50. Ingresar importes positivos de hasta dos decimales con coma o punto y ver la moneda de la cuenta.
51. Recibir errores junto a los campos sin perder datos, confirmar la salida con cambios y reintentar si falla el guardado.
52. Ver una confirmación al registrar y poder hacer otra carga con los valores predeterminados.
53. Usar la app oscura desde Android con menú hamburguesa, movimientos compactos y filtros en panel.
54. Mantener privada la información y usar solo datos ficticios en pruebas.

## Experiencia de uso y diseño

### Dirección visual

- Interfaz inspirada en Linear: moderna, minimalista, precisa y visualmente tranquila. El modo oscuro es el único de esta versión.
- Quiet UI: ningún elemento debe competir innecesariamente por la atención. La jerarquía visual se construye principalmente con tipografía, espaciado y contraste; cuidar especialmente alineaciones, proporciones, estados interactivos y pequeños detalles.
- Fondos gris carbón, superficies con diferencias sutiles de luminosidad, texto principal blanco cálido, texto secundario gris suave y bordes discretos. Usar un color de acento con moderación.
- Tipografía Inter o Geist, jerarquía mediante tipografía, contraste y espaciado; sistema de 8 px, esquinas de 6 a 10 px y animaciones breves. Evitar gradientes llamativos, glassmorphism, sombras exageradas y tarjetas innecesarias.
- Antes de implementar, preparar una guía visual pequeña de colores, tipografía, espaciado y componentes reutilizables y aplicarla de manera consistente.
- La aplicación facilita un registro sostenible para comprender adónde va el dinero y tomar mejores decisiones sin que el seguimiento se vuelva una carga: la aplicación trabaja para el usuario.
- Reducir clics y decisiones, mostrar primero lo que requiere atención, facilitar la revisión y clasificación de movimientos y usar divulgación progresiva para mostrar detalles cuando son necesarios. Ofrecer estados vacíos, errores y confirmaciones claros y una experiencia consistente en escritorio y dispositivos móviles. Mantener legibilidad y accesibilidad sin depender solo de colores.
- No añadir funcionalidades no definidas, convertir la app en un dashboard genérico de finanzas, inversiones o contabilidad, ni agregar componentes solo para ocupar espacio. Combinar la precisión visual de Linear con la sencillez de ChatGPT, adaptadas a finanzas personales.

### Navegación e inicio

- La barra lateral ofrece Movimientos, Registrar gasto, Registrar ingreso, Registrar transferencia / retiro, Ajuste manual, Cuentas, Configurar categorías, Configuraciones y Cerrar sesión.
- Inicio muestra el saludo a Totei según la hora, el contador global de pendientes y el gasto del mes actual en UYU y USD, incluso si es cero. No muestra ingresos, movimientos recientes ni desglose por categoría.
- Al tocar pendientes se abre la lista de todos ellos, incluidos los de Casa Nueva, sin límite de fecha. Al tocar el gasto mensual se abren los gastos y ajustes negativos que componen ese total, excluyendo Casa Nueva.

### Movimientos y filtros

- La vista abre en el mes actual con los movimientos más recientes arriba. Cada fila muestra estado, fecha y hora, detalle, importe, moneda, cuenta, categoría y un lápiz. Los estados usan iconos discretos verde, amarillo y rojo para ingresado, pendiente y anulado, respectivamente; su nombre se puede consultar al tocarlos o pasar el cursor.
- Una transferencia ocupa una fila con ambos lados. Los retiros se identifican como tales y cuentan con filtro propio.
- El lápiz abre un popup de consulta y edición. Desde allí se anula con confirmación; un anulado solo se consulta o restaura. Cerrar equivale a cancelar y, si hay cambios sin guardar, pide confirmación.
- Los filtros muestran un resumen de lo activo, admiten búsqueda en detalle y nota, indican cantidad de resultados y permiten limpiarse. Si no hay resultados, se explica y se ofrece limpiar filtros.
- «Ver gastos casa» limpia los filtros y muestra Casa Nueva desde el inicio hasta hoy, con su total por moneda; después se pueden modificar los filtros. «Volver a movimientos habituales» vuelve al mes actual y excluye Casa Nueva.

### Formularios y cuentas

- Gasto: fecha y hora, cuenta, importe, detalle, categoría y nota opcional. Ingreso: los mismos campos salvo categoría y con «Sueldo» editable como detalle inicial. Ambos ofrecen registrar o guardar pendiente.
- Transferencia / retiro: fecha y hora, cuentas e importes de origen y destino, detalle generado editable y nota opcional. La opción de retiro sugiere Billetera. Se ofrece registrar o guardar pendiente.
- Ajuste manual: elegir cuenta, comparar saldo actual con saldo observado, ver la diferencia y guardar; el detalle es «Ajuste manual» y la nota opcional. No hay cuenta preseleccionada ni pendiente para ajustes.
- Al registrar se muestra una confirmación breve y se restablecen los valores iniciales del formulario. Los errores aparecen junto al campo sin borrar lo escrito; durante el guardado se indica el progreso y se desactiva el botón. Si falla, se conserva la carga para reintentar.
- Cuentas presenta una lista sin agrupaciones con nombre, moneda y saldo; muestra totales por moneda y total estimado en USD con la cotización de venta. Al seleccionar una cuenta se abre su actividad del mes, incluida Casa Nueva. Se muestran activas por defecto y existe una opción para ver archivadas.

### Teléfono y conexión

- En Android se usa desde el navegador. Un menú hamburguesa despliega la navegación y se cierra al elegir una opción.
- Los movimientos se adaptan a filas compactas con fecha, detalle e importe visibles; los demás datos y la edición siguen accesibles. Los filtros se abren en un panel y «Ver gastos casa» permanece visible fuera de él.
- La app requiere conexión y debe avisar claramente cuando falta. No se requiere instalación ni funcionamiento offline.

## Decisiones de implementación

- Mantener el monolito modular, acceso privado Google y autorización en servidor con identidad derivada de la sesión. Cada cuenta, categoría y movimiento consultado o modificado debe pertenecer al usuario autorizado.
- Extender las fronteras existentes de cuentas, gastos, transferencias, conversiones, pendientes, historial y resumen; incorporar ingresos, ajustes, configuraciones y cálculo de saldos donde corresponda. Las rutas HTTP permanecen delgadas.
- Mantener una moneda por cuenta y UYU/USD como únicas monedas. Los importes se representan con precisión decimal exacta, nunca float. El ADR de tipo de cambio efectivo conserva los importes reales como fuente de verdad y expresa UYU por USD.
- Saldos: saldo inicial no negativo al comienzo de la fecha elegida más movimientos registrados desde ese día. Pendientes y anulados no participan. Al editar, anular o restaurar, recalcular efectos en todas las cuentas y totales afectados. Advertir sin bloquear saldos negativos.
- Fecha y hora actuales editables en cargas manuales; ajustes se crean con fecha actual y después pueden editarse. Las transferencias usan una sola fecha. Rechazar fechas posteriores a hoy o anteriores al saldo inicial de cualquier cuenta involucrada.
- Las cuentas actuales requieren configuración inicial; no suponer saldo cero. Mostrar total incompleto mientras falten cuentas por configurar. Preparar un procedimiento explícito para borrar datos de prueba y conservar cuentas y categorías; no ejecutarlo sin aprobación específica.
- Las transferencias de misma moneda exigen importes iguales y cuentas distintas; las conversiones conservan ambos importes reales y muestran el tipo efectivo. La cotización general es una ayuda editable y no modifica los movimientos existentes. No solicitar institución de cambio adicional en v2.
- El ajuste manual compara el saldo calculado con el saldo observado, crea la diferencia con dirección y fecha actual, y se refleja en saldos, historial y totales. Un ajuste negativo se clasifica automáticamente como Ajuste manual; uno positivo cuenta como ingreso. Si la diferencia es cero no crea movimiento. No permite guardar pendiente.
- Mantener la distinción entre entradas pendientes y movimientos registrados del modelo existente: las cargas manuales incompletas pueden mostrarse junto al historial con estado pendiente sin participar en cálculos. Borrar definitivamente solo pendientes manuales con confirmación; conservar la evidencia original de las entradas de email conforme al ADR de ingesta. La carga de emails queda fuera de la v2.
- Anular es reversible; los anulados no se editan hasta restaurarse. No generar historial de versiones de ediciones nuevas en v2: esta decisión modifica el requisito anterior de registrar correcciones. No eliminar implícitamente datos históricos ya existentes.
- Inicio excluye Casa Nueva, muestra gasto por moneda y cuenta todos los pendientes. Historial incluye por defecto pendientes sin categoría y excluye Casa Nueva; los accesos desde cuenta y pendientes incluyen casa. Ver casa limpia filtros y muestra esa categoría desde el inicio hasta hoy. Mantener su identidad al renombrarla.
- Cotizaciones vigentes compra y venta empiezan en 40 UYU/USD, son positivas con hasta dos decimales y no mantienen historial; advertir si venta es menor que compra. Mostrar el total estimado en USD con venta y redondeo a dos decimales. No usar la presentación redondeada para recalcular importes reales.
- El filtro de tipo ofrece gasto, ingreso, transferencia, retiro y ajuste; conversión se agrupa en transferencia. Filtrar por una cuenta o moneda encuentra cualquiera de los lados de una transferencia. Categorías concretas filtran gastos; «todas» elimina la restricción e incluye casa.
- La interfaz usa modo oscuro inspirado en Linear, guía visual coherente, navegación lateral en escritorio y menú hamburguesa en móvil. Mostrar estados también con texto accesible; conservar errores y entradas ante fallos.
- Conservar la arquitectura de evidencias inmutables para fuentes existentes. La propuesta futura de inferencia de fecha/hora en email se discutirá al retomar esa ingesta; no modifica silenciosamente las decisiones existentes.

## Decisiones de pruebas

- Probar comportamientos observables en las fronteras más altas existentes: integración de servicios y rutas con base aislada, y recorridos de interfaz. Evitar pruebas de detalles internos; utilizar datos sintéticos.
- Aprovechar la infraestructura existente de Vitest, PGlite, Testing Library y Playwright, con pruebas de autorización y aislamiento por usuario.
- Cubrir saldo inicial y cálculo exacto por cuenta; gastos, ingresos, retiros, transferencias y conversiones; signos y redondeos; ajustes positivos y negativos; edición, anulación y restauración; cuentas archivadas; y fechas límite.
- Cubrir pendientes manuales, borrado definitivo autorizado y exclusión de todos los cálculos; evidencia de email conservada; filtros combinados, Casa Nueva, totales y cotizaciones.
- Cubrir interfaz en escritorio y teléfono: formularios, errores, cancelación, confirmaciones, navegación, filtros y un recorrido completo de carga, consulta, edición y anulación.
- Seguir TDD: rojo, verde y refactor por comportamiento; ejecutar pruebas afectadas y typecheck durante los ciclos, y suite completa al finalizar cada entrega.

## Fuera de alcance

Integración o pegado manual de emails; importación y exportación; bancos, notificaciones y conciliación automática; duplicados; división de gastos entre categorías; adjuntos; pagos recurrentes; alertas de saldo bajo; presupuestos; análisis por categoría en Inicio; uso offline; aplicación instalable; modo claro; múltiples usuarios; monedas adicionales. Deudas y préstamos interesan a corto plazo, pero quedan para una versión posterior.

## Notas

- La pantalla Inicio no muestra ingresos, movimientos recientes ni desglose por categoría; el análisis se considera para la v3.
- Los requisitos v2 prevalecen para el alcance nuevo donde modifican decisiones anteriores, sin alterar implícitamente el código ni migrar datos durante la planificación.
- Hay que acordar el comportamiento si la cuenta configurada por defecto se archiva; se reconoció como caso no esperado y se dejó pendiente.
- La especificación no autoriza por sí sola borrado de datos, despliegue ni migraciones destructivas.
