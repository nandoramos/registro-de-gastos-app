# Análisis y propuestas para mejorar las cargas — v2

Fecha: 29 de octubre de 2026.

## Objetivo

Reducir la demora al cambiar de pantalla y dar una respuesta visual inmediata durante las cargas. La aplicación tiene pocos datos, por lo que se investigó si la espera proviene de las consultas remotas y de cómo se organiza la navegación.

Este documento registra el diagnóstico y las propuestas. No implica que las mejoras ya estén implementadas.

## Decisiones acordadas durante grill-with-docs

### Primera ronda

- Priorizar el recorrido Inicio → Movimientos → Registrar gasto → guardar → volver a Movimientos, comprobando que aparezca el movimiento recién guardado.
- Mejorar y medir por separado el tiempo hasta la respuesta visual de la navegación y el tiempo hasta que los datos estén disponibles. Un indicador de carga por sí solo no completa la mejora.
- Mantener la infraestructura actual. El usuario descartó cambios de infraestructura para este trabajo.
- Las reglas de actualización de la caché y los criterios cuantitativos de aceptación se definieron en las rondas siguientes.

### Segunda ronda

- Cargar categorías al abrir la primera pantalla que las necesite, sin hacer depender Inicio de esa carga.
- Reutilizarlas durante la navegación de la misma pestaña y actualizar la colección compartida tras guardar cambios de categorías satisfactoriamente.
- Volver a consultar categorías cuando la pestaña recupere el foco, para detectar cambios desde otras pestañas o dispositivos. No implementar sincronización continua.
- Conservar activas y archivadas en la colección compartida, filtrando según el uso: las altas de gastos ofrecen activas; el historial y la edición conservan las referencias archivadas que correspondan.
- La caché debe evitar las lecturas repetidas actuales de categorías en las páginas servidor; una caché únicamente cliente añadida a las lecturas existentes no satisface este objetivo.
- Mantener la autorización en cada acceso privado y las validaciones de categorías del servidor, conforme al ADR-0003.

### Tercera ronda

- Si falla la primera carga de categorías, mostrar un error con opción de reintentar, conservar el contenido del formulario y mantener disponible el resto de la pantalla. Impedir guardar un gasto hasta disponer de una categoría válida.
- Si falla la actualización al recuperar el foco y existe una lista anterior, conservarla y mostrar un aviso discreto con opción de reintentar. Permitir seguir completando el formulario; el servidor valida la categoría al guardar.
- Si se archiva externamente la categoría elegida para un gasto nuevo, conservar los campos y pedir otra categoría sin sustituirla automáticamente. Informar al detectar el cambio en la lista o al recibir el rechazo del servidor al guardar.
- En la edición de un gasto existente, conservar la regla vigente que permite mantener su categoría archivada original.

### Cuarta ronda

- Limitar la nueva caché a categorías. No ampliar este trabajo a una caché de movimientos, saldos o totales.
- Tras guardar o editar un movimiento, las vistas afectadas deben mostrar datos actualizados; verificarlo en el recorrido de aceptación.
- Durante la navegación, mostrar una estructura de carga de la pantalla de destino y mantener el menú disponible para navegar a otra sección. Conservar las reglas actuales de salida de formularios sin guardar.
- Objetivo para navegaciones habituales con la aplicación ya abierta: respuesta visual en 200 ms o menos y contenido utilizable en 1 segundo o menos, en al menos 9 de 10 repeticiones bajo las mismas condiciones.
- Medir por separado la primera carga tras un período de inactividad. No se fijó todavía un umbral para ella.
- Los objetivos requieren verificación con navegación completa, no solo tiempos de servicios. Si no se alcanzan, documentar resultados y acordar el siguiente paso manteniendo la infraestructura actual.

### Quinta ronda

- Compartir la caché de categorías entre todas las pantallas consumidoras: historial, registro y edición de gastos, gestión de categorías, ingreso de email y revisión de pendientes. Mantener los recorridos prioritarios ya acordados para evaluar rendimiento.
- Actualizar categorías al recuperar el foco sin reiniciar formularios ni cambiar selecciones que sigan siendo válidas. Un cambio de nombre actualiza el nombre visible conservando la selección.
- Impedir que respuestas atrasadas sobrescriban cambios más recientes o vuelvan a poblar la caché después de cerrar sesión.

### Estado de la definición

Definición cerrada: el usuario confirmó el alcance resumido al finalizar las cinco rondas de grill-with-docs. Las mejoras todavía no están implementadas. Las decisiones técnicas reversibles de implementación se resolverán con el código, las guías de Next.js instaladas y las pruebas, respetando estas reglas.

## Mediciones realizadas

Se ejecutaron tres repeticiones de los servicios reales contra la base configurada, desde la computadora local. Solo se informaron tiempos y cantidad de consultas, sin imprimir credenciales ni contenido de los movimientos.

| Operación | Consultas por ejecución | Tiempo observado |
| --- | ---: | ---: |
| Listar cuentas, incluyendo saldos | 1 | 152–208 ms |
| Listar pendientes | 1 | 151–199 ms |
| Calcular resumen mensual | 3 consecutivas | 539–541 ms |
| Consultar movimientos con los filtros utilizados | 5 consecutivas | 810–906 ms |

La consulta de movimientos puede agregar una consulta para resolver las cuentas de transferencias o conversiones; esa consulta adicional no apareció en las ejecuciones medidas.

En una medición previa de conectividad con `SELECT 1`, la primera consulta tardó 1.183 ms, incluyendo el establecimiento de la conexión. Las siguientes tardaron 187, 156 y 150 ms. Esa primera demora no permite distinguir cuánto corresponde a conexión, red o reactivación de la infraestructura.

Al medir los datos de Inicio —resumen y contador de pendientes en paralelo— se observaron 1.203 ms en la primera ejecución y 538 y 499 ms en las siguientes. No se aisló la causa de la diferencia inicial.

Estos tiempos no incluyen el recorrido completo de autorización, renderizado y navegación del navegador. Tampoco representan necesariamente el rendimiento de la app publicada: la distancia entre el servidor y la base puede ser diferente.

## Hallazgos

### Consultas independientes ejecutadas consecutivamente

`src/modules/movements/history.ts` consulta los distintos tipos de movimientos uno después de otro. Aunque haya pocos registros, cada consulta agrega un viaje a la base remota. La página de historial espera primero cuentas, categorías y pendientes antes de comenzar la consulta de movimientos.

`src/modules/summary/service.ts` también ejecuta consecutivamente las consultas de gastos, ingresos y ajustes. Inicio utiliza este resumen aunque solo presenta parte de su resultado.

La evidencia apunta a que la acumulación de esperas de red es una causa relevante. Todavía no se midió qué porcentaje de la navegación completa representa.

### Inicialización de categorías en cada lectura

`listCategories`, en `src/modules/categories/service.ts`, llama a `ensureInitialCategories` antes de leer las categorías. Esto intenta insertar todas las categorías iniciales con manejo de conflictos cada vez que se solicita la lista, aunque ya existan.

El modo de solo lectura del diagnóstico bloqueó ese intento de escritura. Se excluyó ese servicio de las mediciones posteriores; no se modificaron datos mediante el diagnóstico. Su tiempo completo no fue medido.

### Navegación sin estado de carga

No se encontraron archivos `loading.tsx` ni límites `Suspense` en el área privada. Las páginas dinámicas esperan los datos antes de mostrar el contenido nuevo, lo que puede hacer que el clic parezca no responder.

La guía de navegación de la versión instalada de Next.js recomienda estados de carga para permitir transiciones con respuesta visual inmediata y precarga parcial. Esto mejora la percepción de rapidez, pero no reduce por sí solo el tiempo de las consultas.

### Cálculo de saldos al listar cuentas

`listAccounts`, en `src/modules/accounts/service.ts`, incluye el cálculo de saldo mediante siete subconsultas correlacionadas por cuenta. Se utiliza también en pantallas que podrían necesitar únicamente una lista para seleccionar cuentas.

Es una oportunidad para reducir trabajo innecesario, aunque las mediciones actuales no lo identifican como el principal cuello de botella.

### Autorización y otros factores pendientes de medir

Cada pantalla privada verifica la sesión y la identidad autorizada antes de consultar sus datos. Es necesario conservar esas verificaciones y medir su costo antes de proponer cambios.

El esquema ya declara índices por usuario y fecha para los principales movimientos. No hay evidencia suficiente para recomendar índices adicionales.

Queda por comprobar la influencia del modo de desarrollo, las conexiones iniciales y la ubicación del servidor respecto de la base. No se atribuye la demora a esos factores sin mediciones adicionales.

## Propuestas de mejora

### 1. Paralelizar consultas independientes

Ejecutar en paralelo las consultas independientes de movimientos y resumen, conservando filtros, cálculos monetarios y aislamiento por usuario. Revisar también las dependencias de la página de historial para evitar bloquear trabajo que pueda empezar antes.

Comparar antes y después con el mismo recorrido. Abrir conexiones adicionales tiene un costo y el pool actual tiene un máximo de cinco conexiones; paralelizar no garantiza que todas las esperas desaparezcan.

### 2. Cargar categorías una vez y reutilizarlas en la app

Propuesta acordada con el usuario: pedir las categorías una vez y mantenerlas en una caché en memoria durante la navegación, compartida entre las pantallas que las necesitan.

- Asociar la caché al usuario y limpiarla al cerrar sesión.
- Actualizarla al crear, renombrar, archivar o recuperar una categoría.
- Volver a cargarla al recargar la app.
- Mantener en el servidor la validación de pertenencia y disponibilidad de la categoría al guardar un gasto.
- Conservar el comportamiento de las categorías archivadas para consultar y editar movimientos históricos.

Revisar la integración con las páginas renderizadas en el servidor: agregar una caché cliente no evita consultas si esas páginas siguen solicitando categorías en cada navegación. El diseño debe eliminar efectivamente esas lecturas repetidas.

Separar además la inicialización de categorías de las lecturas habituales, garantizando que una instalación o usuario nuevo siga recibiendo las categorías iniciales cuando corresponda.

### 3. Mostrar la transición inmediatamente

Agregar estados de carga apropiados en las rutas privadas para que el usuario reciba respuesta al navegar y pueda seguir utilizando la navegación mientras llegan los datos.

Evaluar la precarga con el comportamiento de la versión instalada de Next.js. Evitar precargar indiscriminadamente todas las pantallas con datos privados y consultas costosas.

### 4. Consultar cuentas sin calcular saldos cuando no se necesitan

Separar la lista necesaria para selectores de la consulta que calcula saldos. Mantener los saldos donde se muestran o son necesarios para una operación, revisando cada consumidor antes de cambiarlo.

### 5. Ajustar las consultas de Inicio a la información que presenta

Evaluar si Inicio puede obtener únicamente los totales que utiliza, evitando calcular o transferir resultados que no muestra. Priorizar esta simplificación según las mediciones posteriores a la paralelización.

## Orden sugerido y validación

1. Medir un recorrido autenticado completo, especialmente Inicio → Movimientos y Movimientos → Registrar gasto, en el entorno donde se percibe la demora.
2. Paralelizar consultas independientes de movimientos y resumen, y comparar los tiempos.
3. Implementar la caché compartida de categorías y separar su inicialización de la lectura habitual.
4. Incorporar estados de carga y comprobar la respuesta visual de la navegación.
5. Simplificar consultas de cuentas e Inicio según su impacto medido.

Realizar cambios pequeños siguiendo rojo → verde → refactor. Verificar filtros, totales exactos, autorización, aislamiento por usuario y actualización de categorías tras las operaciones de mantenimiento. Ejecutar las pruebas afectadas y typecheck durante los ciclos, y la suite completa al finalizar.

Para comparar rendimiento, usar el mismo recorrido y condiciones, distinguir primera visita de visitas posteriores y separar tiempo hasta la respuesta visual de tiempo hasta tener los datos completos. Medir también una compilación de producción para evitar atribuir a la aplicación el costo propio del desarrollo.

No se fija una reducción porcentual. Los objetivos acordados son una respuesta visual en 200 ms o menos y contenido utilizable en 1 segundo o menos para navegaciones habituales, en al menos 9 de 10 repeticiones bajo las mismas condiciones. La primera carga tras inactividad se mide por separado. Los cambios de infraestructura quedan fuera del alcance por decisión del usuario.
