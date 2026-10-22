# Acceso privado con Google y sesiones persistidas

## Contexto

El ticket #2 requiere una aplicación Next.js privada, con un único usuario autorizado, sin permisos de Gmail y con aislamiento preparado para las entidades financieras futuras. Todavía no existían código ni tests.

## Decisión

Usar Better Auth con su adaptador Drizzle para PostgreSQL. Mantener la integración HTTP delgada y separar la política de acceso, la consulta de identidad persistida y la configuración de la biblioteca. El paquete de autenticación controla OAuth, state, PKCE, validación de ID token, cookies y cierre de sesión; no se implementa un protocolo propio.

Autorizar el identificador Google `sub` configurado en servidor, con email verificado, en lugar de confiar en un identificador de usuario del cliente o en un nombre de correo mutable. El mapeo del perfil rechaza identidades ajenas antes de crear registros. La creación de sesiones y cada acceso privado comprueban que la cuenta OAuth vinculada al usuario coincide con la identidad autorizada.

Deshabilitar contraseñas, vinculación automática, inicio directo con ID token del cliente y caché de sesión en cookie. Sesiones persistidas de siete días con renovación diaria. Pedir solo identidad (`openid`, `email`, `profile`) y acceso online, sin incorporar permisos previamente concedidos ni scopes adicionales del cliente. Cifrar los tokens OAuth persistidos. Los logs de autenticación quedan deshabilitados y las respuestas de error no exponen datos internos.

La configuración se resuelve de forma diferida en servidor: el build no requiere secretos ni conexión a base de datos. Sin configuración, las rutas privadas fallan cerradas. La migración es aditiva y se aplica mediante un comando explícito, nunca al arrancar.

## Pruebas y límites

Se prueban la política pura, la integración real de Better Auth con Drizzle y PostgreSQL embebido, el callback OAuth con tokens firmados de prueba y los flujos de interfaz sin credenciales reales. Los tests nunca acceden a la base indicada por el entorno.

PGlite verifica esquema y consultas PostgreSQL, pero no sustituye una prueba de conectividad con Neon ni la configuración del cliente real en Google. Esas comprobaciones requieren el entorno privado del usuario. El ticket no crea todavía entidades de gastos, cuentas financieras ni categorías; su aislamiento se implementará y verificará en los tickets correspondientes.

El identificador autorizado debe obtenerse de forma privada antes de usar la app. Cambiar el identificador o revocar la sesión impide el acceso en la siguiente comprobación del servidor. No se introduce un modo de acceso abierto para simplificar el alta.
