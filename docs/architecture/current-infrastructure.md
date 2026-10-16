# Infraestructura actual del proyecto ADP Casino

Fecha de preparacion: 2026-08-06.

## 1. Resumen ejecutivo

ADP Casino es una aplicacion web corporativa con una arquitectura moderna separada en
frontend, backend y base de datos SQL Server.

La solucion actual esta compuesta por dos repositorios principales:

- Backend: `C:\Proyectos2025\AS\backendAS`.
- Frontend: `C:\Proyectos2025\AS\frontAS`.

El alcance activo corresponde al modulo Casino, la ficha de Personas requerida por
Casino y la capa de Seguridad. La base de datos activa es `BDADP_CASINO`.

## 2. Arquitectura logica

El flujo tecnico vigente es:

```text
Usuario web
  -> Frontend React / MUI
  -> API HTTP bajo /backendDocker
  -> Middleware de sesion y permisos
  -> Controladores Express
  -> Servicios y reglas de negocio
  -> SQL Server / BDADP_CASINO
```

La aplicacion mantiene la autorizacion en el backend. El frontend presenta la interfaz
segun la sesion y el menu autorizado, pero no decide permisos ni empresa de trabajo.

## 3. Stack tecnologico

### Frontend

- Framework principal: React.
- Version declarada: React `19.2.4`.
- Bundler y servidor de desarrollo: Vite `7.3.1`.
- Lenguaje: JavaScript / JSX.
- UI: Material UI `7.3.8`.
- Componentes adicionales:
  - MUI X Charts.
  - MUI X Data Grid.
  - Ant Design Icons.
  - Emotion.
  - Framer Motion.
- Comunicacion HTTP: Axios.
- Estado y datos:
  - React Query.
  - SWR.
- Formularios y validacion:
  - Formik.
  - Yup.
- PWA: `vite-plugin-pwa`.
- Empaquetador declarado: Yarn `4.12.0`.

El frontend se compila como aplicacion estatica. La ruta base se controla con
`VITE_APP_BASE_NAME`. La URL del backend se controla con `VITE_API_URL`; en desarrollo,
si no se informa, apunta al mismo host en el puerto `3000`.

### Backend

- Runtime: Node.js.
- Framework HTTP: Express `4.18.x`.
- Lenguaje: JavaScript CommonJS.
- Entrada principal: `index.js`.
- Script de inicio: `npm start`, que ejecuta `node index.js`.
- Puerto: variable `PORT`; por defecto `3000`.
- Ruta base de la API: `/backendDocker`.
- Middleware principal:
  - `cors`.
  - `body-parser`.
  - `express.json`.
- Driver SQL Server: `mssql` `11.x`.
- Variables de entorno: `dotenv`.
- Pruebas: `node:test`.

Dependencias presentes en el backend incluyen tambien librerias para PDF, XML,
archivos, cron, correo y Puppeteer. Sin embargo, el router activo de la migracion
monta actualmente Seguridad, Personas y Casino.

### Base de datos

- Motor actual: SQL Server.
- Base activa: `BDADP_CASINO`.
- Conexion desde backend: paquete `mssql`.
- Pool configurado:
  - maximo: 10 conexiones.
  - minimo: 0 conexiones.
  - idle timeout: 30 segundos.
  - connection timeout: 30 segundos.
  - request timeout: 30 segundos.

Tablas principales por dominio:

| Dominio | Tablas principales |
| --- | --- |
| Pedidos Casino | `SSP06OPPedidosPlanta`, `SSP06OPPedidosPlantaDet` |
| Catalogos Casino | `SSP06MACasinosPlanta`, `SSP06MADestinosPlanta`, `SSP06MAMotivoPedidos` |
| Productos | `SSP06MATPProducto`, `SSP06MAProducto` |
| Personas | `FPPersonas`, `FPDivision`, `FPDivisionSub`, `FPCenCos` |
| Correlativos | `MACorrelativos` |
| Seguridad | `USUARIOS`, `SEGUSUEMP`, `ASIGSIST`, `ASIG`, `ASIGPROG`, `ASIGPROG1` |
| Roles | `UROLES`, `URolesPorUser` |
| Sesiones y credenciales | `SEGSESION`, `SEGUSUCRED` |

## 4. Modulos funcionales implementados

La aplicacion tiene implementadas las siguientes areas:

| Area | Ruta principal |
| --- | --- |
| Login y sesion | `/login` |
| Panel ejecutivo | `/dashboard/default` |
| Creacion de pedidos Casino | `/casino/pedidos/nuevo` |
| Historial y detalle de pedidos | `/casino/pedidos/historial` |
| Personas | `/personas` |
| Administracion de Seguridad | `/seguridad/*` |

Las rutas backend publicas y protegidas cuelgan de `/backendDocker`. Salvo el login,
las rutas requieren cookie de sesion.

## 5. Seguridad y sesiones

La autenticacion se realiza por RUT y clave en:

```text
POST /backendDocker/seguridad/login
```

El backend valida al usuario contra SQL Server y crea una sesion persistida en la tabla
`SEGSESION`. La cookie de sesion es:

- `HttpOnly`.
- `SameSite=Lax`.
- `Secure` cuando `NODE_ENV=production`.
- Nombre configurable mediante `SESSION_COOKIE_NAME`; por defecto `conex_session`.

El token real no se guarda en texto plano en la base. SQL Server almacena un hash
SHA-256 del token.

La empresa de trabajo queda asociada a la sesion. El backend publica este contexto como
`req.context.empCod` y `req.context.login`. Las pantallas no deben enviar `EmpCod` ni
`GECODEMP` para reemplazar la empresa autenticada.

La autorizacion efectiva usa las tablas historicas de Seguridad:

- `ASIGSIST`.
- `ASIG`.
- `ASIGPROG`.
- `ASIGPROG1`.
- `UROLES`.
- `URolesPorUser`.

El rol `ADMINFULL` habilita administracion de Seguridad. El backend vuelve a validar
cada operacion sensible aunque el frontend oculte o muestre opciones del menu.

## 6. Configuracion por ambiente

### Backend

Variables utilizadas por el backend:

```env
PORT=
NODE_ENV=
CORS_ORIGINS=

SQLSERVER_HOST=
SQLSERVER_PORT=
SQLSERVER_INSTANCE=
SQLSERVER_USER=
SQLSERVER_PASSWORD=
SQLSERVER_DATABASE=
SQLSERVER_ENCRYPT=
SQLSERVER_TRUST_CERT=

SESSION_COOKIE_NAME=
SESSION_HOURS=
SESSION_REMEMBER_HOURS=

SECURITY_ADMIN_ROLES=
SECURITY_ADMIN_LOGINS=
SECURITY_ADMIN_MIN_LEVEL=
```

Los valores sensibles no deben versionarse ni enviarse en documentacion tecnica abierta.
Para ambientes productivos deben mantenerse en variables seguras del servidor,
preferentemente usando un gestor de secretos.

### Frontend

Variables relevantes:

```env
VITE_APP_VERSION=
VITE_APP_BASE_NAME=
VITE_API_URL=
PUBLIC_URL=
GENERATE_SOURCEMAP=
```

`VITE_APP_BASE_NAME` define la base publica de la aplicacion. `VITE_API_URL` define el
origen del backend.

## 7. Requisitos de servidor

### Backend Node.js

Requisitos minimos recomendados para ejecutar el backend:

- Sistema operativo Windows Server o Linux soportado por Node.js.
- Node.js LTS.
- Acceso de red al servidor SQL Server por TCP 1433 o puerto configurado.
- Variables de entorno configuradas.
- Certificado HTTPS en ambientes productivos.
- Proceso administrado por servicio, contenedor, IIS reverse proxy, PM2, systemd,
  Azure App Service u orquestador equivalente.

Para produccion se recomienda fijar explicitamente la version Node en `package.json`
mediante `engines.node` y en la plataforma de hosting.

### Frontend estatico

Requisitos minimos para servir el frontend:

- Hosting de archivos estaticos.
- Soporte para fallback de rutas SPA hacia `index.html`.
- HTTPS.
- Configuracion correcta de la ruta base si se publica bajo subdirectorio, por ejemplo
  `/free`.
- Acceso CORS o mismo dominio hacia la API.

### SQL Server

Requisitos minimos:

- SQL Server compatible con el esquema `BDADP_CASINO`.
- Usuario SQL o identidad administrada con permisos de lectura/escritura sobre la base
  de aplicacion.
- Backups periodicos.
- Monitoreo de uso de CPU, memoria, DTU/vCore, almacenamiento, bloqueos y tiempos de
  consulta.
- Politica de alta disponibilidad y recuperacion ante desastre definida por el negocio.

## 8. Preparacion para Azure

La solucion puede desplegarse en Azure con una arquitectura PaaS:

| Capa | Servicio Azure sugerido |
| --- | --- |
| Frontend | Azure Static Web Apps, Azure Storage Static Website o App Service |
| Backend | Azure App Service para Node.js |
| Base de datos | Azure SQL Database o Azure SQL Managed Instance |
| Secretos | Azure Key Vault o App Service Application Settings |
| Logs y metricas | Application Insights y Log Analytics |
| Red privada | VNet Integration y Private Endpoint, si aplica |

Validaciones necesarias antes de confirmar produccion en Azure:

1. Confirmar compatibilidad completa del esquema y scripts con Azure SQL Database. Si hay
   dependencias de instancia SQL Server, evaluar Azure SQL Managed Instance.
2. Ajustar la conexion SQL para ambientes cloud:
   - usar cifrado TLS;
   - revisar `trustServerCertificate`;
   - usar `SQLSERVER_PORT` si el puerto no es 1433;
   - no depender de `instanceName` cuando se use Azure SQL Database.
3. Definir estrategia de dominio:
   - mismo dominio para frontend y backend, o
   - dominios separados con CORS y cookies configuradas correctamente.
4. Configurar `CORS_ORIGINS` con los dominios productivos.
5. Configurar `NODE_ENV=production` para activar cookie `Secure`.
6. Deshabilitar o separar codigo heredado no utilizado si no forma parte del alcance
   productivo.
7. Configurar backups, monitoreo, alertas y retencion de logs.

## 9. Verificacion actual documentada

Segun la documentacion vigente al 2026-08-02:

- Backend: 26 pruebas con `node --test`.
- Base: `npm run verify:casino` confirma el alcance de base definido para Casino.
- Frontend: ESLint dirigido, build Vite de produccion y revision visual del login
  correctos.

Estos resultados deben volver a ejecutarse antes de una entrega productiva o despliegue
formal.

## 10. Observaciones y riesgos

- El backend no declara actualmente `engines.node` en `package.json`.
- La conexion SQL actual fija `port: 1433`; aunque existe variable `SQLSERVER_PORT`, el
  conector principal no la usa.
- La opcion `encrypt` de la conexion SQL debe revisarse antes de Azure, porque en cloud
  se espera conexion cifrada.
- Existen dependencias y archivos heredados de modulos no montados en el router activo.
  Conviene inventariarlos antes de empaquetar una version productiva.
- El envio de correo de Casino esta pendiente de integracion funcional.
- La validacion funcional con usuarios de negocio sigue pendiente antes de declarar el
  modulo listo para produccion.

## 11. Conclusiones

El proyecto cuenta con una separacion clara entre frontend, backend y base de datos, y
usa tecnologias compatibles con despliegue moderno en servidores propios o Azure.

Para un ambiente de prueba o homologacion, la infraestructura requerida es directa:
hosting estatico para React, un servidor Node.js para Express y SQL Server accesible.

Para produccion en Azure, la recomendacion es completar primero los ajustes de
configuracion cloud, seguridad de conexion SQL, dominios/cookies, monitoreo y validacion
funcional.
