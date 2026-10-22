# Seguimiento de trabajo: GitHub Issues

Las especificaciones y los tickets de este proyecto viven en GitHub Issues. Usar la CLI `gh`.

**Repositorio:** `nandoramos/registro-de-gastos-app`

**URL:** https://github.com/nandoramos/registro-de-gastos-app

**Remoto local:** `origin`.

## Convenciones

- Una especificación por issue y un issue por ticket de implementación.
- Usar `--repo nandoramos/registro-de-gastos-app` con el repositorio confirmado en todos los comandos de issues. No inferir el destino desde otra carpeta o repositorio.
- Para cuerpos y comentarios de varias líneas, escribir el contenido exacto en un archivo temporal y usar `--body-file`; conservar saltos de línea reales.
- Crear: `gh issue create --repo nandoramos/registro-de-gastos-app --title "..." --body-file <archivo.md>`.
- Leer: `gh issue view <numero> --repo nandoramos/registro-de-gastos-app --json number,title,body,labels,comments`.
- Listar: `gh issue list --repo nandoramos/registro-de-gastos-app --state open --json number,title,body,labels,comments`.
- Comentar: `gh issue comment <numero> --repo nandoramos/registro-de-gastos-app --body-file <archivo.md>`.
- Editar: `gh issue edit <numero> --repo nandoramos/registro-de-gastos-app --body-file <archivo.md>`.
- Aplicar o quitar etiquetas configuradas: `gh issue edit <numero> --repo nandoramos/registro-de-gastos-app --add-label "..."` o `--remove-label "..."`.
- Cerrar: `gh issue close <numero> --repo nandoramos/registro-de-gastos-app`.

## Especificaciones, subtareas y dependencias

Publicar los tickets en orden de dependencia, primero los que no tienen bloqueos.

Cuando una especificación ya existe como issue, vincular cada ticket como sub-issue mediante:

`gh api --method POST repos/nandoramos/registro-de-gastos-app/issues/<padre>/sub_issues -F sub_issue_id=<id-del-ticket>`

Obtener el identificador numérico de base de datos con `gh api repos/nandoramos/registro-de-gastos-app/issues/<numero> --jq .id`; no confundirlo con el número visible del issue ni con `node_id`.

Si el repositorio no permite sub-issues, agregar `Part of #<padre>` al comienzo del cuerpo del ticket y una lista de tareas con sus enlaces en el issue padre.

Registrar cada bloqueo mediante la relación nativa de GitHub:

`gh api --method POST repos/nandoramos/registro-de-gastos-app/issues/<ticket>/dependencies/blocked_by -F issue_id=<id-del-bloqueante>`

Si la relación nativa no está disponible, agregar `Blocked by: #<n>, #<n>` al comienzo del cuerpo. Un ticket queda desbloqueado cuando todos sus bloqueantes están cerrados.

## Etiquetas

No hay un vocabulario de triage configurado. No exigir ni crear automáticamente etiquetas de triage, incluida `ready-for-agent`, mientras no se acuerden para este proyecto.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Cuando un skill pide publicar en el issue tracker

Crear un issue en el repositorio confirmado, después de las revisiones que exija el skill invocado. Esta configuración no autoriza por sí sola publicaciones.

## Cuando un skill pide obtener un ticket

Leer el issue indicado por su URL o número en el repositorio confirmado. Si la referencia es ambigua, pedir aclaración.
