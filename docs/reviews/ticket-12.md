# Verificación del ticket #12 — Identificar automáticamente la cuenta

Referencia: `git diff fb87ed6...HEAD`.

## Standards

No se encontraron incumplimientos ni olores materiales. La regla es una función pura reutilizada tanto en interfaz como en servidor. El servidor consulta solo cuentas del usuario autenticado antes de sugerir una cuenta; la selección enviada por el cliente sigue validándose en la capa de negocio.

## Spec

La asignación automática usa únicamente la moneda explícita extraída por el parser sintético. Cuando hay exactamente una cuenta propia en esa moneda se sugiere, se muestra y puede reemplazarse. Con moneda ausente, ninguna coincidencia o varias candidatas se exige selección manual. Las referencias ajenas y una moneda contradictoria mantienen la entrada pendiente.

La revisión señaló que el criterio habla de cuentas activas. El archivado pertenece al ticket #15 y aún no existe un estado archivado en el modelo; por lo tanto todas las cuentas existentes son activas hoy. El contrato deja documentado que #15 debe excluir las archivadas de la sugerencia y de la selección, sin ampliar este ticket con el modelo de archivo antes de tiempo.

## Verificaciones

- TDD: se observaron fallos antes de implementar el selector puro, la asignación de servidor y la presentación editable.
- Suite completa: 128 pruebas aprobadas en 25 archivos.
- TypeScript, ESLint y build de producción con Webpack: aprobados.

Resumen: Standards sin hallazgos; Spec implementado con la dependencia de archivo documentada para #15.
