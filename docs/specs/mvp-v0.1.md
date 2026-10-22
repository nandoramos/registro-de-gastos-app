# Registro de Gastos — Especificación MVP v0.1

Estado: publicada en [GitHub Issue #1](https://github.com/nandoramos/registro-de-gastos-app/issues/1), con enfoque de pruebas confirmado por el usuario. GitHub Issues es la fuente de seguimiento de la especificación; este archivo conserva la copia local. Sintetiza las decisiones acordadas hasta la pregunta 41. No autoriza implementar el producto entero: el trabajo posterior será ticket a ticket.

## Problem Statement

El usuario necesita registrar gastos personales con poca intervención, distinguir lo que consume de lo que mueve entre sus cuentas y entender sus gastos mensuales sin sumar monedas diferentes ni distorsionar su presupuesto habitual con la construcción de una casa. Necesita conservar evidencia y corregir errores sin perder trazabilidad. No debe depender de dar acceso a su correo personal ni de automatizaciones que inventen datos.

## Solution

Aplicación privada, mobile-first, con acceso mediante Google limitado a la identidad autorizada. Permite pegar texto de emails Itaú y cargar datos manuales desde la app. Conserva la entrada original, registra gastos completos y confiables y deja las entradas incompletas o ambiguas pendientes de revisión. Permite registrar transferencias propias y conversiones, gestionar cuentas y categorías, corregir y anular movimientos, consultar un historial y un resumen mensual por moneda.

## User Stories

1. Como usuario, quiero iniciar sesión con Google y restringir el acceso a mi identidad autorizada para mantener mis datos privados.
2. Como usuario, quiero identificarme sin conceder acceso a Gmail para no compartir mi correo personal.
3. Como usuario, quiero pegar texto de emails Itaú de compras con débito y transferencias para reducir la carga manual.
4. Como usuario, quiero ingresar gastos, transferencias propias y conversiones con datos estructurados para no depender de un email.
5. Como usuario, quiero conservar la entrada original y su procedencia para comprobar de dónde surgió cada interpretación.
6. Como usuario, quiero que las entradas no interpretables o incompletas queden pendientes para poder resolverlas después.
7. Como usuario, quiero registrar directamente los gastos completos y confiables para evitar revisiones innecesarias.
8. Como usuario, quiero conocer qué información falta o es contradictoria para corregirla sin adivinar.
9. Como usuario, quiero completar una entrada con «Guardar y registrar» para resolverla sin una segunda confirmación de revisado.
10. Como usuario, quiero descartar y recuperar entradas pendientes para apartar errores sin perder evidencia.
11. Como usuario, quiero probar la interpretación de textos sintéticos sin crear registros para verificar el parser sin contaminar mis gastos.
12. Como usuario, quiero registrar fecha, importe, moneda, título, categoría y cuenta de origen de cada gasto para tener datos útiles y consistentes.
13. Como usuario, quiero registrar lo efectivamente debitado en la moneda de mi cuenta para conocer cuánto dinero gasté.
14. Como usuario, quiero conservar un precio comercial en otra moneda como evidencia para no contarlo como otro gasto.
15. Como usuario, quiero completar una fecha ausente y conservar la hora cuando exista para no confundir operación con carga.
16. Como usuario, quiero agregar una nota opcional para guardar aclaraciones sin modificar la evidencia.
17. Como usuario, quiero corregir gastos registrados y actualizar sus totales para reparar errores con trazabilidad.
18. Como usuario, quiero que una edición inválida conserve la última versión válida para no perder un registro correcto.
19. Como usuario, quiero anular y restaurar movimientos para corregir cargas equivocadas sin borrarlas.
20. Como usuario, quiero registrar ambos lados de una transferencia propia para no contabilizar el capital trasladado como gasto.
21. Como usuario, quiero completar manualmente el lado ausente de una transferencia o conversión para registrar operaciones cuyos emails son incompletos.
22. Como usuario, quiero indicar si una transferencia ambigua es gasto o traslado propio para clasificarla correctamente.
23. Como usuario, quiero tratar los retiros como transferencias a efectivo para contar el gasto solo cuando use ese dinero.
24. Como usuario, quiero registrar ambos importes reales de una conversión para conocer su tipo de cambio efectivo.
25. Como usuario, quiero usar una cotización editable para calcular el destino y luego confirmarlo o corregirlo para facilitar la carga.
26. Como usuario, quiero ver el cambio como pesos por dólar con dos decimales para interpretar ambas direcciones de forma consistente.
27. Como usuario, quiero indicar opcionalmente Itaú, Prex u otra institución de conversión para conservar ese dato cuando lo conozca.
28. Como usuario, quiero crear cuentas bancarias y de efectivo con nombre y moneda para representar dónde mantengo mi dinero.
29. Como usuario, quiero renombrar y archivar cuentas conservando sus movimientos para mantener mi configuración sin perder historial.
30. Como usuario, quiero recibir una cuenta asignada automáticamente cuando la evidencia sea inequívoca y elegirla manualmente en otro caso para reducir trabajo sin introducir suposiciones.
31. Como usuario, quiero comenzar con categorías y crear otras para adaptar el registro a mis gastos.
32. Como usuario, quiero renombrar y archivar categorías para mantenerlas útiles sin borrar gastos anteriores.
33. Como usuario, quiero que una corrección de categoría afecte solo al gasto editado para no alterar otras compras.
34. Como usuario, quiero excluir Casa Nueva por defecto y poder incluirla explícitamente para distinguir construcción de gastos habituales.
35. Como usuario, quiero filtrar el historial por mes, cuenta, categoría y tipo para encontrar movimientos.
36. Como usuario, quiero consultar los anulados mediante una opción explícita para revisarlos o restaurarlos.
37. Como usuario, quiero ver totales mensuales y desglose por categoría separados por moneda para no sumar UYU y USD.
38. Como usuario, quiero ver todos los pendientes, incluidos los que no tienen fecha, para no perderlos al cambiar de mes.

## Implementation Decisions

- Stack acordado: Next.js y TypeScript, PostgreSQL en Neon con Drizzle, Tailwind y shadcn/ui; hosting previsto en Vercel. Validar versiones y límites al implementar.
- Monolito modular con rutas delgadas, parsers puros y lógica compartida de ingesta y negocio. Los adaptadores de email y entrada estructurada usan el mismo contrato; las rutas invocan directamente esa lógica sin HTTP interno. Respeta ADR-0001.
- Eventos de fuente inmutables separados de movimientos interpretados. Las correcciones, descartes y anulaciones conservan evidencia y trazabilidad.
- Autorización en servidor y consultas aisladas por usuario. La identidad proviene de la sesión, nunca de un identificador de usuario arbitrario del cliente. Google identifica; además se comprueba que esa identidad está autorizada. Sin credenciales externas de ingesta en el MVP.
- Gasto registrado requiere fecha, importe, moneda explícita, título, categoría y cuenta de origen. Los datos obligatorios tienen respaldo explícito, son válidos y coherentes, y no quedan ambigüedades. Completitud sola no implica confianza. «Otros» no se asigna automáticamente.
- Una entrada pendiente no representa aún un movimiento financiero. Descartarla la retira del contador; recuperarla vuelve a revisión sin registrar automáticamente. Un movimiento anulado queda fuera de totales; restaurarlo aplica su naturaleza y los filtros vigentes.
- Las ediciones válidas de gastos se guardan sin otra revisión, registran cambios y actualizan totales. Las inválidas no reemplazan la versión anterior. La nota es opcional y editable.
- Transferencias propias y conversiones requieren fecha, título, cuenta e importe de origen y cuenta e importe de destino. No exigen categoría de gasto. Los retiros son transferencias a efectivo. Una transferencia bancaria ambigua requiere elección del usuario.
- Solo UYU y USD. Cada cuenta tiene una moneda, incluso si el banco agrupa varias; respeta ADR-0002. La moneda queda fija cuando existen movimientos. Crear, renombrar y archivar cuentas no agrega saldos.
- Importe del gasto: débito efectivo en la moneda de origen. Si es desconocido, queda pendiente; no se estima ni se cambia la etiqueta monetaria. Precio comercial en otra moneda queda como evidencia.
- Importes y cotización manual positivos, con hasta dos decimales. Cálculos decimales sin float. Destino calculado redondeado al centésimo más cercano, con empate hacia arriba, sujeto a confirmación o corrección del usuario.
- Tipo de cambio efectivo calculado y guardado desde los importes finales. Se muestra siempre en UYU por USD con dos decimales. La presentación redondeada no recalcula importes. Cotización manual es ayuda de carga, no una referencia separada persistida.
- Institución opcional: Itaú, Prex, Otra; Otra permite escribir nombre. Ausencia no bloquea registro y no se infiere desde las cuentas.
- Fecha de operación gobierna el mes; fecha de ingreso se registra aparte. Hora opcional, nunca inventada. Sin fecha de operación, la entrada queda pendiente.
- Identificación automática de cuenta solo con evidencia inequívoca; cuenta visible y corregible. En otro caso, selección manual entre cuentas activas. La selección no convierte importes ni resuelve por sí sola contradicciones.
- Categorías de un nivel, ampliables, renombrables y archivables; sin fusión ni borrado de categorías utilizadas. Archivar preserva gastos y totales según filtros.
- Lista inicial: Alimentación, Vivienda, Transporte, Salud, Educación, Ocio, Ropa y cuidado personal, Otros, Casa Nueva, Mama, Onix - Nafta, Onix - Otros, Natura, Nutrientes, Amanita, UTE, ANTEL - Internet, ANTEL - celular, OSE Casa de campo y Facu. Los guiones no expresan jerarquía. Onix - Nafta se reserva para gasolina; las demás descripciones siguen el contexto acordado del proyecto.
- Casa Nueva excluida por defecto de listados y reportes, con indicación visible y opción «Incluir Casa Nueva» que incorpora movimientos y totales. Sigue siendo gasto y conserva sus registros.
- Historial por mes, cuenta, categoría y tipo (gasto, transferencia propia, conversión). Anulados ocultos por defecto, consultables y restaurables; mostrarlos no los suma.
- Resumen: total y desglose por categoría del mes, separados por moneda. Transferencias propias y conversiones no son gasto. Contador «Pendientes de revisión — todos los meses», incluyendo entradas sin fecha y excluyendo descartadas, separado de los totales.
- «Probar interpretación» no crea eventos de fuente, pendientes ni movimientos. Datos sintéticos para pruebas, separados de registros del usuario. Sin secretos, emails o movimientos reales en fixtures, logs o commits.

## Testing Decisions

Cobertura funcional y organización de pruebas confirmadas por el usuario:

- Probar comportamiento observable, no estructura interna ni llamadas entre funciones. No hay código ni suite previa en el repositorio para reutilizar.
- Punto principal: operaciones públicas de la lógica compartida con persistencia de prueba aislada. Comprobar entrada → pendiente o movimiento → corrección → consulta y totales, incluida evidencia inmutable y pertenencia al usuario. Esto concentra reglas sin duplicarlas para cada adaptador.
- Parser puro: textos sintéticos representativos, datos presentes y ausentes, símbolos monetarios ambiguos, contradicciones e identificación de cuenta. El formato aún debe verificarse; no presentar fixtures inventados como prueba de compatibilidad real con Itaú.
- Frontera HTTP/sesión: acceso anónimo rechazado, identidad no autorizada rechazada, identificador del cliente sin autoridad, y prohibición de leer o modificar recursos de otro usuario.
- Reglas monetarias en ambas direcciones, centésimos y empate de redondeo; confirmación del destino, tipo efectivo y ausencia de doble contabilización. Sin totales mixtos de monedas.
- Transiciones de pendientes, descarte/recuperación, anulación/restauración y corrección válida/inválida; categorías y cuentas archivadas conservan el historial. «Probar interpretación» no persiste datos.
- Consultas: mes de operación distinto del de carga, pendientes sin fecha, exclusión e inclusión de Casa Nueva, anulados fuera de totales aun cuando se muestran, filtros y separación por moneda.
- Un recorrido completo de interfaz: cargar entrada sintética, completar datos, registrar y comprobar historial y resumen. Mantener las combinaciones de reglas en la lógica compartida para evitar repetirlas en navegador.

## Out of Scope

- Acceso a Gmail personal, claves bancarias, recepción automática de emails y captura Android/NFC.
- Ingesta desde herramientas externas y parsers de otros bancos.
- Monedas adicionales, saldos por cuenta y conciliación bancaria.
- Detección automática de duplicados, categorización automática, gestión de reglas, división de gastos y automatización nocturna.
- Tratamiento específico de comisiones vinculadas, devoluciones y ajustes de IVA.
- Informes avanzados, comparativas, proyectos/etiquetas y vistas adicionales no definidas.
- Subcategorías, fusión y borrado de categorías utilizadas, y autenticación propia con contraseña.
- SaaS, monetización o interfaz multiusuario. El aislamiento técnico por usuario sí es obligatorio.

## Further Notes

La revisión de coherencia respeta ADR-0001 y ADR-0002 y distingue cuenta, procedencia, evento de fuente y movimiento. Se actualizó la referencia desactualizada de ADR-0001 sobre pruebas separadas.

Quedan decisiones técnicas o de borde por resolver antes de implementar los tickets afectados, sin tratarlas como requisitos aprobados:

- Esquema exacto de movimientos y relación entre conversión y transferencia propia; contratos HTTP, errores y límites de entrada.
- Formato real de emails e identificadores disponibles para asignar cuentas. La alternativa manual está acordada.
- Representación y precisión interna del cambio efectivo y regla de redondeo de su presentación. La regla aprobada de empate hacia arriba corresponde al importe de destino calculado.
- Configuración técnica de Google y sesión, bibliotecas y versiones.
- Coherencia de importes diferentes en una transferencia de la misma moneda, sin introducir desglose de comisiones fuera del MVP.
- Comportamiento de referencias archivadas al editar o restaurar movimientos, y alcance del filtro de cuenta sobre origen y destino de transferencias.
- Mantener la exclusión de Casa Nueva al renombrar la categoría, sin depender de comparar su texto visible.

Estas cuestiones no reabren las decisiones de producto cerradas. La especificación es una base para descomponer el trabajo; no afirma que todos los contratos técnicos estén listos ni que existan pruebas ejecutadas.
