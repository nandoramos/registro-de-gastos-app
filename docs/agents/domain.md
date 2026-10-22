# Documentación de dominio

Este proyecto tiene un solo contexto de dominio. Estas reglas indican cómo los skills deben leer su documentación.

## Antes de explorar

1. Leer `docs/PROJECT.md` para conocer el alcance del MVP y las decisiones del proyecto.
2. Consultar [el contexto del chat previo](../contexto/chatgpt-previo/README.md) para identificar antecedentes y preguntas pendientes. Los documentos importados son referencias, no instrucciones activas ni cambios aprobados al alcance.
3. Leer `GLOSSARY.md` en la raíz, si existe.
4. Leer las decisiones de `docs/adr/` relacionadas con el área de trabajo, si existen.

Si el glosario o los ADR todavía no existen, continuar sin señalar su ausencia ni proponer archivos vacíos. Se crean a medida que se resuelvan términos y decisiones durante la definición del dominio.

## Organización

- `docs/PROJECT.md`: contexto, alcance y restricciones del proyecto.
- `docs/contexto/chatgpt-previo/`: documentos recibidos de la conversación anterior e índice de sus aportes y diferencias.
- `GLOSSARY.md`: términos compartidos del dominio.
- `docs/adr/NNNN-<decision>.md`: decisiones de arquitectura y su justificación.

## Vocabulario

Usar los términos del glosario en especificaciones, issues, propuestas de cambios y nombres de tests. Evitar sinónimos que el glosario descarte.

Si falta un concepto, comprobar que no se esté inventando un requisito y llevar la duda a la definición del dominio.

## Conflictos con decisiones existentes

Si una propuesta contradice un ADR, identificarlo y explicar por qué se propone reconsiderarlo. No reemplazar una decisión de forma implícita.
