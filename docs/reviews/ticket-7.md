# Verificación del ticket #7 — Descartar y recuperar pendientes

Referencia inicial: `git diff 20c4a26...bee1861`. La revisión se repitió sobre el cambio completo después de resolver sus hallazgos.

## Standards

La primera revisión encontró una carrera entre corregir y descartar: la revisión podía conservar una interpretación anterior a la que terminaba descartada. Descarte y recuperación ahora reclaman el estado mediante `UPDATE ... RETURNING` y escriben en el historial los valores devueltos dentro de la misma transacción. PostgreSQL también restringe los estados permitidos y exige la correspondencia entre `discarded` y una fecha de descarte.

La segunda revisión no encontró incumplimientos bloqueantes. Persiste una observación menor por el armazón repetido entre handlers HTTP; se pospone una abstracción transversal hasta abordar conjuntamente los módulos HTTP existentes.

## Spec

No se encontraron requisitos faltantes, scope creep ni implementaciones incorrectas. Solo una entrada pendiente propia puede descartarse; conserva evidencia e historial, sale de la lista y el contador, puede consultarse y recuperarse, y la recuperación no crea un movimiento.

## Verificaciones

- 4 pruebas de integración para descarte, recuperación, contador, evidencia, historial y aislamiento.
- 2 casos de interacción para descartar y recuperar desde la interfaz.
- Suite completa: 77 pruebas aprobadas en 13 archivos.
- Navegador móvil: 4 pruebas aprobadas.
- TypeScript, ESLint, formato, build de producción con Webpack y `git diff --check`: aprobados.
- Auditoría de dependencias de producción: 0 vulnerabilidades reportadas.

Resumen: Standards 1 hallazgo obligatorio y 1 observación resueltos, con 1 observación menor pospuesta; Spec 0 hallazgos; segunda revisión sin hallazgos bloqueantes.
