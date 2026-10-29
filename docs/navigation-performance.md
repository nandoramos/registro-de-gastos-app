# Medición del recorrido privado

## Referencia inicial — ticket #40

Medición del 29 de octubre de 2026, antes de las optimizaciones. Muestras completas y entorno en [navigation-baseline-v2.json](performance/navigation-baseline-v2.json).

| Transición | P90 de respuesta visual | P90 de contenido utilizable |
| --- | ---: | ---: |
| Inicio → Movimientos | 59,9 ms | 59,9 ms |
| Movimientos → Registrar gasto | 62,4 ms | 62,4 ms |
| Gasto guardado → Movimientos | 103,3 ms | 103,3 ms |
| Movimientos → Inicio | 43,1 ms | 43,1 ms |

P90: novena muestra al ordenar las diez observaciones de menor a mayor. En este entorno, las diez muestras de cada transición estuvieron dentro de ambos objetivos. No constituye aceptación del rendimiento del despliegue remoto.

Primera visita autenticada del proceso nuevo: 4.171 ms. Incluye inicialización de PGlite, migraciones y datos sintéticos; no es una estimación del arranque de Neon. Navegación tras cinco segundos sin interacción: 46,3 ms. Esta pausa corta tampoco representa suspensión del servicio remoto.

La suite existente pasó con 247 pruebas en 50 archivos. El recorrido de navegador pasó sus diez vueltas y los rechazos de acceso anónimo y cookie falsificada. También pasaron typecheck y lint completo.

La referencia muestra que la navegación puede ser rápida sin latencia de base remota; para atribuir la demora real a red, conexión, autorización o consultas hace falta contrastarla con mediciones del entorno correspondiente. Las mediciones previas de servicios remotos y esta referencia no son comparables directamente porque usan drivers, transporte y condiciones distintos.

## Resultado del ticket #41

Muestras completas en [navigation-after-41-v2.json](performance/navigation-after-41-v2.json). Misma máquina, navegador, viewport y base sintética que la referencia. La ejecución final del navegador se realizó sin otras suites activas durante la medición.

| Transición | P90 respuesta antes → después | P90 contenido utilizable antes → después |
| --- | ---: | ---: |
| Inicio → Movimientos | 59,9 → 11,1 ms | 59,9 → 176,6 ms |
| Movimientos → Registrar gasto | 62,4 → 9,8 ms | 62,4 → 62,5 ms |
| Gasto guardado → Movimientos | 103,3 → 9,0 ms | 103,3 → 211,2 ms |
| Movimientos → Inicio | 43,1 → 9,2 ms | 43,1 → 94,0 ms |

Las diez muestras de cada transición cumplen los objetivos en este entorno. La respuesta visual mejoró; **el contenido utilizable local no mejoró uniformemente y presenta regresiones en varias transiciones**. No atribuir una reducción porcentual uniforme a la navegación ni extrapolar estos resultados al despliegue. Primera visita autenticada del proceso nuevo: 5.609 ms, frente a 4.171 ms de la referencia; ambas incluyen preparación de PGlite y datos sintéticos. Tras cinco segundos sin interacción: respuesta 11,3 ms y contenido utilizable 62,4 ms.

También se midieron los servicios optimizados contra la base remota mediante conexiones de solo lectura, sin registrar contenido personal. Detalle en [queries-after-41-v2.json](performance/queries-after-41-v2.json).

| Servicio remoto | Observación previa | Observación posterior en caliente |
| --- | ---: | ---: |
| Resumen mensual, tres consultas | 539–541 ms | 155–240 ms |
| Historial, cinco consultas en el caso medido | 810–906 ms | 157–160 ms |

La cantidad de consultas permanece igual en estos servicios: se solapan las lecturas independientes, conservando el máximo de cinco conexiones. Las primeras invocaciones posteriores tardaron 1.165 y 1.201 ms respectivamente al ampliar el pool; no se aisló el costo de cada componente de conexión. Las mediciones anteriores y posteriores no se alternaron bajo condiciones idénticas de red, por lo que esta comparación remota es orientativa y no representa navegación completa.

Cambios realizados:

- Resumen e historial solicitan sus lecturas independientes sin esperar las respuestas anteriores. Se conserva la consulta posterior de cuentas de transferencias y conversiones cuando depende de los resultados.
- El historial habitual puede empezar en paralelo con las listas auxiliares. La vista específica de Casa Nueva conserva la dependencia de su categoría cuando no hay categorías explícitas. Las vistas de solo gastos no solicitan pendientes que no muestran.
- Los enlaces del menú privado y los accesos de Inicio muestran la estructura de destino mediante `useLinkStatus` mientras la ruta está pendiente. El contenido anterior se oculta durante ese estado y el menú continúa disponible. Se usa la precarga predeterminada de Next.js, sin forzar la carga completa de todas las pantallas.
- Se evaluaron fallbacks de ruta con `loading.tsx`; en el experimento local agregaban aproximadamente 300 ms hasta el contenido utilizable. Se descartaron a favor del indicador asociado al enlace. Este detalle explica la elección técnica; no es una nueva regla financiera ni un cambio de infraestructura.
- El medidor distingue la estructura ocupada del contenido visible y listo. Una prueba con demora sintética de 1,5 s comprueba que no cuenta el esqueleto como datos utilizables y que es posible interrumpir la navegación desde el menú.

Verificaciones finales: 249 pruebas en 51 archivos, dos pruebas de navegador sobre compilación de producción, typecheck y lint completo. Las pruebas con respuestas retenidas observan que todas las lecturas independientes se solicitan antes de liberar la base, sin depender de umbrales de red ni de una implementación concreta del planificador. Se mantienen las pruebas existentes de resultados, filtros, monedas, Casa Nueva, archivados y aislamiento.

No se cambió infraestructura, autorización ni el tamaño del pool. Esta medición precede a los tickets #42 y #43 y no completa la validación integrada del #45. La implementación posterior del #42 se documenta en [category-cache.md](category-cache.md).

## Resultado integrado — ticket #45

Medición del 29 de octubre de 2026 en [navigation-after-45-v2.json](performance/navigation-after-45-v2.json), con el mismo navegador, máquina, viewport de 1280×720, compilación de producción y base PGlite en memoria. Se ejecutaron ocho pruebas de navegador: reutilización/errores de categorías, consumidores adicionales, diez vueltas del recorrido principal y navegación interrumpible. Las diez vueltas guardaron un gasto sintético y confirmaron que apareció en el historial.

| Transición | P90 respuesta base → #41 → #45 | P90 utilizable base → #41 → #45 | Muestras #45 dentro de objetivo |
| --- | ---: | ---: | ---: |
| Inicio → Movimientos | 59,9 → 11,1 → 10,3 ms | 59,9 → 176,6 → 48,2 ms | 10/10 |
| Movimientos → Registrar gasto | 62,4 → 9,8 → 10,3 ms | 62,4 → 62,5 → 42,7 ms | 10/10 |
| Gasto guardado → Movimientos | 103,3 → 9,0 → 8,6 ms | 103,3 → 211,2 → 73,1 ms | 10/10 |
| Movimientos → Inicio | 43,1 → 9,2 → 9,6 ms | 43,1 → 94,0 → 43,8 ms | 10/10 |

El objetivo por muestra es respuesta visual ≤200 ms y contenido utilizable ≤1 segundo. Todas las transiciones alcanzaron ambos umbrales en las diez vueltas. Entre #41 y #45, las medianas P90 del contenido utilizable bajaron en tres transiciones y en registrar gasto se mantuvieron bajo el umbral; esta ejecución única no demuestra que la diferencia sea causada por una optimización específica ni predice resultados remotos. La serie bruta permite revisar la variación muestra por muestra.

La primera visita autenticada del proceso midió 327 ms y la navegación tras cinco segundos de inactividad midió 9,9 ms de respuesta y 44 ms de contenido utilizable. Son observaciones separadas: PGlite estaba en memoria y no representa la suspensión del servicio remoto. Tampoco se configuró throttling de red. Por tanto, esto verifica el recorrido de la app en local, no los tiempos de navegación del despliegue ni latencia real de Postgres/Neon.

Verificaciones integradas: ocho pruebas Playwright sobre build de producción; suite Vitest con 262 pruebas en 52 archivos; typecheck y lint completos. El recorrido incluyó registro, comprobación del movimiento en historial, consumidores de categorías, filtros, selección archivada, limpieza de caché al salir y acceso anónimo o cookie falsificada.

## Ejecutar

Con las dependencias instaladas y Google Chrome disponible:

```sh
npm run test:navigation
```

El comando reserva localhost:3107, crea una copia temporal ignorada por Git, compila con `next build --webpack` y sirve con `next start`. No reutiliza servidores existentes. Puede tardar varios minutos en compilar; Playwright espera hasta cuatro minutos por el servidor.

La copia contiene las pantallas y los servicios reales. Únicamente sustituye el módulo que construye el runtime de autenticación y base por un fixture de pruebas con PostgreSQL embebido (PGlite). Better Auth sigue validando una cookie firmada y una sesión persistida y la autorización sigue comprobando la identidad Google sintética. También se comprueba que anónimos y cookies falsificadas no accedan.

La aplicación normal no importa ese fixture ni tiene una variable de entorno para activarlo. No se copian archivos `.env` y el proceso recibe una lista acotada de variables de sistema; las credenciales personales y la URL de base del usuario quedan fuera. Los datos se generan en memoria para cada ejecución. Las copias quedan bajo `.navigation-benchmark/` para inspección y pueden eliminarse manualmente cuando no haya una ejecución activa.

## Qué se mide

El navegador realiza diez recorridos por las rutas reales: Inicio → Movimientos → Registrar gasto → guardar → Movimientos → Inicio. Cada vuelta registra un gasto ficticio distinto y comprueba que aparezca con su importe en la tabla.

Para cada transición se registra desde el evento de clic:

- `responseMs`: primer frame observado con un cambio en el texto visible del contenido o el destino listo. No incluye cambios en el menú, en la URL o en fragmentos ocultos del stream como respuesta visual.
- `usableMs`: frame en que el encabezado del destino está visible en un contenido que no está marcado como ocupado, fuera del esqueleto. Las páginas actuales esperan sus datos antes de renderizar ese contenido. Si se introduce carga progresiva dentro de las páginas, este criterio debe ampliarse para esperar también los controles y datos necesarios.

Los callbacks de frame aproximan la presentación de cambios de DOM; no son una medición exacta de píxeles pintados ni una métrica Web Vitals. La prueba también verifica que los controles permiten completar y guardar el gasto.

Se registran aparte la primera visita autenticada de un proceso nuevo y una navegación después de cinco segundos de inactividad de la interfaz. Para una pausa distinta:

```sh
NAVIGATION_IDLE_MS=300000 npm run test:navigation
```

El timeout del test incorpora la pausa configurada. Una pausa con base embebida no reproduce la suspensión y reactivación de un servicio remoto.

El JSON con entorno, navegador, viewport, condiciones y muestras se adjunta al resultado de Playwright y se guarda como `navigation-baseline.json` bajo `test-results/`. Copiar el resultado de referencia antes de repetir: Playwright puede limpiar los resultados anteriores. No se imponen umbrales de tiempo en la prueba funcional.

## Comparar

Usar la misma máquina, navegador, viewport y condiciones de carga, sin ejecutar otras suites durante la medición. Mantener sin cambios la cantidad inicial de datos sintéticos. Cada ejecución empieza con una base nueva; la cantidad de gastos aumenta en una unidad por vuelta de forma reproducible.

Comparar cada transición en las diez vueltas. Los objetivos de la especificación son respuesta visual ≤200 ms y contenido utilizable ≤1 segundo en al menos nueve de diez repeticiones para navegación habitual. La primera visita y la muestra tras inactividad se informan por separado.

Este entorno usa localhost sin throttling y una base embebida sin latencia de red. Sirve para una referencia reproducible del recorrido y para detectar regresiones; **no prueba los objetivos del despliegue real ni reproduce el transporte pg/Neon**. Para conclusiones sobre el despliegue hace falta una medición adicional en su entorno, manteniendo autorización, privacidad y consultas de solo lectura sobre datos reales. No se cambia infraestructura ni se escriben movimientos de prueba en producción.

## Verificación de desarrollo

```sh
npm run typecheck
npm test -- --maxWorkers=2
```

El ciclo inicial observó el fallo del recorrido al no existir una sesión persistida para la cookie sintética. Agregar esa sesión en la copia de pruebas permite atravesar la autenticación real, sin introducir un bypass en la app.
