# Guía para agentes — Registro de Gastos App

Lee `docs/PROJECT.md` antes de proponer cambios.

## Modo de trabajo
Este es tanto un proyecto personal como un ejercicio de aprendizaje con Codex y los skills de Matt Pocock. Explica primero el objetivo de cada cambio y por qué se propone. Prefiere decisiones explícitas antes de implementar suposiciones. Avanza con cambios pequeños y verificables; no construyas funcionalidades fuera del MVP v0.1 salvo pedido expreso. Para decisiones abiertas, pregunta o usa los skills de definición acordados en lugar de inventar requisitos.

## Desarrollo con TDD
- Seguir rojo → verde → refactor por comportamiento: escribir primero una prueba, observar su fallo por el motivo esperado e implementar el mínimo para pasarla.
- Probar las fronteras acordadas (lógica compartida, parser, autorización y recorrido de interfaz), no detalles internos.
- Ejecutar las pruebas del archivo afectado y typecheck durante los ciclos; ejecutar la suite completa al finalizar.

## Arquitectura y calidad
- Stack decidido: Next.js + TypeScript, PostgreSQL + Drizzle, Tailwind/shadcn/ui.
- Monolito modular: rutas HTTP delgadas, lógica de negocio separada, parsers puros testeables.
- Eventos de fuente inmutables y separados de movimientos financieros; conservar procedencia.
- Importe y moneda explícitos; no usar float para cálculos monetarios.
- Distinguir movimiento bancario de gasto, evitar doble contabilización.
- Tests para parsers, reglas de negocio, errores de entrada y aislamiento por usuario.

## Seguridad
- No introducir ni imprimir secretos, contraseñas, tokens, emails ni movimientos reales en commits, logs, capturas o fixtures.
- Autorización de usuario obligatoria en rutas privadas y consultas a base de datos.
- Nunca aceptar un `user_id` arbitrario como autorización: derivarlo de la sesión o credencial de ingesta.
- No conceder acceso al Gmail personal ni guardar claves bancarias.
- Mantener `.env` fuera de Git; publicar solo `.env.example` con placeholders.

## Flujo
Antes de cambios no triviales, resumir alcance, plan y pruebas. Después, ejecutar o describir verificaciones y mostrar archivos modificados. No hacer push, deploy, borrar datos ni ejecutar migraciones destructivas sin aprobación expresa.

## Agent skills

### Issue tracker

Especificaciones y tickets en GitHub Issues mediante `gh`. Ver `docs/agents/issue-tracker.md`.

### Domain docs

Un solo contexto: `GLOSSARY.md` en la raíz y decisiones en `docs/adr/`. Ver `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
