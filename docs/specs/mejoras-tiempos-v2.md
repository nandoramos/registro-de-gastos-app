# Mejorar tiempos de navegación y reutilizar categorías — v2

## Problem Statement

El usuario percibe demoras al cambiar de pantalla en una aplicación personal con pocos datos. El clic puede parecer no responder mientras la pantalla espera consultas al servidor. La navegación y el registro habitual deben ser más rápidos sin cambiar la infraestructura ni perder exactitud, datos del formulario o controles de acceso.

Las mediciones locales de servicios identificaron consultas consecutivas: el resumen mensual tardó 539–541 ms con tres consultas y el historial 810–906 ms con cinco. Estos valores no representan el tiempo completo de navegación ni demuestran por sí solos el rendimiento del entorno publicado.

## Solution

Reducir esperas innecesarias de consultas independientes, reutilizar categorías entre pantallas y mostrar una transición de carga inmediata. Priorizar Inicio → Movimientos → Registrar gasto → guardar → volver a Movimientos, verificando que el movimiento recién guardado aparezca y las vistas afectadas se actualicen.

La lista de categorías se carga al primer uso y se comparte durante la navegación de la pestaña. Se actualiza tras cambios exitosos y al recuperar el foco, preservando el trabajo del usuario y manejando errores de forma recuperable.

Objetivos para navegaciones habituales con la aplicación ya abierta: respuesta visual en 200 ms o menos y contenido utilizable en 1 segundo o menos, en al menos 9 de 10 repeticiones bajo las mismas condiciones. Medir por separado la primera carga tras inactividad. Los objetivos se verifican; si no se alcanzan, documentar el resultado y acordar el siguiente paso conservando la infraestructura actual.

## User Stories

1. Como usuario autorizado, quiero recibir una respuesta visual al tocar una opción para saber que la navegación comenzó.
2. Como usuario autorizado, quiero que los datos de la pantalla estén disponibles rápidamente para continuar mi tarea.
3. Como usuario autorizado, quiero mantener el menú disponible durante la carga para poder elegir otra sección.
4. Como usuario autorizado, quiero navegar de Inicio a Movimientos y Registrar gasto con menos esperas para registrar gastos con facilidad.
5. Como usuario autorizado, quiero ver el gasto recién guardado al volver a Movimientos para comprobar su registro.
6. Como usuario autorizado, quiero que las vistas afectadas reflejen mis cambios para consultar información actualizada.
7. Como usuario autorizado, quiero que las categorías se carguen cuando las necesito para no retrasar Inicio innecesariamente.
8. Como usuario autorizado, quiero reutilizar las categorías al cambiar de pantalla para evitar esperas repetidas.
9. Como usuario autorizado, quiero que todas las pantallas consumidoras compartan la lista para ver categorías coherentes en la misma pestaña.
10. Como usuario autorizado, quiero que crear una categoría actualice la lista compartida después de guardar para poder utilizarla inmediatamente.
11. Como usuario autorizado, quiero que renombrar una categoría actualice su nombre visible para reconocerla sin perder su selección.
12. Como usuario autorizado, quiero que archivar una categoría deje de ofrecerla para gastos nuevos para evitar asignaciones inválidas.
13. Como usuario autorizado, quiero que recuperar una categoría archivada vuelva a ofrecerla para nuevos gastos.
14. Como usuario autorizado, quiero conservar las referencias a categorías archivadas en el historial para comprender mis movimientos anteriores.
15. Como usuario autorizado, quiero poder conservar la categoría archivada original al editar un gasto existente para mantener su clasificación válida.
16. Como usuario autorizado, quiero comprobar cambios de categorías al volver a la pestaña para incorporar modificaciones realizadas en otra pestaña o dispositivo.
17. Como usuario autorizado, quiero que actualizar categorías conserve mis campos y selecciones válidas para no perder trabajo.
18. Como usuario autorizado, quiero reintentar una primera carga fallida de categorías sin perder el formulario.
19. Como usuario autorizado, quiero conservar la lista anterior si falla su actualización para poder seguir completando el formulario con un aviso visible.
20. Como usuario autorizado, quiero recibir una indicación si archivan la categoría elegida para un gasto nuevo para seleccionar otra sin sustituciones automáticas.
21. Como usuario autorizado, quiero conservar el formulario si el servidor rechaza una categoría para corregirla sin volver a cargar los datos.
22. Como usuario autorizado, quiero que cerrar sesión elimine las categorías de la caché para no reutilizarlas en otra sesión.
23. Como usuario autorizado, quiero que una respuesta atrasada no deshaga mis cambios recientes para mantener una lista coherente.
24. Como usuario autorizado, quiero que los totales, filtros y permisos mantengan su comportamiento para confiar en la aplicación después de optimizarla.
25. Como usuario de una instalación nueva, quiero disponer de las categorías iniciales para comenzar a registrar gastos sin depender de su reinserción en cada consulta.

## Implementation Decisions

- Mantener la infraestructura actual; no cambiar alojamiento, recursos ni servicios.
- Revisar los servicios de historial y resumen para ejecutar en paralelo las consultas independientes y reducir dependencias innecesarias entre cargas de la página. Considerar el límite actual de cinco conexiones del pool y medir el resultado.
- Separar la inicialización de categorías de las lecturas habituales, conservando el alta inicial para nuevas instalaciones o usuarios. Resolver el mecanismo concreto durante la implementación con pruebas.
- Implementar una colección compartida de categorías en memoria por usuario y pestaña. Cargarla al primer uso y volver a cargarla después de recargar la aplicación. Limpiarla al cerrar sesión.
- Incluir categorías activas y archivadas en el contrato de lectura que abastezca la colección. El endpoint actual ofrece solo activas; su evolución debe conservar las validaciones y la autorización y atender las necesidades de historial, edición y gestión.
- Compartir categorías entre historial, registro y edición de gastos, gestión de categorías, ingreso de email y revisión de pendientes. Evitar efectivamente las lecturas servidor repetidas: añadir un almacén cliente sin revisar los consumidores servidor no satisface el objetivo.
- Resolver las dependencias servidor de categorías, incluida la identificación de Casa Nueva, conservando filtros y exclusiones. El diseño concreto queda para la implementación.
- Actualizar la colección después de crear, renombrar, archivar o recuperar categorías satisfactoriamente. Comprobar cambios al recuperar el foco, sin sincronización continua entre pestañas o dispositivos.
- Actualizar sin reiniciar formularios ni modificar selecciones válidas. Los cambios de nombre conservan la identidad de la categoría seleccionada.
- Ante fallo de primera carga, mostrar error y reintento conservando campos y el resto de la pantalla. No permitir guardar un gasto hasta disponer de una categoría válida.
- Ante fallo de actualización con datos previos, conservarlos y mostrar un aviso discreto con reintento. Mantener la validación definitiva en servidor.
- Si la categoría elegida para un gasto nuevo se archiva, pedir otra sin sustituirla automáticamente ni borrar campos. Informar al detectar el cambio o recibir el rechazo del servidor. En edición, permitir conservar la categoría archivada original según las reglas existentes.
- Evitar que respuestas antiguas sobrescriban cambios más recientes o repueblen la caché tras cerrar sesión.
- Mostrar una estructura de carga del destino manteniendo la navegación disponible. Conservar las reglas actuales de salida de formularios sin guardar. Evaluar precarga conforme a la versión instalada de Next.js, sin cargar indiscriminadamente todas las pantallas.
- Limitar la nueva caché a categorías. Asegurar que guardar o editar movimientos actualice las vistas afectadas.
- Separar consultas de cuentas para selectores del cálculo de saldos cuando estos no sean necesarios. Evaluar simplificar los datos de Inicio según el impacto medido, preservando sus resultados.
- Conservar autorización en cada acceso privado, identidad derivada de sesión, aislamiento por usuario, exactitud monetaria y reglas de categorías archivadas. Respetar el ADR de acceso privado con Google; no habilitar caché de sesión en cookie como atajo de rendimiento.
- No se requiere un cambio de esquema por las decisiones acordadas. No agregar índices sin evidencia de su necesidad.

## Testing Decisions

Fronteras de prueba confirmadas por el usuario durante to-spec:

- Frontera principal: recorrido de navegador con Playwright que utilice la navegación privada real y datos sintéticos controlados. Cubrir Inicio → Movimientos → Registrar gasto → guardar → volver, carga visible, navegación disponible, gasto registrado y vistas actualizadas. Extender la infraestructura de pruebas existente donde sea necesario; las páginas de demostración aisladas actuales no bastan para demostrar el recorrido real.
- En esa frontera, verificar reutilización de categorías al navegar, actualización tras mantenimiento y recuperación del foco, cierre de sesión, respuestas atrasadas y conservación de formularios ante fallos o categorías archivadas. Observar comportamiento y solicitudes externas pertinentes; evitar comprobar nombres de funciones, estructura interna del almacén o una forma concreta de implementar concurrencia.
- Reutilizar las pruebas de integración de categorías, gastos, historial, resumen y autorización con PostgreSQL embebido para proteger totales exactos, filtros, Casa Nueva, categorías iniciales, archivadas y aislamiento entre usuarios. Añadir casos solo donde los cambios introduzcan riesgos no cubiertos.
- Prior art: ya existen pruebas Playwright de movimientos y acceso, pruebas de interfaz de gestión de categorías y pruebas de integración de categorías, resumen y autenticación. Preferir esas fronteras antes de crear pruebas de detalles internos.
- Seguir rojo → verde → refactor para los comportamientos modificados; ejecutar pruebas afectadas y typecheck durante los ciclos y la suite completa al finalizar.
- Comparar rendimiento antes y después en compilación de producción bajo las mismas condiciones, registrando el entorno, recorrido y condiciones de red sin secretos ni datos personales. Separar respuesta visual de contenido utilizable y carga inicial de navegación habitual. Los datos sintéticos y respuestas demoradas controladas permiten probar estados de carga, pero no demuestran por sí solos la latencia real del despliegue.
- Registrar diez repeticiones comparables del recorrido evaluado y comprobar los umbrales en al menos nueve. Documentar también la primera carga tras inactividad sin imponerle el umbral de navegación habitual. No convertir los tiempos de red reales en pruebas unitarias frágiles.
- Las pruebas automáticas no utilizan credenciales, movimientos reales ni la base configurada por el entorno del usuario. Las comprobaciones privadas de rendimiento solo informan métricas y no alteran datos de producción.

## Out of Scope

- Cambios de infraestructura, planes, alojamiento o recursos.
- Caché nueva de movimientos, saldos y totales; funcionamiento sin conexión; persistencia de categorías en almacenamiento local.
- Sincronización continua entre pestañas o dispositivos.
- Cambios de reglas financieras, filtros, categorías o permisos ajenos a la mejora de cargas.
- Debilitar autorización, introducir nuevas funciones de negocio o reemplazar el stack.
- Prometer un umbral para la primera carga tras inactividad o una reducción porcentual no acordada.
- Implementar la mejora o crear tickets de implementación como parte de la publicación de esta especificación.

## Further Notes

Definición acordada mediante cinco rondas de grill-with-docs y confirmación final del usuario. El análisis previo contiene las mediciones de servicios y los antecedentes; las metas se evalúan sobre navegación completa.

La publicación debe realizarse en GitHub Issues del repositorio confirmado. La configuración del proyecto indica que aún no hay vocabulario de triage acordado y prohíbe crear o aplicar automáticamente etiquetas de triage, incluida ready-for-agent; publicar sin esa etiqueta.

Si no se alcanzan las metas, registrar resultados y limitaciones y acordar el siguiente paso, manteniendo la infraestructura actual.
