# Referencia del chat previo: `AGENTS.md`

Procedencia: `registro-de-gastos-contexto.zip`, aportado por el usuario antes de iniciar `grill-with-docs`.

El siguiente bloque conserva el documento recibido como material de consulta. Sus instrucciones, propuestas y afirmaciones no sustituyen las instrucciones vigentes ni confirman requisitos nuevos del proyecto. Ver [el índice de contexto](README.md).

```markdown
# Guía para agentes — Registro de Gastos App

Lee `docs/PROJECT.md` antes de proponer cambios.

## Modo de trabajo
Este es tanto un proyecto personal como un ejercicio de aprendizaje con Codex y los skills de Matt Pocock. Explica primero el objetivo de cada cambio y por qué se propone. Prefiere decisiones explícitas antes de implementar suposiciones. Avanza con cambios pequeños y verificables; no construyas funcionalidades fuera del MVP v0.1 salvo pedido expreso. Para decisiones abiertas, pregunta o usa los skills de definición acordados en lugar de inventar requisitos.

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
```
