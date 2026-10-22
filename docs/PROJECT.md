# Registro de Gastos App — Contexto del proyecto

## Visión
Aplicación personal, privada y mobile-first para registrar gastos y movimientos bancarios con la menor intervención posible, sin perder confiabilidad. El código se publicará como open source en el GitHub del autor; los datos y credenciales nunca se publican ni se comparten con otras instalaciones. No se busca monetizar ni ofrecer SaaS.

## Filosofía de producto
Inspiración de Rodrigo Álvarez / Neurona Financiera: facilitar un registro de gastos sostenible que permita comprender adónde va el dinero, reconocer patrones y tomar decisiones conscientes, sin convertir el seguimiento en una carga. **La app tiene que trabajar para vos, no vos para la app.** Priorizar facilidad de uso, confiabilidad, estética cuidada y automatización progresiva.

## Experiencia objetivo (futuro)
«Encontré 7 movimientos hoy. Clasifiqué 5 automáticamente. Necesito que me digas qué son estos 2».
Las reglas explícitas aprobadas por el usuario pueden clasificar automáticamente; los eventos ambiguos, erróneos y posibles duplicados requieren revisión. Permitir corregir y deshacer. Una corrección manual de categoría modifica solo ese movimiento; nunca cambia reglas ni movimientos históricos por defecto.

## Alcance comprometido: MVP v0.1
- Inicio de sesión privado para un usuario.
- Pegar manualmente el texto de emails de Itaú de compras con débito y transferencias.
- Probar la interpretación de esos emails con textos sintéticos que imiten su formato, sin usar emails ni movimientos reales como fixtures. Esto no implica recibir correo automáticamente en el MVP.
- Ingresar manualmente transferencias propias y conversiones cuando no haya un email utilizable.
- Disponer de un endpoint autenticado para ingresar desde la app datos estructurados de gastos, transferencias propias y conversiones, sin exigir texto con formato de email. En el MVP utiliza la sesión del usuario; el acceso mediante herramientas externas queda para después. El contrato detallado y la interfaz de carga están pendientes de definición.
- Extraer tipo, importe, moneda y datos disponibles; no inventar fecha/hora ni destinatarios ausentes.
- Preservar evidencia original y registrar su procedencia.
- Conservar las entradas autorizadas que no puedan interpretarse o carezcan de datos esenciales como pendientes de revisión. Permitir completar o corregir su interpretación después, manteniendo intacta la entrada original; no crear el movimiento financiero hasta que reúna los datos necesarios.
- Registrar sin revisión humana adicional los gastos que tengan todos los datos obligatorios y cumplan los criterios explícitos de confianza: datos respaldados, validaciones satisfactorias y ausencia de ambigüedades o contradicciones sin resolver. La completitud por sí sola no basta.
- Identificar obligatoriamente la cuenta de origen de cada gasto, incluyendo cuentas bancarias y efectivo. Cada cuenta tiene una única moneda. El conjunto de cuentas debe poder ampliarse y no quedar limitado a una lista fija de bancos.
- Categorizar, describir y editar cada movimiento manualmente, registrando correcciones.
- Historial consultable y resumen mensual básico.
- Distinguir gasto, transferencia entre cuentas propias, retiro y otros movimientos para evitar contabilidad doble.
- Registrar y seguir transferencias entre cuentas propias de distintos bancos y conversiones de moneda, especialmente de USD a UYU. Identificar cuentas, importes y monedas en origen y destino, y vincular ambas partes como una misma operación. Para conversiones, calcular y guardar el tipo de cambio efectivo a partir de los importes reales y conservar la institución interviniente. El MVP permite consultar ese historial; no calcula ni muestra saldos por cuenta.
- Preparar aislamiento de datos por user_id en API y persistencia, aunque la interfaz sea de un solo usuario.

## Stack decidido
Next.js (React + backend Node.js) con TypeScript; PostgreSQL alojado en Neon; Drizzle ORM; Tailwind CSS + shadcn/ui; hosting Vercel; GitHub público. Validar versiones y límites de servicios al implementar. Monolito modular, sin microservicios.

## Diseño de datos y seguridad
Separar eventos originales (`source_events`) de movimientos interpretados (`transactions`), porque un mismo gasto podrá llegar de varias fuentes. Mantener el texto original, la clasificación actual, origen de clasificación y registro de cambios. Dinero con precisión decimal y moneda explícita; no convertir silenciosamente UYU/USD. Autenticación y autorización en servidor; `user_id` siempre derivado de sesión o identidad de integración, no confiado del cliente. Validar acceso en cada consulta. No registrar datos bancarios completos en logs. Secretos fuera de Git y copias de seguridad seguras.

### Monedas admitidas

El MVP admite únicamente UYU y USD para cuentas, movimientos financieros y conversiones. El soporte de otras monedas queda para una versión posterior. La evidencia original se conserva aunque mencione otras monedas; esto no habilita registrar movimientos en monedas no admitidas.

### Importes y redondeo

Los importes en UYU y USD deben ser positivos y admitir hasta 2 decimales. La cotización manual también debe ser positiva y admitir hasta 2 decimales. El importe de destino calculado se redondea al centésimo más cercano; si queda exactamente a mitad, se redondea hacia arriba. El usuario confirma o corrige ese importe antes de registrar la conversión. El tipo de cambio efectivo se calcula con los importes finales confirmados; su presentación redondeada no se utiliza para recalcularlos. Los cálculos monetarios se realizan con precisión decimal, sin float.

### Inicio de sesión privado

El inicio de sesión del MVP utiliza la cuenta de Google del usuario y permite el acceso únicamente a su identidad autorizada. La autenticación con Google se usa solo para identificar al usuario, sin acceso a Gmail ni a sus correos. No se implementa un sistema propio de usuario y contraseña. Se mantienen la autorización en servidor y el aislamiento de datos por usuario; la identidad autenticada debe ser además la autorizada para esta instalación. La carga de datos en el MVP se realiza desde la app con esa sesión, sin credenciales de ingesta para herramientas externas. Los detalles técnicos de configuración quedan por definir.

### Ingesta común
Cada fuente adapta su entrada a un contrato común y utiliza la misma lógica de negocio para validar y registrar los datos. El texto de email pasa por un parser puro; la entrada manual recibe datos estructurados. Ambas conservan su entrada original y procedencia, separadas de la interpretación financiera. En el monolito, las rutas invocan la función compartida directamente, sin requerir llamadas HTTP entre endpoints. Ver [ADR-0001: ingesta común con adaptadores](adr/0001-ingesta-comun-con-adaptadores.md).

El MVP incluye las entradas de texto de email Itaú y datos manuales. La arquitectura permite incorporar fuentes nuevas después; no incluye implementar ahora la captura de correo ni notificaciones de Android.

El soporte de cuentas de varios bancos no implica incluir parsers para bancos adicionales en el MVP.

El MVP incluye una opción «Probar interpretación»: el usuario pega un texto sintético y ve qué datos se detectan y cuáles faltan, sin crear eventos de fuente, entradas pendientes ni movimientos financieros. Las pruebas automáticas también utilizan datos ficticios separados de los registros del usuario.

Una entrada pendiente de revisión conserva evidencia, pero todavía no representa un movimiento financiero registrado ni participa en los totales. La corrección manual completa la interpretación y conserva su trazabilidad. Los mínimos para gastos, transferencias y conversiones se detallan a continuación. No se presupone que todo dato opcional ausente bloquee el registro.

### Registro desde una entrada pendiente

Al completar o corregir una entrada pendiente, una sola acción «Guardar y registrar» registra el movimiento si los datos cumplen los requisitos obligatorios, pasan las validaciones y quedan resueltas las ambigüedades o contradicciones. No se exige una confirmación adicional de «revisado». Se conserva la evidencia original y queda constancia de la intervención manual. Si todavía falta algún dato obligatorio o persiste un impedimento, la entrada sigue pendiente y la aplicación indica qué debe resolverse.

### Descarte de entradas pendientes

El usuario puede descartar una entrada pendiente que no corresponda registrar. Se conserva intacta su evidencia original, pero deja de aparecer en la lista y en el contador de pendientes y no participa en los totales. El descarte es reversible: al recuperarla, vuelve a estar pendiente de revisión, sin registrar automáticamente un movimiento financiero.

### Anulación de movimientos registrados

El usuario puede anular un movimiento registrado por error sin borrarlo. El movimiento anulado deja de participar en los totales, conservando la evidencia original y el historial de cambios. La anulación es reversible: puede restaurarse, volviendo a participar en los totales que correspondan según su naturaleza y los filtros aplicados. Esta acción permite corregir manualmente cargas duplicadas y no incorpora detección automática de duplicados al MVP.

### Nota del movimiento

Cada movimiento puede incluir una nota opcional de texto libre, además del título obligatorio. La nota permite guardar aclaraciones y se puede editar sin alterar la evidencia original. No es necesario completarla para registrar el movimiento.

### Fechas y hora

Se utiliza la fecha de la operación indicada en el email; si falta, el usuario la completa manualmente. La hora se conserva cuando está disponible, sin exigirla ni inventarla. Se registra por separado cuándo ingresó la entrada a la aplicación. Los gastos se agrupan por mes según la fecha de la operación, nunca según la fecha de carga. Una operación sin fecha permanece pendiente de revisión.

### Correcciones de gastos registrados

Una corrección manual de un gasto registrado se guarda sin exigir otra revisión, siempre que el resultado siga cumpliendo las validaciones. Se registra el cambio, se actualizan los totales correspondientes y se conserva intacta la evidencia original. Si la edición deja un dato obligatorio vacío o introduce una contradicción, se impide el guardado y se explica qué debe corregirse; el gasto conserva su última versión válida.

### Requisitos mínimos para registrar un gasto
Un gasto requiere estos datos antes de convertirse en un movimiento financiero registrado:

- Fecha del gasto.
- Importe.
- Moneda explícita, conforme a la decisión previa sobre importes monetarios.
- Título descriptivo.
- Categoría.
- Cuenta de origen.

Si falta alguno, la entrada queda como gasto pendiente de revisión y no participa en los totales. La revisión manual exige completar los datos obligatorios; una fecha ausente no se sustituye por la fecha de ingreso a la aplicación. Se descarta registrar gastos sin fecha y dejarlos sin asignar a un mes.

Los datos adicionales podrán ser opcionales; su lista y validaciones siguen por definir. Estos requisitos corresponden a gastos y no se trasladan automáticamente a transferencias propias o conversiones. Un gasto completo, válido y confiable se registra directamente, sin exigir revisión humana adicional; sigue sujeto a las validaciones automáticas y la autorización del usuario.

### Requisitos mínimos para transferencias propias y conversiones
Se requieren estos datos antes de registrar la operación financiera:

- Fecha de la operación.
- Título descriptivo.
- Cuenta de origen e importe efectivamente debitado, en la moneda de esa cuenta.
- Cuenta de destino e importe efectivamente acreditado, en la moneda de esa cuenta.

No se exige categoría de gasto, porque se está trasladando dinero propio. Si falta cualquiera de los lados o algún otro dato obligatorio, la entrada permanece pendiente de revisión hasta completarlo; no se registra únicamente la salida como una operación ya completa.

Los retiros de efectivo se registran como transferencias entre una cuenta bancaria del usuario y una cuenta de efectivo propia, sin contarlos como gastos. El gasto se registra cuando se paga desde la cuenta de efectivo. Se aplican los requisitos de las transferencias propias; este tratamiento no agrega cálculo de saldos al MVP.

Cuando un email informa una transferencia y el texto no permite distinguir si corresponde a un gasto o a un traslado entre cuentas propias, el usuario debe indicar cuál es su naturaleza. Hasta resolver esa ambigüedad, la entrada permanece pendiente y no participa en los totales. Una transferencia para pagar un servicio es un gasto; mover dinero entre cuentas propias es una transferencia propia. La indicación bancaria de «transferencia» por sí sola no determina su clasificación financiera.

Si el email de una transferencia propia o conversión contiene solo uno de los lados, se conservan los datos disponibles y el usuario completa manualmente la cuenta y el importe faltantes. La entrada permanece pendiente hasta reunir ambos lados y los demás datos obligatorios; no se contabiliza como gasto.

Cuando las cuentas tienen monedas distintas, el tipo de cambio efectivo se calcula y guarda automáticamente a partir de los importes reales debitado y acreditado. No requiere cargar una cotización manual ni consultar una cotización de mercado. Su representación debe identificar las monedas y el sentido de la relación. Para USD y UYU, tanto la cotización editable como el tipo de cambio efectivo se expresan siempre en pesos por dólar, con 2 decimales visibles: por ejemplo, «1 USD = 40,25 UYU», tanto al comprar como al vender dólares. Se multiplica el importe en USD por la cotización para calcular UYU y se divide el importe en UYU por ella para calcular USD. El tipo de cambio efectivo se presenta con 2 decimales sin utilizar esa presentación redondeada para recalcular los importes confirmados. La cotización manual y el importe de destino calculado siguen las reglas de la sección «Importes y redondeo». La representación interna del tipo de cambio efectivo queda por precisar técnicamente. El cálculo no sustituye ni modifica los importes reales obligatorios de ambos lados.

Como ayuda opcional para cargar una conversión, el usuario puede introducir y editar una cotización para calcular el importe de destino a partir del importe de origen. Antes de registrar la operación debe confirmar el importe de destino como el efectivamente acreditado, corrigiéndolo si corresponde. El resultado calculado no se considera por sí solo un importe real confirmado. El tipo de cambio efectivo se calcula y guarda a partir de los importes finales confirmados; la cotización editable no se guarda como una cotización de referencia separada. Esta ayuda se aplica a conversiones entre cuentas propias y no habilita estimar el importe debitado de un gasto.

La institución por la que se realizó la conversión es opcional. Las opciones iniciales son Itaú, Prex y Otra; al elegir «Otra», el usuario puede escribir el nombre. También puede dejar la institución sin indicar. Su ausencia por sí sola no deja la entrada pendiente de revisión ni impide registrar una conversión que cumpla los demás requisitos y calcular su tipo de cambio efectivo. No se infiere a partir de las cuentas de origen o destino, ya que puede ser diferente de sus instituciones.

### Importe y moneda del gasto
El importe principal de un gasto es siempre lo efectivamente debitado de su cuenta de origen, expresado en la moneda de esa cuenta. Para efectivo corresponde al dinero efectivamente pagado desde la cuenta de efectivo seleccionada.

Si el comercio expresa el precio en otra moneda, ese precio se conserva como referencia en la evidencia disponible y no se suma como un segundo gasto. Si todavía no se conoce el importe debitado, la entrada permanece pendiente de revisión; no se calcula una conversión estimada ni se cambia la etiqueta de moneda conservando el mismo importe.

Esta regla determina el importe de un gasto; no convierte todas las salidas de dinero en gastos. El capital de las transferencias propias sigue excluido del gasto. El tratamiento específico de comisiones vinculadas a transferencias o conversiones y de devoluciones o ajustes de IVA por pagos con débito queda fuera del MVP.

El MVP conserva la evidencia original disponible, pero no calcula ni genera automáticamente movimientos vinculados por esas comisiones o devoluciones, ni recalcula un gasto por ajustes posteriores. Se mantiene como importe del gasto lo efectivamente debitado y conocido, sin estimar descuentos o devoluciones.

### Criterios de confianza para el registro directo
Una entrada completa se considera confiable cuando cumple todas estas condiciones:

- Cada dato obligatorio proviene de información explícita de la entrada o de una elección del usuario; no se completa mediante suposiciones.
- Los datos pasan las validaciones de formato y coherencia, y las cuentas y categorías utilizadas pertenecen al usuario autorizado.
- No hay interpretaciones ambiguas ni contradicciones pendientes de resolver.

Si existe una ambigüedad o contradicción sin resolver, la entrada queda pendiente de revisión aunque tenga todos los campos. Por ejemplo, un símbolo `$` aislado no identifica por sí solo si el importe está expresado en UYU o USD. Estos criterios no incorporan categorización automática al MVP ni sustituyen la autorización obligatoria.

### Categorías de gastos

El MVP parte de una lista inicial de categorías y permite que el usuario cree categorías propias para ampliarla. Las categorías son de un solo nivel, sin subcategorías en esta versión. Se mantiene la categoría como dato obligatorio para registrar un gasto y la comprobación de que pertenece al usuario autorizado.

Lista inicial acordada:

- Alimentación
- Vivienda
- Transporte
- Salud
- Educación
- Ocio
- Ropa y cuidado personal
- Otros
- Casa Nueva: construcción de la casa.
- Mama: gastos de la madre que paga el usuario.
- Onix - Nafta: solo gasolina.
- Onix - Otros: services, lavados, arreglos y otros gastos del auto.
- Natura: gastos y mensualidades de Natura.
- Nutrientes: gastos y mensualidades de Nutrientes.
- Amanita: BPS, contadora y firmas digitales.
- UTE
- ANTEL - Internet
- ANTEL - celular
- OSE Casa de campo
- Facu: pañales, medicación, ropa y otros gastos de Facu.

«Otros» requiere una elección explícita del usuario; no se asigna automáticamente para completar un gasto sin categoría. Los nombres con guion siguen siendo categorías independientes de un solo nivel.

El usuario puede renombrar y archivar categorías. Renombrar cambia el nombre conservando los gastos asociados. Archivar deja de ofrecer la categoría para nuevos gastos, pero conserva sus gastos anteriores en el historial y en los totales según los filtros aplicados. El MVP no ofrece borrado de categorías utilizadas ni fusión entre categorías.

Los gastos de «Casa Nueva» se excluyen por defecto de los listados y reportes del MVP, incluido el resumen mensual y sus totales, porque la escala de la construcción distorsionaría la lectura de los gastos habituales. Se conservan todos sus registros. Una opción visible «Incluir Casa Nueva» permite mostrar sus movimientos y sumarlos a los totales de la vista; mientras estén excluidos, la pantalla lo indica claramente. La exclusión afecta la consulta, no la naturaleza de esos movimientos como gastos. Este requisito no incorpora los informes avanzados previstos para después del MVP.

### Historial y filtros

El historial del MVP permite filtrar por mes, cuenta, categoría y tipo de movimiento (gasto, transferencia propia o conversión). Se mantiene la opción acordada para incluir «Casa Nueva», excluida por defecto. Los movimientos anulados se ocultan por defecto, con una opción para consultarlos y restaurarlos; mostrarlos no los incorpora a los totales mientras sigan anulados.

### Resumen mensual básico

El MVP muestra el total gastado del mes y su desglose por categoría, separados por moneda, sin sumar UYU y USD. También muestra la cantidad de todas las entradas pendientes de revisión, independientemente del mes seleccionado e incluyendo las que todavía no tienen fecha, con el texto «Pendientes de revisión — todos los meses». Se aclara que esas entradas no participan en los totales. Los totales y el desglose de gastos corresponden únicamente al mes seleccionado. Las transferencias propias y conversiones no cuentan como gastos. Se aplica la exclusión por defecto de «Casa Nueva» y la opción visible para incluirla, conforme a lo acordado para listados y reportes.

El usuario prevé necesitar vistas adicionales después del MVP; sus contenidos y prioridades se definirán al abordar esa etapa.

### Cuentas y procedencia
La cuenta de origen identifica de dónde sale el dinero, no cómo llegaron los datos a la aplicación. Puede representar una cuenta bancaria o efectivo, siempre en una única moneda. Se acuerdan como ejemplos Itaú pesos (UYU), Itaú dólares (USD), Efectivo pesos (UYU) y Efectivo dólares (USD); también pueden agregarse Santander u otras cuentas, manteniendo la separación por moneda. No es una lista cerrada.

La separación es propia del modelo de la app, aunque el banco agrupe varias monedas bajo un mismo producto. Ver [ADR-0002: cuentas separadas por moneda](adr/0002-cuentas-separadas-por-moneda.md).

El usuario puede crear cuentas bancarias o de efectivo indicando nombre y moneda, renombrarlas sin alterar los movimientos asociados y archivarlas para dejar de usarlas en nuevas operaciones conservando el historial. La moneda no puede cambiarse después de registrar movimientos en la cuenta; para operar en otra moneda se crea otra cuenta.

Al ingresar un email de un gasto, se asigna automáticamente la cuenta de origen solo si la información disponible permite identificar una única cuenta del usuario sin ambigüedad. La cuenta asignada queda visible y puede corregirse. Si la evidencia no alcanza, el usuario la selecciona manualmente entre sus cuentas activas; no se adivina ni se inventan identificadores ausentes. Se valida la coherencia entre la cuenta y la moneda del importe efectivamente debitado. Elegir una cuenta no convierte el importe ni cambia su moneda; si hay contradicciones o no se conoce el importe debitado, la entrada queda pendiente. Todavía no se conocen los identificadores presentes en los emails: los criterios concretos de identificación automática se definirán al verificar su formato mediante ejemplos sintéticos representativos.

La procedencia de los datos identifica, en cambio, la entrada por texto de email o carga manual, y en el futuro otras fuentes como notificaciones NFC. La incorporación de efectivo no agrega cálculo de saldos al MVP.

## Posterior al MVP (no implementar aún)
- Admitir monedas adicionales a UYU y USD en cuentas, movimientos y conversiones.
- Permitir la carga de datos desde herramientas externas mediante autenticación propia de la integración, vinculada al usuario autorizado y reutilizando la ingesta común. El mecanismo y la gestión de esas credenciales se definirán al abordar esa versión.
- Tratamiento específico de comisiones asociadas a transferencias propias y conversiones: desglose y vinculación con la operación correspondiente.
- Tratamiento de devoluciones o ajustes de IVA asociados a pagos con débito, incluyendo su cálculo y relación con el gasto original. Sus reglas concretas se definirán al abordar esa versión.
- Seguimiento de saldos de las cuentas bancarias. Es una necesidad futura confirmada; requerirá definir saldos iniciales y cómo cubrir todas las entradas y salidas para que los saldos sean confiables.
- Cuenta Gmail exclusiva, con reenvío filtrado de avisos de Itaú desde el Gmail personal; Google Apps Script para la ingesta automática.
- Capturar notificaciones de Android sobre pagos con NFC. Es una necesidad futura confirmada, fuera del MVP; MacroDroid es una alternativa a validar en el teléfono.
- Detección de duplicados entre fuentes y conciliación con estados bancarios.
- Reglas explícitas de categorización, revisión nocturna de excepciones, métricas de confiabilidad y automatización.
- División de una transacción bancaria en múltiples categorías (split): ejemplo $2.566 = Facu $1.066 + Casa $1.500, sin duplicar el gasto ni modificar evidencia original.
- Informes: evolución mensual, categorías, comercios, recurrencias, comparativas y proyectos/etiquetas.

## Cobertura mínima de pruebas del MVP

Se acuerda verificar:

- Interpretación de emails con textos sintéticos, incluyendo datos faltantes, ambiguos y errores de entrada.
- Reglas de gastos, transferencias propias y conversiones, con cálculos monetarios exactos.
- Acceso privado y aislamiento entre usuarios.
- Registro y corrección de entradas pendientes sin modificar la evidencia original.
- Totales separados por moneda y exclusión por defecto de «Casa Nueva», incluyendo la opción para incorporarla a los totales.
- Un recorrido completo: cargar una entrada, completar sus datos y comprobar que aparece correctamente en el historial y en el resumen.

Todas las pruebas utilizan datos ficticios, sin emails ni movimientos reales. Esta sección define la cobertura acordada; no implica que las pruebas estén implementadas o ejecutadas.

## Proyecto de aprendizaje
El objetivo secundario central es dominar Codex desde VS Code con los skills de Matt Pocock (AI Hero). Aprender y evaluar el método `setup-matt-pocock-skills` → `grill-with-docs` → `to-spec` → `to-tickets` → `implement` → `code-review`. No implementar automáticamente el producto entero: ir ticket a ticket, inspeccionar el código y las decisiones.

## Contexto de conversaciones previas
Antes de iniciar `grill-with-docs`, consultar el [contexto del chat previo](contexto/chatgpt-previo/README.md). Incluye los dos documentos aportados por el usuario, sus diferencias respecto del proyecto y notas sobre categorización. Es material de referencia: las propuestas adicionales y diferencias quedan señaladas para discutir, sin modificar el alcance comprometido del MVP.

## Cuestiones abiertas para debatir con grill-with-docs
- Modelo exacto para tipos de movimientos, gastos y transferencia entre cuentas propias.
- Completar las validaciones detalladas del contrato común y los campos adicionales de gastos. La opción «Probar interpretación» permite probar textos sintéticos sin crear entradas ni movimientos; las pruebas automáticas usan datos ficticios separados.
- Precisar técnicamente la representación interna del tipo de cambio efectivo, preservando los importes confirmados como base del cálculo. Las reglas de carga de importes, cotización manual y redondeo del destino están acordadas en «Importes y redondeo».
- Precisar los criterios concretos de identificación automática de cuentas al conocer el formato de los emails. Se asigna automáticamente solo con evidencia inequívoca; en caso contrario, el usuario selecciona la cuenta manualmente.
- Contrato mínimo de las APIs, autenticación y pruebas de autorización.
