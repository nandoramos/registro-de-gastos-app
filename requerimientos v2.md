# Requerimientos para la versión 2

Este documento reúne las decisiones de producto acordadas para la versión 2 y conserva ejemplos de referencia para versiones posteriores. Las decisiones que cambian el MVP anterior se identifican expresamente.

## 1. Pantallas y navegación


### 1.1 Pantalla principal

- Buen dia Totei 
- tienes estos gastos pendientes de revision / no tienes gastos pendientes de revison 

 - Gasto total este mes: $34.567  

El gasto mensual se muestra separado en pesos y dólares, sin sumar las monedas. Las transferencias y conversiones no cuentan como gasto.
La pantalla principal no muestra el total de ingresos. El desglose de gastos por categoría y el análisis de gastos quedan para la versión 3.
La pantalla principal se mantiene simple: saludo, contador de pendientes y gasto del mes separado por moneda. No muestra una lista de movimientos recientes. La navegación se encuentra en la barra lateral.
El saludo usa el nombre fijo Totei y cambia entre «Buen día», «Buenas tardes» y «Buenas noches» según la hora.
Inicio muestra solo el mes actual y ambas monedas aun cuando sus importes sean cero. Si no hay pendientes, indica «No tenés movimientos pendientes».
Al tocar el gasto mensual se abre Movimientos con los gastos y ajustes negativos que componen el total del mes actual, excluyendo Casa Nueva.

Los movimientos pendientes son cargas que todavía no se han completado y registrado.
El contador incluye todos los pendientes, sin limitar por fecha. Al tocarlo, abre Movimientos filtrado para mostrar solo pendientes, sin limitar al mes actual.
----- 


### 1.2 Navegación

Que la página tenga una sidebar con botones:
- Movimientos
- Registrar gasto 
- Registrar ingreso
- Registrar transferencia / retiro
- Ajuste manual
- Cuentas
- Configurar Categorias 
- Configuraciones
- Cerrar sesión

---- 

### 1.3 Movimientos

Se listan por defecto los movimientos del mes actual, con los más recientes arriba; el usuario puede cambiar el rango con los filtros de fecha.

La vista contempla gastos, ingresos, transferencias, retiros, ajustes y movimientos pendientes.

Una transferencia entre cuentas propias se muestra como una sola operación y actualiza los saldos de origen y destino. No se suma a los totales de gastos ni ingresos.
La transferencia tiene una sola fecha para ambas cuentas; el seguimiento de transferencias en tránsito queda fuera de esta versión.
Las cuentas de origen y destino deben ser distintas. Si tienen la misma moneda, los importes de ambos lados deben ser iguales: al ingresar el importe de origen, la app completa el mismo importe en destino.
El detalle se genera con las cuentas de origen y destino; si tienen distintas monedas, incluye también el tipo de cambio efectivo calculado a partir de los importes reales. El detalle se puede editar y la cotización efectiva sigue disponible como dato de la transferencia.
Al editar una transferencia se pueden modificar sus cuentas e importes con las mismas validaciones que una nueva. Al editarla, anularla o restaurarla, se recalculan los saldos de las cuentas afectadas.

En la tabla, la transferencia ocupa una fila que muestra ambas cuentas y ambos importes. Al abrir su detalle se puede consultar la cotización efectiva, si corresponde, y la nota opcional, si existe.
Al filtrar por cuenta o moneda, la transferencia aparece si coincide cualquiera de sus dos lados, mostrando la operación completa.

Si las cuentas tienen monedas diferentes, el usuario puede ingresar los importes reales de ambos lados; por ejemplo, USD 100 de Prex y UYU 4.050 acreditados en Itaú. La cotización general no reemplaza esos importes. La operación actualiza ambos saldos y no cuenta como gasto ni ingreso. El detalle muestra la cotización efectiva calculada a partir de los dos importes reales.

Para la versión 2 alcanza con registrar las cuentas de origen y destino; no se solicita una institución de cambio adicional. Esto modifica la opción de institución que figura en las decisiones anteriores del proyecto.

Como ayuda opcional, la cotización general puede sugerir el importe de destino: usa la cotización de compra al cambiar dólares por pesos y la de venta al cambiar pesos por dólares. El usuario puede editarlo y debe confirmar el importe realmente acreditado antes de guardar.

El usuario dispone de dos cuentas de efectivo en pesos: Cajoncete y Billetera. Si más adelante necesita efectivo en dólares, podrá crear otra cuenta. Un retiro se registra como una transferencia desde la cuenta bancaria a una cuenta de efectivo; Billetera se selecciona por defecto y el usuario puede cambiar el destino. El retiro no se cuenta como gasto; el gasto se registra cuando se utiliza el efectivo.

#### Columnas
 en la tabla se  ven las siguientes columnas 
      - Estado: ícono sutil verde para ingresado, amarillo para pendiente y rojo para anulado. Al tocarlo o pasar el cursor muestra el nombre del estado.
      - Fecha y hora, con fecha en formato día/mes/año.
      - Detalle 
      - Importe: ingresos en verde con signo + y salidas en rojo con signo −.
      - Moneda 
      - Cuenta
      - Categoría
      - Acción: editar (ícono de lápiz).

El lápiz abre un formulario emergente de edición con los datos del movimiento. Desde ese formulario también se puede anular, tras pedir confirmación. Anular conserva el movimiento y su estado; no lo elimina definitivamente.
No se conserva un historial de versiones de las ediciones; se mantienen los datos actuales. Las anulaciones sí se conservan y son reversibles. Esto modifica la decisión anterior del proyecto de registrar las correcciones.
En gastos e ingresos registrados se pueden editar fecha, importe, cuenta y detalle; en gastos también la categoría. Al guardar se recalculan los saldos y totales afectados.
No se cambia directamente el tipo de un movimiento registrado; si el tipo es incorrecto, se anula y se crea otro movimiento.
Cerrar el formulario emergente equivale a cancelar: se descartan los cambios de esa edición y se conserva el estado anterior.
Los movimientos anulados se ocultan por defecto. Un filtro «Mostrar anulados» permite consultarlos y restaurarlos; al restaurarlos vuelven a afectar los saldos y totales correspondientes.
Un anulado no se puede editar hasta restaurarlo. Al restaurarlo conserva sus últimos datos guardados, incluso si la cuenta o categoría está archivada; esto no reactiva la cuenta o categoría.
«Pendiente» es un estado, no una categoría. Se pueden guardar cargas manuales incompletas como pendientes y completarlas después. Aparecen en la tabla y en el contador de pendientes, pero no participan en saldos, gastos, ingresos ni otros totales hasta completarse y registrarse.
Para guardar inicialmente una carga pendiente se requiere al menos el tipo de movimiento; los demás datos pueden estar incompletos.
Para completar un pendiente, el usuario lo abre con el lápiz y elige «Guardar y registrar» después de completar los datos requeridos. Entonces pasa a ingresado y actualiza los saldos y totales correspondientes.
La edición de un pendiente no permite guardar cambios parciales: se completa y registra, o se cancela sin cambios.
Un pendiente creado manualmente puede borrarse definitivamente, con confirmación. Las entradas pendientes provenientes de emails conservan la regla anterior de preservar su evidencia al descartarse; la integración automática de emails queda fuera de esta versión.

#### Filtros
- filtro por tipo de gasto
- Filtro de categorías con selección múltiple, incluida la opción de seleccionar todas.
- Al seleccionar categorías concretas se muestran solo los gastos correspondientes. «Todas las categorías» quita esa restricción, incluye Casa Nueva y permite ver también los demás tipos, respetando los otros filtros.
- filtro por cuenta
- Los filtros de cuentas y tipos de movimiento permiten selección múltiple.
- El filtro por tipo ofrece Gasto, Ingreso, Transferencia, Retiro y Ajuste manual. Las conversiones se incluyen en Transferencia.
- El filtro de estado permite seleccionar ingresados, pendientes y anulados; los anulados se ocultan por defecto.
- filtros por defecto (excluir gastos casa)
- desde / hasta 
- El rango desde/hasta incluye completos ambos días.
- Puede indicarse solo «Desde» para consultar hasta hoy, o solo «Hasta» para consultar desde el inicio de los registros. Si ambas fechas son iguales, se consulta ese día completo.
- Moneda 
- Búsqueda por texto en el detalle y la nota, combinada con los filtros activos.

La vista muestra un resumen de los filtros activos y permite limpiarlos. Al limpiar, vuelve al mes actual y excluye Casa Nueva por defecto.
La tabla muestra los totales de gastos e ingresos de los movimientos filtrados, separados por moneda; las transferencias no se cuentan como gastos ni ingresos.
La vista indica la cantidad de movimientos que coinciden con los filtros.

Los gastos de la categoría «Casa Nueva» se excluyen por defecto de los filtros habituales. Un botón «Ver gastos casa» limpia los demás filtros y configura la vista para mostrar solo esa categoría desde el inicio hasta hoy. El usuario también puede incluirlos manualmente al seleccionar todas las categorías.
Los pendientes sin categoría se muestran en la vista habitual. Un pendiente con categoría Casa Nueva se oculta en esa vista, pero aparece en «Ver gastos casa» y al consultar todos los pendientes desde Inicio.
Después de abrir esa vista, el usuario puede cambiar el rango de fechas y los demás filtros.
La categoría Casa Nueva puede renombrarse; la app seguirá identificándola para el acceso directo y la exclusión por defecto.
La vista de gastos de casa muestra el total del período visible separado por moneda.
Un botón «Volver a movimientos habituales» restablece el mes actual, excluye Casa Nueva y limpia los demás filtros.


### 1.4 Cuentas
- tabla con la plata que tiene cada cuenta
- Mostrar el saldo de cada cuenta.
- Mostrar una lista sencilla sin agrupaciones, con nombre, moneda y saldo de cada cuenta; el total estimado en dólares aparece aparte.
- Al seleccionar una cuenta se abre Movimientos filtrado por esa cuenta y por el mes actual, incluyendo Casa Nueva para mostrar todos los movimientos de la cuenta.
- suma total de dinero en dólares
- El manejo actual de las cuentas (agregar / archivar / renombrar) 
- Una cuenta archivada puede desarchivarse conservando su saldo e historial. Las cuentas archivadas no se ofrecen como origen ni destino de movimientos nuevos.
- La pantalla muestra las cuentas activas por defecto y ofrece «Mostrar archivadas».
- Al crear una cuenta se indican nombre, moneda, saldo inicial y fecha inicial en el mismo formulario.
- La moneda queda fija al crear la cuenta; para otra moneda se crea una cuenta nueva.
- Todas las cuentas requieren saldo y fecha inicial. Para las cuentas existentes, la app solicita esos datos antes de permitir nuevos movimientos con ellas; no supone un saldo cero. La fecha inicial sugiere hoy y puede modificarse.
- Mientras alguna cuenta carezca de saldo inicial, se muestran las cuentas configuradas y se indica que el total general está incompleto.

El total estimado en dólares incluye las cuentas bancarias y de efectivo, usa la cotización general de venta y muestra la cotización utilizada. Al cambiar esa cotización, el total se actualiza; los saldos de las cuentas permanecen en su moneda.
La pantalla muestra también los totales de saldos en pesos y en dólares por separado, antes del total estimado convertido a dólares.
Los saldos de cuentas archivadas se incluyen en el total mientras no sean cero, aunque esas cuentas no se ofrecen para nuevos movimientos.

#### Decisiones acordadas sobre saldos y ajustes

- Cada cuenta parte de un saldo ingresado por el usuario para el comienzo de una fecha inicial; todos los movimientos de esa fecha y los posteriores actualizan el saldo.
- El saldo inicial es cero o positivo.
- Se permiten movimientos que dejen una cuenta con saldo negativo; la aplicación muestra una advertencia sin bloquear el registro.
- Los movimientos anteriores a la fecha inicial quedan fuera del alcance de esta versión.
- Si se intenta registrar un movimiento anterior a la fecha inicial de una cuenta involucrada, la aplicación impide el registro y explica que debe corregirse la fecha o la cuenta.
- Al comenzar a usar la versión 2, se borrarán los registros anteriores de prueba y se conservará la configuración de cuentas y categorías. El borrado se realizará únicamente cuando se acuerde su procedimiento y se autorice su ejecución.
- «Ajuste manual» tiene una pantalla propia en la barra lateral. El usuario elige una cuenta y escribe el saldo que observa; la app calcula la diferencia y crea un ajuste con la fecha actual, visible en movimientos. Al crearlo no se elige otra fecha.
- Si el saldo indicado coincide con el calculado, no se crea un ajuste y se informa que el saldo ya coincide.
- El formulario de ajuste no preselecciona la cuenta por defecto; el usuario elige la cuenta.
- Al elegir la cuenta, el formulario muestra su saldo actual antes de ingresar el saldo observado.
- Antes de guardar, muestra la diferencia calculada entre el saldo actual y el saldo observado.
- El detalle se genera como «Ajuste manual» y se puede agregar una nota opcional al crearlo.
- El saldo inicial no se edita después de configurarlo; las correcciones posteriores se realizan mediante ajustes manuales.
- Un ajuste se guarda sin confirmación adicional y no ofrece guardar pendiente.
- El ajuste puede editarse, incluida su cuenta, importe y fecha, además del detalle y la nota; también puede anularse y restaurarse. Los saldos y totales afectados se recalculan según sus datos y estado.
- Al cambiar la cuenta de un ajuste se conserva su dirección; al editarlo también se puede cambiar de negativo a positivo o viceversa.
- Un ajuste negativo se incluye en el gasto total del mes, con la categoría «Ajuste manual» asignada automáticamente. Un ajuste positivo se incluye en el total de ingresos.
- Si se descubre el movimiento que faltaba, el usuario puede anular el ajuste y registrar el movimiento real.

### 1.5 Registrar ingreso

Una pantalla accesible desde la barra lateral permite registrar ingresos con fecha y hora actuales editables, cuenta por defecto editable, importe con la moneda de la cuenta, detalle y nota opcional. Fecha, detalle, importe y cuenta son obligatorios; no se exige categoría. El detalle comienza con «Sueldo» y se puede editar. Ofrece «Registrar ingreso» y «Guardar pendiente». El ingreso registrado actualiza el saldo de la cuenta.

### Registrar gasto

El formulario incluye fecha y hora actuales editables, cuenta por defecto editable, importe con la moneda de la cuenta, detalle, categoría elegida manualmente y nota opcional. Ofrece «Registrar gasto» y «Guardar pendiente».

### Registrar transferencia / retiro

El formulario incluye fecha y hora actuales editables, cuenta de origen por defecto editable, cuenta de destino, importes de ambos lados, detalle generado editable y nota opcional. Incluye una opción explícita «Retiro de efectivo» que sugiere Billetera como destino, editable; el movimiento se identifica como «Retiro» en la tabla y funciona como transferencia. Si las monedas son iguales se completa el mismo importe en destino; si son distintas se pueden editar ambos importes. Ofrece «Registrar transferencia» y «Guardar pendiente».

### 1.6 Configuraciones

Una sección en la barra lateral permite ingresar las cotizaciones generales de compra y venta de dólares. Ambas tienen un valor inicial de 40 pesos por dólar. También permite elegir la cuenta por defecto, inicialmente Itaú pesos. Esta sección podrá ampliarse más adelante.
Compra y venta se editan en dos campos y se guardan juntas. Cada valor debe ser mayor que cero y admite hasta dos decimales. Se conserva solo la cotización vigente; las transferencias mantienen su tipo de cambio efectivo propio.
Si la cotización de venta es menor que la de compra, se muestra una advertencia pero se permite guardar.
La cuenta por defecto se selecciona en gastos e ingresos y como origen de transferencias y retiros; el usuario puede cambiarla en cada carga.
La cuenta por defecto se cambia con su propio selector y botón de guardado, independientemente de las cotizaciones.

### 1.7 Categorías

Se conservan las opciones de crear, renombrar y archivar categorías. Una categoría archivada puede desarchivarse para volver a usarla en gastos nuevos; sus movimientos anteriores se conservan.




## 2. Diseño y experiencia de uso


Quiero que diseñes la interfaz de mi aplicación personal de registro de gastos siguiendo una dirección visual inspirada en Linear.

### 2.1 Dirección estética
Utilizá los siguientes principios de diseño:

Linear-inspired: interfaz moderna, minimalista, precisa y muy pulida.

Dark-first: el modo oscuro es el diseño principal, no una adaptación posterior.

La versión 2 ofrece únicamente modo oscuro; el modo claro queda para más adelante.

Quiet UI: una interfaz visualmente silenciosa, sin elementos que compitan innecesariamente por la atención.

Typography-driven: la jerarquía visual debe construirse principalmente mediante tipografía, espaciado y contraste.

High craftsmanship: prestar especial atención a alineaciones, proporciones, estados interactivos y pequeños detalles.

### 2.2 Sistema visual
Fondos gris carbón, evitando el negro puro.

Superficies con diferencias sutiles de luminosidad.

Texto principal blanco cálido y textos secundarios gris suave.

Bordes finos, discretos y de bajo contraste.

Tipografía Inter o Geist, con una jerarquía clara y consistente.

Sistema de espaciado de 8 px.

Esquinas moderadamente redondeadas (6–10 px).

Un único color de acento, utilizado con moderación.

Animaciones breves y discretas, sin efectos innecesarios.

Evitar gradientes llamativos, glassmorphism, sombras exageradas y tarjetas por todas partes.

### 2.3 Filosofía de experiencia de uso
Esta aplicación busca facilitar un registro de gastos sostenible, que permita comprender adónde va el dinero y tomar mejores decisiones, sin transformar el seguimiento financiero en una tarea pesada.

La aplicación debe trabajar para el usuario, no al revés.

Priorizá:

Reducir la cantidad de clics y decisiones.

Mostrar primero lo que requiere atención.

Facilitar la revisión y clasificación de movimientos.

Utilizar divulgación progresiva: mostrar los detalles cuando son necesarios.

Diseñar estados vacíos, errores y confirmaciones claros.

Mantener una experiencia consistente en escritorio y dispositivos móviles.



### 2.4 Restricciones y guía visual
No agregues funcionalidades que no estén definidas en el proyecto.

No conviertas la aplicación en un dashboard genérico de finanzas, inversiones o contabilidad.

No utilices componentes visuales innecesarios solo para ocupar espacio.

El resultado debe sentirse como una combinación de la precisión visual de Linear y la sencillez de ChatGPT, adaptada a una herramienta de finanzas personales.

Antes de implementar, definí una pequeña guía visual con colores, tipografía, espaciados y componentes reutilizables. Después aplicala consistentemente a toda la interfaz.


### 2.5 Responsive

la aplicacion debe poder ser accesible en terminos de UX desde un telefono andrioid y ser usable 

En el teléfono, un botón de menú hamburguesa despliega la navegación de la barra lateral; al elegir una opción, el menú se cierra.
La aplicación se usa como web en el teléfono y requiere conexión; si no la hay, debe avisarlo claramente.
En móvil, los movimientos se muestran en filas compactas con fecha, detalle e importe visibles; los demás datos y el botón de edición siguen accesibles en cada fila.
En móvil, un botón «Filtros» abre un panel; al aplicar los filtros, el panel se cierra y muestra los resultados.
El acceso «Ver gastos casa» está visible en móvil sin abrir el panel de filtros.


## 3. Comportamiento de los formularios

Al registrar un movimiento se muestra una confirmación breve y el formulario queda limpio para facilitar otra carga, restableciendo los valores por defecto que correspondan.
Los errores de validación se muestran junto al campo sin perder lo escrito. Al intentar salir de un formulario con cambios sin guardar, se pide confirmación.
Al cerrar el popup de edición se pide confirmación solo si hay cambios sin guardar. Si falla el guardado, se conserva lo escrito para reintentar. Mientras se guarda, se muestra «Guardando…» y se desactiva temporalmente el botón.

### 3.1 Fecha y hora

- No dejar vacíos los campos de fecha y hora.
- Las cargas manuales nuevas muestran por defecto la fecha y hora actuales, que el usuario puede editar antes de guardar.
- Los movimientos con fecha posterior a hoy quedan fuera de esta versión y no se pueden registrar.
- Si un mail trae fecha u hora, usarlas; si se pueden inferir, inferirlas. En caso contrario, cargar la fecha u hora actual por defecto.
- Esta propuesta sobre emails queda para una versión posterior y contradice la decisión anterior de `docs/PROJECT.md`; deberá revisarse antes de implementar esa ingesta.
### 3.2 Formato de importes

En las cargas manuales, la moneda se toma de la cuenta seleccionada y se muestra junto al importe. En transferencias se muestra la moneda de cada cuenta. Si se cambia la cuenta por otra con distinta moneda, se conserva el importe numérico ingresado y se actualiza la moneda mostrada.
Los importes de movimientos registrados deben ser mayores que cero y admiten hasta dos decimales. Los ajustes reflejan la dirección positiva o negativa de la diferencia.
Los campos manuales aceptan números con coma o punto decimal, sin símbolos ni texto de moneda; se presentan con un formato consistente como 3.000,50. Los ejemplos de texto con moneda que siguen quedan como referencia para la futura interpretación de emails.
Se admiten separadores de miles cuando el formato sea inequívoco; si es ambiguo, se pide corregirlo.

- A veces podés recibir entrada en pesos tipo:

```$ 3000.50 
UYU 3000.50 
$ 3000,50
UYU 3000,50
3000.50 $
3000,50 pesos urguayos```
y cualquier otra combinacion parecida, todas debes parcearlas a 

$ 3000,50 

Mismo razonamiento con dolares 



## 4. Ejemplos de mails bancarios — para más adelante

Los siguientes ejemplos tienen datos modificados y se usan para conversar sobre los formatos y su interpretación.

### 4.1 Transferencia en pesos

esto es un mail posible de transferencia: 

Itaú comunica
Aviso de transferencia realizada
Transferencia realizada.

Detalles:

Transferencia realizada desde la cuenta ****1234
Importe: 3300.00 $
Cuenta destino: 9000123
Banco/Institución destino: Banco Itau

Además ingresando con tu documento y contraseña, a <www.itau.com.uy> podés ver el detalle de todos tus movimientos.
Itaú

de aca sacamos el:
Cuenta origen ITAU - Pesos
Importe $ 3300
Destinatario seria: Banco Itau - 9000123 


### 4.2 Consumo con tarjeta de débito

Aviso de consumo aprobado con tarjeta de débito
Se aprobo un consumo de su tarjeta Visa terminada en 5678 . Realizado en COMERCIO EJEMPLO Monto: 930.00 Pesos. Si no fuiste tú comunícate al 1784.

Además ingresando con tu documento y contraseña, a <www.itau.com.uy> podés ver el detalle de todos tus movimientos.
Itaú



 de aca sacamos el:
Cuenta origen ITAU - Pesos
Importe $ 930
Destinatario seria: COMERCIO EJEMPLO


### 4.3 Transferencia en dólares

Aviso de transferencia realizada
Transferencia realizada.

Detalles:

Transferencia realizada desde la cuenta ****4321
Importe: 300.00 USD
Cuenta destino: 00000000012345
Banco/Institución destino: Banco de la República Oriental del Uruguay

Además ingresando con tu documento y contraseña, a <www.itau.com.uy> podés ver el detalle de todos tus movimientos.
Itaú

 de aca sacamos el:
Cuenta origen ITAU - Dolares
Importe USD 300
Destinatario seria: BROU - 00000000012345


### 4.4 Pago desde cuenta


Pago realizado.
Tu pago fue realizado con éxito. Siguen los detalles del mismo:

Cuenta origen terminada en ...1234.
Monto: $ 334.80.
Pago a SISTARBANC.

Si no fuiste tu comunícate al 1784.
Itaú

de aca sacamos el:
Cuenta origen ITAU - Pesos
Importe $ 334.80
Destinatario seria: SISTARBANC

### 4.5 Pago de tarjeta de crédito en dólares


Notificación de pago de tarjeta de crédito
Cuenta Origen
Titular: Persona Ejemplo
Número de cuenta: 000000001234
Moneda: USD
Tipo: Caja de ahorro
Tarjeta de Crédito
Titular: Persona Ejemplo
Número de tarjeta de crédito: XXXXX-9876
Moneda: USD
Datos de la operación
Operador: Persona Ejemplo
Concepto origen: 
Monto: USD 64,43
Fecha valor: 20/10/2026 16:51:37
Resultado
Estado: Exitosa
Referencia: 100001
Código: 0
Mensaje: 

Si tenés cualquier duda, llamá al (2) 132
Nota: Este e-mail es generado de manera automática, por favor no respondas a este mensaje.


Cuenta origen Santander - Dolares
Importe USD 64,43
Destinatario seria: Tarjeta de credito santander dolares 



### 4.6 Pago de tarjeta de crédito en pesos


Notificación de pago de tarjeta de crédito
Cuenta Origen
Titular: Persona Ejemplo
Número de cuenta: 000000005678
Moneda: UYU
Tipo: Caja de ahorro
Tarjeta de Crédito
Titular: Persona Ejemplo
Número de tarjeta de crédito: XXXXX-9876
Moneda: UYU
Datos de la operación
Operador: Persona Ejemplo
Concepto origen: 
Monto: UYU 5170,21
Fecha valor: 20/10/2026 16:51:34
Resultado
Estado: Exitosa
Referencia: 100002
Código: 0
Mensaje: 

Si tenés cualquier duda, llamá al (2) 132
Nota: Este e-mail es generado de manera automática, por favor no respondas a este mensaje.


Cuenta origen Santander - Pesos
Importe UYU 5170,21
Destinatario seria: Tarjeta de credito santander Pesos



## 5. Qué significa que esta versión está terminada

1) puedo ver un listado con los movimientos del mes, claramente identificar si fue una entrada o una salida de dinero, de donde salio la plata, detalle, la fecha, etc

2) puedo agregar facilmente gastos, transferencias y retiros

3) puedo saber cuanto dinero tengo en cada una de las cuentaas, y ese dinero se actualiza con los movimientos 

4) tengo la opcion de filtar los movimientos, por rango de fechas, o por tipo (poder excluir el gasto de la construccion de la casa es importante)

5) la estetica de la app es bonita, acorde a los puntos en la parte de diseño

6) tiene una version mobile para telefono usable 


## 6. Qué queda fuera de esta versión

1) integracion con los emails (va para futuro)

También quedan para más adelante la carga pegando manualmente textos de emails y la importación de movimientos desde archivos.

2) integracion con bancos y notificaciones del tenefono (va a futuro)

3) validar cuentas contra los estados de los bancos (va a futuro) 

4) registrar deudas o préstamos entre personas: interesa abordarlo pronto, pero queda fuera de la v2.
