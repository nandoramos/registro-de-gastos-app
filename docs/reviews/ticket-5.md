# Verificación del ticket #5 — Registrar un gasto manual completo

Referencia: `git diff 394f152...be8f1d8`.

## Standards

No se encontraron incumplimientos bloqueantes. Las rutas son delgadas, el adaptador manual es puro, la lógica de registro está separada, los importes se mantienen como texto decimal y `numeric(18,2)`, y la evidencia de fuente se persiste aparte del gasto. La identidad proviene de la sesión y las referencias y consultas se limitan al usuario autorizado.

La revisión señaló un nombre poco expresivo y la repetición del control de acceso en páginas privadas. Se cambió `object` por `asRecord` y se extrajo `requireAuthorizedPage`, utilizado por las cinco páginas privadas existentes. El flujo compartido conserva las redirecciones distintas para falta de sesión, identidad no autorizada e indisponibilidad temporal.

## Spec

No se encontraron requisitos faltantes, scope creep ni implementaciones incorrectas. El recorrido permite cargar y consultar fecha, hora opcional, título, nota, cuenta, categoría, importe y moneda; valida referencias y coherencia de moneda; registra directamente una entrada completa; conserva evidencia y procedencia; y distingue la fecha del gasto del momento de ingreso.

## Verificaciones

- 18 pruebas de integración del gasto manual, incluida persistencia, validaciones, evidencia, procedencia, referencias ajenas, aislamiento y moneda de la cuenta.
- 2 pruebas de interacción del formulario para registro exitoso y recuperación de errores.
- Suite completa: 64 pruebas aprobadas en 9 archivos.
- Navegador móvil: 4 pruebas aprobadas después de centralizar la autorización de páginas.
- TypeScript, ESLint, formato, build de producción con Webpack y `git diff --check`: aprobados.
- Auditoría de dependencias de producción: 0 vulnerabilidades reportadas.

Resumen: Standards 0 bloqueantes y 2 observaciones resueltas; Spec 0 hallazgos.
