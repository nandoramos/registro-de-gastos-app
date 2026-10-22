# Referencia del chat previo: `docs/PROJECT.md`

Procedencia: `registro-de-gastos-contexto.zip`, aportado por el usuario antes de iniciar `grill-with-docs`.

El siguiente bloque conserva el documento recibido como material de consulta. Sus instrucciones, propuestas y afirmaciones no sustituyen las instrucciones vigentes ni confirman requisitos nuevos del proyecto. Ver [el índice de contexto](README.md).

```markdown
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
- Extraer tipo, importe, moneda y datos disponibles; no inventar fecha/hora ni destinatarios ausentes.
- Preservar evidencia original y registrar su procedencia.
- Categorizar, describir y editar cada movimiento manualmente, registrando correcciones.
- Historial consultable y resumen mensual básico.
- Distinguir gasto, transferencia entre cuentas propias, retiro y otros movimientos para evitar contabilidad doble.
- Preparar aislamiento de datos por user_id en API y persistencia, aunque la interfaz sea de un solo usuario.

## Stack decidido
Next.js (React + backend Node.js) con TypeScript; PostgreSQL alojado en Neon; Drizzle ORM; Tailwind CSS + shadcn/ui; hosting Vercel; GitHub público. Validar versiones y límites de servicios al implementar. Monolito modular, sin microservicios.

## Diseño de datos y seguridad
Separar eventos originales (`source_events`) de movimientos interpretados (`transactions`), porque un mismo gasto podrá llegar de varias fuentes. Mantener el texto original, la clasificación actual, origen de clasificación y registro de cambios. Dinero con precisión decimal y moneda explícita; no convertir silenciosamente UYU/USD. Autenticación y autorización en servidor; `user_id` siempre derivado de sesión o identidad de integración, no confiado del cliente. Validar acceso en cada consulta. No registrar datos bancarios completos en logs. Secretos fuera de Git y copias de seguridad seguras.

## Posterior al MVP (no implementar aún)
- Cuenta Gmail exclusiva, con reenvío filtrado de avisos de Itaú desde el Gmail personal; Google Apps Script para la ingesta automática.
- MacroDroid en Android para capturar notificaciones NFC, si la prueba en el teléfono lo permite.
- Detección de duplicados entre fuentes y conciliación con estados bancarios.
- Reglas explícitas de categorización, revisión nocturna de excepciones, métricas de confiabilidad y automatización.
- División de una transacción bancaria en múltiples categorías (split): ejemplo $2.566 = Facu $1.066 + Casa $1.500, sin duplicar el gasto ni modificar evidencia original.
- Informes: evolución mensual, categorías, comercios, recurrencias, comparativas y proyectos/etiquetas.

## Proyecto de aprendizaje
El objetivo secundario central es dominar Codex desde Cursor con los skills de Matt Pocock (AI Hero). Aprender y evaluar el método `setup-matt-pocock-skills` → `grill-with-docs` → `to-spec` → `to-tickets` → `implement` → `code-review`. No implementar automáticamente el producto entero: ir ticket a ticket, inspeccionar el código y las decisiones.

## Decisiones recientes sobre categorización
- Automatización progresiva: solo las reglas explícitas aprobadas por el usuario categorizan sin confirmación. Ante ambigüedad, conflictos o anomalías, pedir revisión.
- Distinguir estado de revisión de origen de categoría. Una corrección manual es válida y no puede ser sobrescrita por el clasificador en un reprocesamiento.
- Al corregir una compra de «Supermercado» a «Casa», cambiar por defecto **solo esa transacción**. No cambiar la regla, el historial ni las compras futuras.
- Registrar trazabilidad de cambios de categoría; dejar el manejo completo de reglas para una fase posterior.

## Entorno de desarrollo
Cursor como IDE personal separado del laboral; extensión Codex y skills de Matt Pocock ya instalados. El seguimiento de tareas se realizará mediante GitHub Issues (si el setup lo deja configurado y el repositorio está conectado).

## Cuestiones abiertas para debatir con grill-with-docs
- Modelo exacto para tipos de movimientos, gastos y transferencia entre cuentas propias.
- Cómo representar fecha real vs recepción cuando faltan datos en el email.
- Categorías iniciales, correcciones y control de revisión.
- Contrato mínimo de las APIs, autenticación y pruebas de autorización.
- Qué métricas mínimas agrega valor en el MVP sin sobrecargarlo.
```
