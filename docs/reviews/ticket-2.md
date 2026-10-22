# Verificación del ticket #2 — Acceso privado con Google

Referencia: documentación inicial en `193140a`; implementación en `1b73453` y corrección en `85be83d`. Comparación revisada: `git diff 193140a...85be83d`. Alcance: solo el ticket #2, no todo el MVP.

## Standards

La revisión independiente encontró un incumplimiento: una sesión de una identidad anteriormente autorizada conservaba acceso a endpoints de Better Auth que solo comprobaban validez de sesión. Contradecía la autorización actual en cada acceso privado acordada en el proyecto y ADR-0003.

Se reprodujo con pruebas HTTP (respuesta 200 donde correspondía 403, endpoints innecesarios expuestos) y se corrigió limitando las operaciones públicas de autenticación y revalidando la identidad en la consulta HTTP de sesión. Las consultas internas de sesión evitan recursión. El cierre de sesión sigue disponible sin devolver datos privados.

La revisión de la corrección confirmó el cierre del hallazgo y no detectó regresiones concretas. Resultado: **1 hallazgo corregido, 0 pendientes**. Como mejora futura no bloqueante, podría ampliarse la prueba de endpoints deshabilitados con sus variantes POST; la lista explícita del código ya las bloquea.

## Spec

La revisión independiente no encontró requisitos faltantes, ampliaciones injustificadas ni errores concretos respecto del ticket #2. Revisó también la corrección posterior y confirmó que se mantienen el ingreso Google, callback y cierre de sesión. Resultado: **0 hallazgos**.

El acceso autorizado se verifica con Better Auth, Drizzle, PostgreSQL embebido y Google simulado mediante tokens firmados. El navegador cubre la entrada anónima y los errores. No se afirma haber verificado Google o Neon reales.

## Verificaciones ejecutadas

- `npm test`: 22 pruebas aprobadas en 3 archivos; identidad, persistencia, autorización HTTP, callback OAuth, revocación y aislamiento.
- `npx playwright test`: 4 pruebas móviles aprobadas; pantalla usable, protección de página privada, reintento y error temporal diferenciado.
- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado sin advertencias.
- `npm run build`: aprobado.
- `git diff --check`: aprobado.
- `npm audit --omit=dev`: 0 vulnerabilidades reportadas. El aviso transitivo del linter de desarrollo y su alcance se documentan en README.
- Inspección visual de ingreso en 390 × 844 y 1280 × 900, sin datos personales ni desbordamiento horizontal.

## TDD y límites

La prueba de política precedió su implementación. Parte del scaffold y la interfaz se adelantaron antes de la petición explícita de seguir TDD; no se presenta todo el cambio retrospectivamente como test-first. Después se documentaron ciclos rojo → verde para el mensaje de indisponibilidad y la autorización de endpoints: fallo por el comportamiento esperado, corrección mínima y verificación de regresión.

Se generó una migración aditiva y se ejecutó únicamente en bases de prueba en memoria. No se configuraron secretos reales, no se aplicaron migraciones a Neon, no se hizo push ni deploy. La validación con la cuenta real requiere completar el entorno privado descrito en README.

Resumen de revisión: Standards 1 corregido/0 pendientes; Spec 0 hallazgos. No quedan defectos de revisión bloqueantes conocidos en este alcance.
