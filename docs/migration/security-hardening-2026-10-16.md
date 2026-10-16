# Endurecimiento de seguridad del 16 de octubre de 2026

## Objetivo

Reducir la superficie observable por una evaluación de seguridad sin modificar rutas,
payloads, permisos ni reglas de Casino, Personas o Seguridad. No se aplicaron scripts a
`BDADP_CASINO`, no se crearon pedidos y no se ejecutaron ataques contra ambientes
externos.

## Cambios implementados

- El login limita por proceso a 20 solicitudes por IP cada 15 minutos. Los valores se
  pueden ajustar con `LOGIN_RATE_LIMIT_MAX` y `LOGIN_RATE_LIMIT_WINDOW_MS`.
- Express limita JSON a 256 KB, formularios a 64 KB y 200 parámetros.
- Las respuestas agregan `Cache-Control: no-store`, CSP restrictiva para la API,
  `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options` y protección contra
  framing. En producción se agrega HSTS.
- Se retiró `X-Powered-By`, la ruta pública `/backendDocker/test` y la exposición de
  errores no controlados mediante páginas o stacks de Express.
- El archivo PM2 dejó de contener credenciales literales y consume variables del
  ambiente. Las credenciales que alguna vez estuvieron versionadas deben rotarse.
- La imagen Docker excluye `.env`, Git, documentos, pruebas, outputs y backups; usa
  Node 20, instalación reproducible y usuario sin privilegios para ejecutar Node.
- El frontend ya no publica source maps en compilaciones de producción.
- Se retiraron dependencias directas no utilizadas y se actualizaron dependencias
  compatibles de backend y frontend.

## Resultado de dependencias

| Proyecto | Antes | Después |
| --- | --- | --- |
| Backend producción | 37: 2 críticas, 23 altas, 9 moderadas, 3 bajas | 10: 0 críticas, 8 altas, 2 moderadas |
| Frontend producción | 14: 0 críticas, 11 altas, 1 moderada, 2 bajas | 0 |

Las ocho observaciones altas residuales del backend provienen de Puppeteer y su cadena
de descarga (`basic-ftp` y `extract-zip`). Ese código pertenece a controladores heredados
de correo/reportes que no están montados en el router activo. `npm audit` propone un
downgrade mayor de Puppeteer; no se aplicó porque no es una remediación segura sin una
prueba funcional específica. Las dos moderadas restantes provienen de `tedious` a través
de `mssql` aun usando la versión compatible más reciente evaluada.

## Prueba de hacking controlada y reproducible

`npm run security:smoke` levanta la aplicación en un puerto efímero y comprueba:

1. headers defensivos y ausencia de identificación de Express;
2. rechazo de un origen CORS no autorizado;
3. rechazo de JSON superior a 256 KB;
4. respuesta HTTP 429 después de intentos repetidos de login;
5. ausencia de la antigua ruta pública de prueba.

`npm run security:gate` agrega un umbral que falla si `npm audit` encuentra una
vulnerabilidad crítica y luego ejecuta el smoke test. Esto es una verificación local de
controles conocidos; no sustituye un pentest externo con autorización y alcance formal.

## Verificaciones ejecutadas

- `node --test`: 36/36 correctas.
- `npm run security:gate`: correcto.
- ESLint dirigido del frontend: correcto.
- Build Vite de producción: correcto y sin archivos `.map`.
- `npm audit --omit=dev`: frontend 0; backend 10, sin críticas.
- `npm run verify:casino`: detectó 23 pedidos frente a los 15 esperados por la fotografía
  del verificador. No es un fallo del endurecimiento, pero el dato esperado debe
  actualizarse mediante una decisión separada y reproducible.

## Riesgos que permanecen

1. Rotar fuera del repositorio la API key y la clave SQL anteriormente expuestas y
   revisar accesos históricos. Quitar el texto del commit actual no revoca el secreto.
2. Definir si se retira Puppeteer y los módulos heredados no publicados o si se actualiza
   y prueba ese flujo por separado.
3. Terminar la migración de claves legadas desde `USUARIOS.UsuClave` y versionar los
   parámetros de `scrypt` antes de endurecerlos.
4. Definir validación de `UsuExpira`, MFA administrativo y retiro del acceso compatible
   por nivel 900; estos puntos pueden cambiar quién logra autenticarse o administrar.
5. Agregar auditoría persistente de autenticación, denegaciones y cambios de permisos.
6. Para más de una instancia Node, reemplazar el rate limit en memoria por un almacén
   compartido, por ejemplo Redis.
7. Corregir y probar la semántica de `SQLSERVER_ENCRYPT` y validar el certificado SQL en
   el ambiente de destino antes de modificar la configuración de conexión.
