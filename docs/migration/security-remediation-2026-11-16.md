# Remediación de dependencias ADP Casino

Fecha: 16 de noviembre de 2026. Alcance: backend, frontend y la imagen Docker local.

## Resultado y alcance

Se corrigieron los hallazgos de dependencias detectados en la revisión inicial.
Las auditorías npm completas y de producción informan 0 hallazgos en ambos proyectos.
El escaneo independiente de la imagen final con Trivy 0.76.2 informa 0 hallazgos.
Esto es evidencia del código y los artefactos locales, no del servidor desplegado ni
una certificación de ausencia de vulnerabilidades o un pentest.

Las rutas de Casino, Personas y Seguridad, permisos, empresa de sesión, contratos y
reglas GX no cambiaron. No fue necesario estudiar un objeto GX para este cambio de
dependencias. No se modificaron datos ni configuración de BDADP_CASINO.

## Comparación reproducible

Los números corresponden a entradas del inventario de npm audit, que también incluye
paquetes afectados por una dependencia transitiva; no representan CVE únicos.

| Alcance | Antes: crítica / alta / moderada / baja | Después |
| --- | --- | --- |
| Backend completo y producción | 0 / 14 / 4 / 5 (23) | 0 |
| Frontend completo, incluido desarrollo | 0 / 2 / 5 / 3 (10) | 0 |
| Frontend producción | 0 / 1 / 0 / 0 (1) | 0 |

`npm audit` no evalúa el contenido del fork local de deepmerge. Su corrección se
fundamenta en el cambio de código y las pruebas descritas abajo, no en ese cero.

## Versiones y correcciones

| Componente | Estado inicial local | Estado final local |
| --- | --- | --- |
| Node de verificación | 20.19.1 | 24.22.3, runtime aislado y contenedor |
| Base Docker | node:20-alpine3.20 | node:24.22.3-alpine3.24 |
| Express | instalado 4.22.3, mínimo declarado ^4.18.0 | mínimo ^4.22.3 |
| body-parser, transitivo de Express | 1.20.8 | 1.20.9 |
| mssql | 12.7.9 | 12.7.14 |
| @azure/identity / @azure/msal-node | cadena vulnerable en inventario inicial | 4.14.1 / 7.2.2 |
| multer | 2.4.0 | 2.5.0 |
| fast-xml-parser | 5.9.0 | 5.12.1 |
| Puppeteer | puppeteer 22.15.0 | puppeteer-core 25.17.0 |
| Resend | 2.1.0 | 6.38.1 |
| Axios frontend | 1.20.0 | 1.21.1 |
| Vite | 7.3.7 | 7.3.8 |
| vite-plugin-pwa | 1.2.0 | 2.0.0, Workbox 7.4.1 |
| glob de Workbox | 11.1.0 | 14.0.6 mediante override/resolution |
| deepmerge de Rollup/Workbox | 4.3.1 | fork privado 4.3.1-adp.1 |

Se actualizaron ambos archivos de bloqueo de cada repositorio. Se conservaron los
cambios previos del usuario en el frontend: `.env` y las dependencias de plataforma
de su `yarn.lock`. `.nvmrc` y `engines` fijan la línea Node 24 y su mínimo corregido;
no se cambió la instalación global del equipo. No se aplicó `npm audit fix --force`
ni el downgrade de Puppeteer o PWA que proponía el auditor.

### Capturas, correo e imagen

El capturador ya utilizaba Chromium del sistema; ahora usa puppeteer-core, respeta
`PUPPETEER_EXECUTABLE_PATH`, devuelve Buffer para conservar el contrato de adjuntos y
cierra el navegador incluso si falla la página. Se comprobó una captura PNG real con
Chromium 156.0.8078.79 en el contenedor. Los controladores heredados de correo siguen
fuera del router activo. La prueba de Resend intercepta fetch y no envía mensajes.

La imagen excluye archivos de ambiente, Git, documentación, outputs y herramientas
locales `.codex*`; funciona como UID 1000, con `NODE_ENV=production` y sin npm/Yarn.
El arranque cambió de `npm start` a `node index.js`. Un escaneo intermedio identificó
19 entradas vulnerables en dependencias del npm incluido en la base; se retiraron
los gestores de paquetes de la imagen final y el reescaneo quedó en 0. Alpine también
informa 0 hallazgos en la imagen final. El análisis se realizó localmente sobre un tar
de la imagen; no se publicó la imagen ni se subió el código a un servicio de análisis.

### Parche local sin corrección oficial disponible

CVE-2026-93753 / GHSA-gcqx-w48m-w2h4 no tenía una versión oficial corregida de
deepmerge al momento de esta revisión. Se conserva el código upstream y su licencia
MIT en `frontASCasino/vendor/deepmerge`, con un cambio acotado: filtrar `__proto__`,
`constructor` y `prototype` antes de leer/copiar claves de ambos operandos, también
en fusiones recursivas. El README del fork registra el SHA-256 del original.

La sustitución se limita a @rollup/plugin-node-resolve, consumido por Workbox durante
el build. Formik conserva deepmerge 2.2.1 en una dependencia separada. `overrides` de
npm y `resolutions` de Yarn registran tanto este fork como glob. La dependencia local
directa permite resolver el fork desde el consumidor real; no se modifican archivos
en node_modules ni se depende de un parche manual posterior a la instalación.

Cinco pruebas verifican la resolución desde Rollup, el ataque sobre ambos operandos,
la recursividad/objetos sin prototipo, los getters peligrosos y la compatibilidad de
arrays, símbolos y opciones. `deepmerge-regression.json` reproduce el problema con
el original (isAdmin heredado) y su ausencia con el parche. El SHA original coincide
con el README. Retirar este fork cuando exista un parche oficial equivalente y se
vuelvan a validar pruebas y build.

## Respuesta técnica a los CVE del correo

- Express: ambos CVE de 2024 están corregidos en 4.22.3; además se elevó el mínimo
  declarado y se actualizó body-parser por un aviso posterior.
- Vite: los CVE-2026-39363 y CVE-2026-39364 se corrigen desde 7.3.2 en la rama 7.
  Se usa 7.3.8 y los servidores dev/preview ahora se vinculan a 127.0.0.1. El acceso
  por LAN requiere un `--host` explícito. Producción debe servir el build estático.
- Axios: los CVE-2026-101898 y CVE-2026-101900 tienen parche desde 1.20.0; se usa
  1.21.1 con la cadena transitiva actualizada. El primero corresponde al adaptador
  HTTP/2 de Node, no al adaptador de navegador usado por esta aplicación.
- React: el código utiliza createRoot de react-dom/client. No hay paquetes
  react-server-dom, plugin RSC, Next.js ni directivas `use server` en src. No utiliza
  React Server Components, Server Functions o renderizado React en el backend. La
  conclusión de no aplicabilidad se limita a vulnerabilidades específicas de RSC.
- SQL Server: la actualización de mssql es del cliente Node; no actualiza el motor
  SQL Server. 16.0.1000.6 es RTM. La versión real sigue pendiente de comprobación.

## Verificaciones y evidencia

| Verificación | Resultado |
| --- | --- |
| node --test backend | 41 correctas, 0 fallidas |
| npm run security:gate backend | Auditoría completa 0; seis pruebas HTTP correctas |
| Compatibilidad de Puppeteer/Resend | Tres pruebas dentro de la suite backend |
| npm ci frontend | Instalación limpia correcta |
| npm run security:gate frontend | Auditoría completa 0; cinco pruebas correctas |
| ESLint de vite.config.mjs y prueba frontend | Correcto |
| Sintaxis del fork CommonJS | node --check correcto |
| Build Vite producción | Correcto; sin .map y con service worker/manifest PWA |
| Docker build | Correcto, imagen local |
| Smoke Docker sin red | UID 1000, ping 200, headers, exclusiones y PNG real correctos |
| Trivy 0.76.2 imagen final | 0 vulnerabilidades, sin filtros de severidad/ignores |
| npm run verify:casino | No completado: login SQL rechazado |

Los gates fallan desde severidad baja; no se silencian avisos del catálogo.
Los JSON antes/después, SBOM CycloneDX, logs, inventario, hashes y manifiesto del build
están en [el paquete de evidencia](evidence/security-2026-11-16/README.md).

### Reproducción

Usar Node 24.22.3 (`nvm install` / `nvm use` en cada repositorio si se usa nvm).
La verificación registrada de instalación usa npm y package-lock.json; Yarn conserva
sus resoluciones, pero no se certifica aquí una instalación inmutable con Yarn 4.

Backend:

```sh
npm ci
node --test
npm run security:gate
npm audit --omit=dev
npm run verify:casino
docker build --pull -t adp-casino-backend:security-20261116 .
```

Frontend:

```sh
npm ci
npm run security:gate
npm audit --omit=dev
node node_modules/eslint/bin/eslint.js vite.config.mjs test/securityDependencies.test.cjs
npm run build -- --logLevel warn
```

El escáner independiente utilizado es aquasec/trivy:0.76.2, sobre una imagen exportada
con `docker save`; comando `trivy image --input backend-image.tar --scanners vuln
--format json`. El análisis incluye todas las severidades y no usa excepciones.

## Pendientes para cierre en el ambiente destino

1. Publicar/desplegar por el procedimiento autorizado y contrastar versiones/hashes
   del artefacto en ejecución con este paquete. No se desplegó durante este trabajo.
2. Resolver el acceso autorizado a BDADP_CASINO y repetir verify:casino. No se cambió
   la fotografía histórica de conteos ni se alteraron datos para hacer pasar la prueba.
3. Ejecutar `database/20261116_security_version_readonly.sql` en la instancia real.
   Si sigue en RTM, Infraestructura debe coordinar respaldo/restauración, homologación
   y ventana para SQL Server 2022 CU28 (16.0.4325.4, referencia Microsoft al 16/11/2026),
   reconfirmando avisos de compatibilidad y parches al momento de la intervención.
4. Validar con usuarios los flujos de Casino y dejar aceptación funcional del ambiente.

Las brechas históricas ajenas a las dependencias —rotación de secretos, claves legadas,
MFA, auditoría persistente, CSRF y validación TLS SQL— conservan el estado documentado
en el informe de brechas de octubre. Estos resultados no las declaran resueltas.

## Referencias oficiales

- [Express: actualizaciones de seguridad](https://expressjs.com/en/advanced/security-updates/).
- [body-parser: GHSA-27r3-jxmh-p828](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
- [Vite: CVE-2026-39363](https://github.com/vitejs/vite/security/advisories/GHSA-p9ff-h696-f583).
- [Vite: CVE-2026-39364](https://github.com/vitejs/vite/security/advisories/GHSA-v2wj-q39q-566r).
- [Axios: CVE-2026-101898](https://github.com/axios/axios/security/advisories/GHSA-3pq3-5fj3-cg6v).
- [Axios: CVE-2026-101900](https://github.com/axios/axios/security/advisories/GHSA-4hqw-qxg8-jxx2).
- [deepmerge: aviso sin parche publicado](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).
- [Puppeteer: instalación y diferencia core](https://pptr.dev/guides/installation).
- [React: alcance de vulnerabilidades RSC](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components).
- [Node: calendario de soporte](https://github.com/nodejs/Release/blob/main/README.md).
- [Microsoft: versiones SQL Server 2022](https://support.microsoft.com/en-us/servicing/sql/sql-server-2022/kb5023451-build-versions).
- [Trivy 0.76.2](https://github.com/aquasecurity/trivy/releases/tag/v0.76.2).
