# Registro de Gastos

App personal privada. Están implementados el [ticket #2: acceso privado con Google](https://github.com/nandoramos/registro-de-gastos-app/issues/2) y el [ticket #3: crear y renombrar cuentas](https://github.com/nandoramos/registro-de-gastos-app/issues/3). La carga de gastos y los reportes se implementarán en tickets posteriores.

## Ejecutar localmente

Requiere Node.js 22.12 o posterior y una base PostgreSQL dedicada al proyecto (local o Neon). Las versiones exactas instaladas quedan fijadas en el lockfile.

1. Ejecutar `npm ci`.
2. Copiar `.env.example` a `.env.local` y completar sus valores **en privado**. No pegarlos en chats, capturas ni commits.
3. Configurar un cliente OAuth de tipo **Web application** en Google Cloud, con redirect URI `http://localhost:3000/api/auth/callback/google`. Usar la misma URL base en `BETTER_AUTH_URL`. Para el proyecto OAuth en modo de prueba, habilitar la cuenta propia como usuario de prueba.
4. Completar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_ALLOWED_SUB`. Este último es el identificador estable OIDC `sub` de la cuenta autorizada, no el correo. Puede consultarse de forma privada mediante [OAuth Playground de Google](https://developers.google.com/oauthplayground/), solicitando únicamente identidad (`openid email profile`) y consultando el userinfo de OpenID Connect. Copiar solo el `sub` al archivo local; no guardar las respuestas ni los tokens en el repositorio. La app no tiene un modo de «permitir a cualquiera» para obtenerlo.
5. Generar un secreto aleatorio de al menos 32 caracteres para `BETTER_AUTH_SECRET` y guardarlo solo en el entorno privado. Completar `DATABASE_URL` con la conexión PostgreSQL (TLS para Neon).
6. Revisar las migraciones y ejecutar `npm run db:migrate` **solo sobre la base elegida para esta app**. Crean las tablas de autenticación y cuentas financieras; no se ejecutan automáticamente en build o al iniciar el servidor.
7. Ejecutar `npm run dev` y abrir `http://localhost:3000`.

No se han configurado credenciales reales, aplicado migraciones a Neon ni desplegado esta aplicación. Sin configuración válida, el acceso privado falla de forma cerrada y la pantalla de ingreso muestra un mensaje genérico.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Los tests de integración ejecutan las migraciones reales sobre PostgreSQL embebido (PGlite) en memoria y usan identidades ficticias. No necesitan ni consultan `DATABASE_URL`, Google real o Neon. El callback OAuth se prueba con tokens firmados y respuestas de Google simuladas; las validaciones criptográficas y de estado de Better Auth siguen activas. Las pruebas de interfaz levantan un servidor local en el puerto 3100.

Se usa TDD por comportamiento: escribir un test en la frontera acordada, observar el fallo correcto, implementar el mínimo y refactorizar con tests verdes. Ejecutar el archivo afectado durante cada ciclo y la suite completa al terminar. No probar detalles internos que no cambian el comportamiento.

## Límites de seguridad y configuración

- Google es el único proveedor. Se solicitan `openid`, `email` y `profile`; no permisos de Gmail ni acceso offline.
- La identidad se valida por `sub` y email verificado antes de crear usuario o sesión. Cada entrada privada comprueba la sesión persistida y su cuenta Google autorizada.
- Sesiones en PostgreSQL; cookie HttpOnly gestionada por Better Auth, Secure sobre HTTPS, sin caché de sesión en cookie. Vencimiento de 7 días y renovación diaria; cerrar sesión invalida el registro del servidor.
- Solo se exponen inicio Google, callback, cierre de sesión y consulta de sesión autorizada. Los endpoints adicionales de cuentas y tokens de la biblioteca no están disponibles por HTTP. Cambiar la identidad permitida bloquea también la consulta de una sesión anterior.
- Vinculación automática de cuentas y contraseñas deshabilitadas. Los tokens OAuth que persiste la biblioteca se cifran con el secreto de autenticación.
- La app no muestra emails ni perfiles reales; los logs de autenticación se deshabilitan para evitar exponer datos del proveedor. Los errores de rutas se responden con mensajes genéricos.
- La consulta de autorización filtra conjuntamente por usuario de la sesión, proveedor y subject permitido. Un `user_id` del cliente no concede acceso.
- Las futuras rutas y operaciones deben obtener la identidad mediante la misma frontera de autorización y filtrar sus consultas por ese usuario. No alcanza con proteger un layout ni con comprobar que existe una cookie.
- Las cuentas financieras se almacenan separadas de las cuentas OAuth, pertenecen al usuario de la sesión y admiten únicamente UYU o USD. Todavía no contienen saldos ni movimientos.

Decisiones de arquitectura: [ADR-0003](docs/adr/0003-acceso-privado-con-google.md). [Guía oficial de Google en Better Auth](https://better-auth.com/docs/authentication/google) y [configuración de sesiones](https://better-auth.com/docs/concepts/session-management).

## Dependencias de desarrollo

La auditoría de esta entrega no reportó vulnerabilidades en dependencias de producción. Queda el aviso GHSA-vfj7-8cjw-p6xm en `braces`, transitivo del linter de Next.js (cinco entradas en `npm audit`, una causa raíz), sin versión corregida publicada al verificar. El linter procesa patrones locales del proyecto, no solicitudes de usuarios. Se evita aplicar la degradación de Next.js sugerida por `npm audit fix --force`; revisar el aviso cuando exista una actualización compatible. El `override` de esbuild corrige el aviso transitivo del generador de migraciones.
