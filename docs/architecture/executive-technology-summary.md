# Resumen ejecutivo de tecnologia e infraestructura

Fecha de preparacion: 2026-08-06.

## 1. Objetivo

Este documento resume el stack tecnologico actual del proyecto ADP Casino para que un
equipo externo pueda evaluar compatibilidad con servidores, plataforma cloud o servicios
administrados.

## 2. Descripcion general del sistema

ADP Casino es una aplicacion web desarrollada con arquitectura separada en frontend,
backend y base de datos.

El sistema implementa una solucion web moderna para la gestion del modulo Casino. El
alcance actual cubre:

- Modulo Casino.
- Ficha y busqueda de Personas requerida por Casino.
- Seguridad, login, permisos, roles y menu autorizado.

El frontend consume una API REST expuesta por el backend. El backend concentra las reglas
de negocio, validaciones de permisos, sesion de usuario y acceso a SQL Server.

## 3. Stack tecnologico actual

| Capa | Tecnologia | Version / detalle actual |
| --- | --- | --- |
| Frontend | React | `19.2.4` |
| Frontend build | Vite | `7.3.1` |
| UI frontend | Material UI | `7.3.8` |
| Cliente HTTP | Axios | `^1.18.0` |
| Lenguaje frontend | JavaScript / JSX | Aplicacion SPA |
| Backend | Node.js | Version local observada: `20.19.1` |
| Framework backend | Express | `^4.18.0` |
| Lenguaje backend | JavaScript | CommonJS |
| Driver base de datos | `mssql` | `^11.0.1` |
| Base de datos | Microsoft SQL Server | SQL Server 2022 Express, `16.0.1000.6`, RTM |
| Base activa | `BDADP_CASINO` | Base operacional actual de Casino |
| Autenticacion | Cookie HTTP | `HttpOnly`, `SameSite=Lax`, `Secure` en produccion |
| Pruebas backend | Node test runner | `node --test` |
| Empaquetador frontend | Yarn | `4.12.0` declarado |

## 4. Base de datos observada

La base conectada al ambiente actual reporta:

| Elemento | Valor |
| --- | --- |
| Motor | Microsoft SQL Server |
| Edicion | Express Edition (64-bit) |
| Version | `16.0.1000.6` |
| Nivel | RTM |
| Producto | SQL Server 2022 |
| Base de datos | `BDADP_CASINO` |
| Sistema operativo observado por SQL | Windows 10 Home, build 19045 |

Nota: esta informacion corresponde al ambiente actualmente configurado para desarrollo o
trabajo local. Para produccion se recomienda usar una edicion/servicio adecuado al
volumen, disponibilidad, respaldo y soporte requeridos por el negocio.

## 5. Arquitectura de ejecucion

```text
Navegador del usuario
  -> Frontend React compilado como archivos estaticos
  -> API Backend Node.js / Express
  -> SQL Server BDADP_CASINO
```

La API backend se publica bajo la ruta base:

```text
/backendDocker
```

El backend escucha el puerto definido por la variable de entorno `PORT`; si no existe,
usa el puerto `3000`.

## 6. Requisitos para servidor o hosting

### Frontend

El frontend requiere un servidor de archivos estaticos con:

- HTTPS.
- Soporte para aplicacion SPA, redirigiendo rutas internas hacia `index.html`.
- Capacidad de configurar ruta base, actualmente preparada para publicacion bajo
  subdirectorio mediante `VITE_APP_BASE_NAME`.
- Acceso permitido hacia la URL del backend mediante mismo dominio o CORS.

Opciones compatibles:

- IIS.
- Nginx.
- Apache.
- Azure Static Web Apps.
- Azure App Service.
- Azure Storage Static Website con CDN o Front Door.

### Backend

El backend requiere:

- Node.js LTS.
- Instalacion de dependencias con `npm install`.
- Ejecucion con `npm start`.
- Variables de entorno configuradas.
- Acceso TCP al servidor SQL Server.
- HTTPS en ambiente productivo, directamente o mediante reverse proxy.
- Servicio administrado para mantener el proceso activo.

Opciones compatibles:

- Windows Server con IIS/reverse proxy o servicio Node.
- Linux con systemd, PM2, Nginx o equivalente.
- Contenedor Docker, si se define imagen.
- Azure App Service para Node.js.

### Base de datos

La base requiere:

- SQL Server compatible con SQL Server 2022 o equivalente.
- Base `BDADP_CASINO`.
- Usuario o identidad con permisos sobre la base.
- Backups automaticos.
- Monitoreo de rendimiento.
- Politica de alta disponibilidad y recuperacion.

Opciones compatibles:

- SQL Server on-premise.
- SQL Server en maquina virtual.
- Azure SQL Database, previa validacion de compatibilidad del esquema.
- Azure SQL Managed Instance, recomendada si se requiere mayor compatibilidad con SQL
  Server tradicional.

## 7. Variables de configuracion principales

El backend utiliza variables de entorno para no dejar parametros sensibles en codigo:

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
```

El frontend utiliza:

```env
VITE_APP_BASE_NAME=
VITE_API_URL=
VITE_APP_VERSION=
```

Las credenciales y cadenas de conexion deben administrarse como secretos del ambiente,
no dentro del repositorio.

## 8. Consideraciones para Azure

La solucion es compatible conceptualmente con una arquitectura Azure:

| Capa | Servicio sugerido |
| --- | --- |
| Frontend | Azure Static Web Apps o Azure App Service |
| Backend | Azure App Service para Node.js |
| Base de datos | Azure SQL Database o Azure SQL Managed Instance |
| Secretos | Azure Key Vault o App Service Application Settings |
| Logs | Application Insights |
| Red | VNet Integration / Private Endpoint si se requiere red privada |

Antes de confirmar produccion en Azure se recomienda validar:

- Version Node soportada y fijada explicitamente.
- Conexion cifrada hacia SQL Server/Azure SQL.
- Compatibilidad del esquema `BDADP_CASINO` con Azure SQL Database.
- Configuracion de CORS con dominios definitivos.
- Comportamiento de cookies si frontend y backend quedan en dominios distintos.
- Plan de backup, restauracion y monitoreo.

## 9. Observaciones importantes

- El backend no declara actualmente `engines.node` en `package.json`; conviene agregarlo
  antes de desplegar en PaaS.
- La conexion principal a SQL Server fija actualmente el puerto `1433`; si el servidor
  usa otro puerto, se debe ajustar el conector para usar `SQLSERVER_PORT`.
- Para Azure SQL se debe revisar la configuracion de cifrado de la conexion.
- La edicion observada en el ambiente actual es SQL Server Express; para produccion se
  debe dimensionar segun usuarios, volumen, disponibilidad, respaldos y crecimiento.
- Existen dependencias heredadas en el backend no necesariamente asociadas al alcance
  activo; se recomienda inventario antes de empaquetar una version productiva.

## 10. Conclusion ejecutiva

El proyecto utiliza un stack web moderno y estandar: React para frontend, Node.js con
Express para backend y SQL Server como base de datos. Esta combinacion es compatible con
servidores tradicionales Windows/Linux y tambien con servicios administrados en Azure.

Para evaluacion de infraestructura, los puntos clave son asegurar soporte para Node.js
LTS, hosting estatico para el frontend, SQL Server compatible, HTTPS, variables de
entorno seguras, conectividad entre backend y base de datos, respaldos y monitoreo.
