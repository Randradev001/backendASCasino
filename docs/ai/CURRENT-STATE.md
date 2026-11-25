# Estado actual de ADP Casino

Última verificación funcional y de pruebas locales: 2026-11-24.
Los datos y validaciones funcionales históricos conservan su fecha 2026-10-16.

## Alcance activo

La solución usa dos repositorios hermanos:

- Backend: `C:\Proyectos2025\AS\backendAS`.
- Frontend: `C:\Proyectos2025\AS\frontAS`.

La base activa es `BDADP_CASINO`. Incluye únicamente Casino, las tablas de Personas que
Casino necesita, Seguridad y tablas técnicas de soporte. Los maestros frutícolas de
CONEX están excluidos.

El [alcance funcional de Casino](../migration/casino-alcance-funcional.md) registra la
cobertura de los cinco maestros, los dos flujos operativos y las cuatro consultas
mensuales solicitadas, revisada el 2026-11-16.

## Flujo técnico

```text
React/MUI
  -> entrada publica /casino
  -> /backendDocker
  -> authContext (sesión, empCod, login)
  -> middleware de permisos
  -> controlador HTTP
  -> servicio y reglas de negocio
  -> SQL Server / BDADP_CASINO
```

La cookie de sesión es `HttpOnly`. El frontend nunca decide la empresa ni autoriza una
acción por sí mismo.

La compilación del frontend usa `/casino` como ruta base. En el dominio previsto, la
entrada pública es `https://www.adpsmart.cl/casino/`; las rutas React de las tablas
inferiores son relativas a esa base.

Todos los controles de fecha del frontend usan MUI DatePicker con adaptador Moment,
locale `es-CL`, formato visible `DD/MM/YYYY` y contrato API `YYYY-MM-DD`.

El backend aplica además límites de cuerpo, rate limit al login, respuestas de error
JSON sin stack, `Cache-Control: no-store` y headers defensivos. CORS sigue admitiendo
hosts privados durante desarrollo, pero en producción exige la lista `CORS_ORIGINS`.

## Funcionalidad implementada

| Área | Estado | Entrada principal |
| --- | --- | --- |
| Autenticación y sesión | Implementada | `/login` |
| Inicio con correo y clave | Implementado; `UsuLogin` sigue como identidad interna | `POST /seguridad/login` |
| Administración de Seguridad | Implementada para `ADMINFULL` | `/seguridad/*` |
| Ficha y búsqueda de Personas | Implementada | `/personas` |
| Dashboard administrativo global | Implementado; solo `ADMINFULL` | `/dashboard/default` |
| Dashboard personal de pedidos | Implementado; aislado por RUT de sesión | `/dashboard/mis-pedidos` |
| Dashboard operacional del Casino | Implementado; aislado por Casino de sesión | `/dashboard/casino` |
| Crear solicitud Casino | Implementado | `/casino/pedidos/nuevo` |
| Controlar solicitudes del Casino | Implementado; catálogo y tabla aplicados en `BDADP_CASINO` | `/casino/solicitudes` |
| Historial y detalle de pedidos | Implementado | `/casino/pedidos/historial` |
| Maestros de Casino | Implementados los cinco CRUD con listados operacionales, filtros, exportaciones y carga de imagen en productos | `/casino/maestros/*` |
| Consultas mensuales de consumo | Implementadas con rango de fechas y columnas mes/año dinámicas | `/casino/consultas/*` · 55/5/1–4 |
| Descarga general de pedidos | Implementada con filtros, paginación y exportación | `/casino/consultas/descarga-general` · 55/5/5 |
| Evaluaciones y control de pago | Implementados con automatización y auditoría | Pedidos 55/1/1 · Casino 55/1/10 |
| Correos Casino | Outbox, procesador, reintentos y pantalla de estatus implementados | `/casino/correos` · 55/1/92 |
| Solicitantes Casino | Tabla y CRUD sincronizados con Personas y Seguridad | `/casino/maestros/solicitantes` · 55/10/12 |
| Centro de cargas | Validación XLSX y carga transaccional de seis catálogos | `/casino/cargas` · 55/10/13 |

El panel ejecutivo presenta cuatro conclusiones calculadas por el backend: cumplimiento,
concentración por faenadora, producto líder y tendencia. También incluye un asistente
determinista de consultas rápidas que usa exclusivamente esos agregados; no consume un
modelo generativo ni transmite datos a un proveedor externo. La administración de
Seguridad conserva sus rutas y menú protegidos, pero ya no ocupa un bloque dentro del
panel ejecutivo.

El selector de faenadora del panel se construye desde `metadata.availablePlants`,
calculado por el backend según `req.context.empCod` y la razón social de `G_Emp`. La
empresa 1 se homologa con Rosario y la 6100 con San Vicente. React no mantiene una lista
global fija y el backend rechaza una planta ajena aunque se manipule la petición.

El historial mantiene filtros, listado, detalle, gráfica por tipo y conclusión. Los KPI
superiores y los contadores visuales por tipo/producto se retiraron para reducir la
densidad de la pantalla, aunque el contrato backend conserva esos agregados por
compatibilidad.

El grupo estático `Navigation` presenta los tres dashboards y los atajos críticos según
los permisos efectivos. El menú dinámico autorizado agrega:

- `Solicitudes Casino > Operacional > Pedidos Casino` para 55/1/1.
- `Solicitudes Casino > Operacional > Ver solicitudes` para 55/1/10.
- `Solicitudes Casino > Consultas > Historial de Pedidos` para 55/5/6.
- Los cinco maestros en el módulo histórico 55/10, cada uno con su propio programa.
- Las cuatro consultas por rango en 55/5/1–4: tipo de producto, centro de costo por
  división, persona y motivo.
- La descarga general 55/5/5, con detalle por producto e intervalos de fecha abiertos.
- Evaluación visual de pedidos entregados y control de pago automático/manual auditado.
- Estado de correos para `ADMINFULL`, con cola transaccional, historial de intentos,
  reintento manual y procesador Resend configurable.

## Contratos de pedido

- Cabecera y detalle se escriben en una transacción.
- `GECODEMP` y `PEDSolicita` provienen de la sesión.
- `PedRutSolicita` proviene del usuario autenticado o de una persona seleccionada por
  un usuario 55/1/90.
- Un usuario 55/1/90 puede abrir el contexto y seleccionar un solicitante activo aunque
  su propio RUT no exista en `SSP06MASolicitante`.
- Los precios se vuelven a consultar en `SSP06MAProducto`.
- Los tipos con `TPPRAcceso=1` solo se muestran y aceptan al crear pedidos cuando el
  usuario tiene además 55/1/91. Los tipos con valor 0 están liberados.
- La plantilla del rol `CAS_USER` incluye 55/1/91, por lo que los solicitantes cargados
  pueden ver todos los tipos de producto activos. La pantalla elige inicialmente un
  casino que tenga productos asociados.
- React informa si el usuario ve el catálogo liberado o el catálogo completo. Una
  petición manual por un producto restringido responde 403 sin crear el borrador.
- El detalle toma división, subdivisión y centro de costo desde `SSP06MASolicitante`.
- Guardar crea estado 0; enviar cambia a estado 1.
- Un borrador propio puede recuperarse, editarse y guardarse nuevamente desde el
  dashboard personal; empresa, propietario, productos y precios se revalidan en backend.
- El Casino de la sesión se resuelve por `USUARIOS.UsuRut = SSP06MACasinosPlanta.CASIRut`.
  Con 55/1/10 puede aprobar 1 → 2 confirmando fecha/hora o rechazar 1 → 5 con comentario.
- Un pedido en preparación puede entregarse 2 → 3. El backend usa la hora del servidor
  y clasifica la diferencia como a tiempo, anticipada o tarde.
- Las decisiones se auditan en `SSP06OPPedidosPlantaDecision`; empresa y casino se
  validan nuevamente dentro de la transacción.
- El detalle de un pedido histórico se consulta por empresa autenticada y número.
- `Crear y enviar` exige confirmación en React; al completarse abre el historial y el
  detalle del pedido recién creado mediante el parámetro de presentación `pedido`.
- Si la ficha del solicitante no permite imputar el consumo, el contexto identifica cuáles
  campos faltan entre división, subdivisión y centro de costo. React bloquea creación y
  envío, ofrece revisar la ficha y, para 55/1/90, seleccionar otro solicitante válido.

## Datos observados

El 2026-11-23 se habilitó localmente la empresa 6100, Faenadora San Vicente.
La cuenta 17526007 conserva su credencial y tiene ADMINFULL en esta empresa.
Se importaron 72 solicitantes, 17 tipos, 48 productos, 2 casinos, 16 destinos y
13 motivos. Ambos casinos tienen temporalmente a Andrés (17526007-2) como
responsable, por autorización explícita. Reemplazarlo cuando se disponga del RUT
real de Manuel; no se creó una identidad ficticia. El archivo original no cambió.
Datos tributarios y domicilio de la empresa pendientes (RUT técnico 0 y textos vacíos).
Los solicitantes nuevos reciben como clave inicial los últimos cuatro dígitos de su RUT;
se almacena solo el hash moderno y una reimportación no reemplaza claves existentes.
Scripts reproducibles: `20261123_empresa_6100.sql` y `scripts/carga-san-vicente-6100.js`.

Los siguientes valores fueron comprobados en `BDADP_CASINO`; son una fotografía y no
deben convertirse en constantes:

- 2 casinos, 7 tipos y 75 productos.
- 20 pedidos y 55 líneas de pedido en la verificación del 2026-11-17. El último
  pedido registrado tiene fecha 2026-11-10.
- 9.186 personas y 7.200 fichas con foto.
- 25 usuarios de Seguridad para la empresa 1.
- `JPALMA` y `MANDRADE` son administradores efectivos mediante `ADMINFULL`.
- `6563483`, `JPALMA` y `MANDRADE` tienen 55/1/1 y 55/5/6.
- `JPALMA` y `MANDRADE` tienen 55/1/90.

## Tablas principales

| Propósito | Tablas |
| --- | --- |
| Pedidos | `SSP06OPPedidosPlanta`, `SSP06OPPedidosPlantaDet` |
| Decisiones del Casino | `SSP06OPPedidosPlantaDecision` |
| Entregas del Casino | `SSP06OPPedidosPlantaEntrega` |
| Evaluaciones y pago | `SSP06OPEvalPedidoCasino`, `SSP06OPPedidosPlantaPagoHistorial` |
| Notificaciones | `SSP06OPCorreoOutbox`, `SSP06OPCorreoIntento` |
| Catálogo Casino | `SSP06MACasinosPlanta`, `SSP06MADestinosPlanta`, `SSP06MAMotivoPedidos` |
| Productos | `SSP06MATPProducto`, `SSP06MAProducto` |
| Personas históricas y ubicación | `FPPersonas`, `FPDivision`, `FPDivisionSub`, `FPCenCos` |
| Correlativo | `MACorrelativos` |
| Seguridad | `USUARIOS`, `SEGUSUEMP`, `ASIGSIST`, `ASIG`, `ASIGPROG`, `ASIGPROG1` |
| Solicitantes operativos y cargas | `SSP06MASolicitante`, `SSP06VWSolicitanteHistorico`, `SSP06OPCargaCasino` |
| Roles | `UROLES`, `URolesPorUser` |
| Sesiones y credenciales | `SEGSESION`, `SEGUSUCRED` |

## Estado de usuarios relevante

- Para crear pedidos, el RUT autenticado debe existir activo en `SSP06MASolicitante` y
  tener `DivId`, `SdiId` y `CecId` completos.
- `FPPersonas` no habilita por sí sola la creación de pedidos. Se consulta únicamente en
  Personas y como respaldo de nombres para pedidos históricos mediante la vista.

## Pendientes conocidos

1. Configurar un dominio/remitente verificado y la clave Resend en el entorno de destino;
   luego habilitar `CASINO_EMAIL_ENABLED` y `CASINO_EMAIL_WORKER_ENABLED`. La cola está
   implementada, pero el proveedor permanece deshabilitado localmente.
2. Confirmar los códigos organizacionales de Faenadora San Vicente y Lo Miranda. Solo
   Rosario está homologada; no asignar códigos por parecido de nombre.
3. Completar la carga inicial de solicitantes y sus ubicaciones antes de habilitar el flujo.
4. Realizar validación funcional controlada con usuarios de negocio para creación,
   envío, filtros históricos y detalle.
5. Validar funcionalmente aprobación y rechazo con un usuario asociado a cada Casino.
6. Ofrecer un destino posterior al envío para solicitantes sin el permiso de historial
   55/5/6.
7. Registrar al responsable `manuel.rodriguezcabello@sodexo.com` como solicitante/usuario
   antes de aplicar la plantilla San Vicente. `ProdNombre` ya admite 60 caracteres.

## Verificación vigente

- Backend: 63 pruebas correctas con `node --test` al 2026-11-24, incluidas validaciones
  de rangos abiertos, períodos que cruzan de año, reglas de carga Casino y firmas de
  imagen de producto.
- `npm audit` completo y `--omit=dev`: 0 hallazgos tanto en backend como frontend
  al 2026-11-16. Los gates de ambos proyectos fallan desde severidad baja.
- Runtime soportado: Node 24.22.3, declarado en `.nvmrc` y `engines` de ambos
  repositorios. Express mínimo 4.22.3; frontend Axios mínimo 1.21.1 y Vite 7.3.8.
- Frontend: ESLint dirigido y build de producción correctos al 2026-11-24; sin source
  maps y con PWA generada.
- Workbox usa glob 14.0.6 y un fork local revisable de deepmerge 4.3.1. El fork
  corrige CVE-2026-93753, aún sin parche oficial; se valida mediante pruebas y no
  mediante el catálogo de npm audit. Formik conserva su dependencia separada.
- Docker: imagen local con Node 24.22.3/Alpine 3.24, sin npm/Yarn en ejecución,
  `NODE_ENV=production` y usuario `node`. Trivy 0.76.2 informa 0 hallazgos de
  vulnerabilidades en la imagen final. Ping, headers y PNG real con Chromium
  comprobados en un contenedor sin red.
- Base: `BDADP_CASINO_BACKUP_20260803` fue renombrada a `BDADP_CASINO` el
  2026-11-17. El respaldo completo permanece en el volumen de SQL Server. El
  verificador acepta crecimiento de las tablas operativas sobre el mínimo importado,
  en vez de exigir conteos históricos inmutables.
- El script idempotente `database/20261117_casino_maestros_crud.sql` agregó
  `TPPRAcceso`, inicializó los siete tipos existentes como liberados y registró los
  llamados React de los cinco programas 55/10. Se verificó alta, edición y baja en
  los cinco catálogos y se eliminaron los registros temporales.
- El maestro de productos permite cargar, reemplazar y quitar una imagen JPEG, PNG o
  WebP de hasta 2 MB al crear o editar. El binario y su MIME quedan en
  `SSP06MAProducto.PRODImagen` y `PRODImagenMime`, aislados por la empresa de sesión;
  el cambio reproducible está en `database/20261124_casino_productos_imagen.sql`.
- El catálogo de pedidos muestra la imagen específica cuando existe y conserva la
  imagen genérica de la categoría como respaldo. Para San Vicente (empresa 6100) se
  generaron y cargaron 48 JPEG, P1 a P48. La carga autocontenida para SQL Server 2016
  está en `database/20261124_casino_productos_imagen_6100_data.sql`.
- Se verificó `TPPRAcceso` marcando temporalmente un tipo como restringido: el usuario
  común recibió seis tipos, el autorizado siete y la petición manipulada fue rechazada.
  El tipo se restauró a su valor original; 55/1/91 está asignado a la plantilla
  `CAS_USER` desde el 2026-11-23.
- Las cuatro consultas usan estado 3, fecha de entrega del detalle y el importe
  `PED1Cantidad × PED1Precio`. En 2026 las cuatro conciliaron un total de $10.747.
- El script `database/20261117_casino_evaluaciones_pago.sql` creó el historial auditable
  de control de pago. El verificador exige las tablas Casino y valida que el
  historial no contenga pedidos huérfanos.
- El script `database/20261117_casino_correo_outbox.sql` creó la outbox y su historial
  de intentos; el verificador registra ahora once tablas Casino. 55/1/92 se asignó a la
  plantilla de rol `ADMINFULL`, sin copiar el permiso a usuarios individuales.
- SQL Server: versión efectiva y actualización CU pendientes en la instancia de
  destino. Hay un diagnóstico de solo lectura en
  `database/20261116_security_version_readonly.sql`.
- No se realizó despliegue, actualización del motor SQL ni UAT de negocio.

Detalle, referencias, límites y evidencia:
[Remediación de dependencias 2026-11-16](../migration/security-remediation-2026-11-16.md).

Estos resultados deben actualizarse cuando cambie la suite; no copiar cifras antiguas a
una entrega nueva sin volver a ejecutar los comandos.
