# API, rutas y permisos

Última verificación: 2026-11-17.

Todas las rutas backend cuelgan de `/backendDocker`. Salvo login, requieren la cookie de
sesión. Los códigos de empresa no forman parte del contrato público.

`POST /seguridad/login` recibe `email` y `password`; si hay varias empresas,
se repite con `empCod` seleccionado. El correo se busca en `USUARIOS.UsuCorreo`.

## Casino

| Método y ruta | Propósito | Permiso efectivo |
| --- | --- | --- |
| `GET /casino/bi/pedidos` | Dashboard ejecutivo principal | 55/1/1 o cualquiera de 55/5/1–6 |
| `GET /casino/bi/historial` | Indicadores, filtros y listado histórico | 55/5/6 |
| `GET /casino/bi/pedidos/:numero` | Detalle completo del pedido histórico | 55/5/6 |
| `GET /casino/pedidos/contexto` | Solicitante y catálogos para crear | 55/1/1 |
| `POST /casino/pedidos` | Crear borrador con cabecera y detalle | 55/1/1 |
| `POST /casino/pedidos/:numero/enviar` | Pasar borrador propio a estado 1 | 55/1/1 |
| `POST /casino/pedidos/:numero/evaluacion` | Evaluar pedido entregado propio y ajustar pago | 55/1/1 |
| `GET /casino/solicitudes` | Solicitudes del Casino asociado a la sesión | 55/1/10 |
| `GET /casino/solicitudes/:numero` | Detalle operacional del mismo Casino | 55/1/10 |
| `GET /casino/solicitudes/personas/:rut/historial` | Historial de la persona en el mismo Casino | 55/1/10 |
| `POST /casino/solicitudes/:numero/aprobar` | Confirmar fecha/hora y cambiar 1 → 2 | 55/1/10 |
| `POST /casino/solicitudes/:numero/rechazar` | Exigir comentario y cambiar 1 → 5 | 55/1/10 |
| `POST /casino/solicitudes/:numero/entregar` | Registrar hora efectiva y cambiar 2 → 3 | 55/1/10 |
| `POST /casino/solicitudes/:numero/observacion` | Registrar observación del Casino | 55/1/10 y Casino asociado |
| `POST /casino/solicitudes/:numero/control-pago` | Liberar o bloquear pago con auditoría | 55/1/10 y Casino asociado |
| `GET/POST /casino/maestros/casinos` | Listar y crear casinos | 55/10/1 |
| `PUT/DELETE /casino/maestros/casinos/:id` | Editar y eliminar un casino | 55/10/1 |
| `GET/POST /casino/maestros/destinos` | Listar y crear destinos | 55/10/2 |
| `PUT/DELETE /casino/maestros/destinos/:id` | Editar y eliminar un destino | 55/10/2 |
| `GET/POST /casino/maestros/motivos` | Listar y crear motivos | 55/10/3 |
| `PUT/DELETE /casino/maestros/motivos/:id` | Editar y eliminar un motivo | 55/10/3 |
| `GET/POST /casino/maestros/tipos-producto` | Listar y crear tipos de producto | 55/10/10 |
| `PUT/DELETE /casino/maestros/tipos-producto/:id` | Editar y eliminar un tipo | 55/10/10 |
| `GET/POST /casino/maestros/productos` | Listar y crear productos | 55/10/11 |
| `PUT/DELETE /casino/maestros/productos/:id` | Editar y eliminar un producto | 55/10/11 |
| `GET /casino/maestros/opciones` | Casinos y tipos usados por Productos | 55/10/11 |
| `GET /casino/consultas/tipo-producto` | Matriz mensual por casino y tipo | 55/5/1 |
| `GET /casino/consultas/centro-costo` | Matriz mensual por división | 55/5/2 |
| `GET /casino/consultas/persona` | Matriz mensual por solicitante | 55/5/3 |
| `GET /casino/consultas/motivo` | Matriz mensual por casino y motivo | 55/5/4 |
| `GET /casino/consultas/descarga-general` | Detalle paginado y exportable de pedidos | 55/5/5 |
| `GET /casino/correos` | Estado paginado y exportable de la outbox | 55/1/92 |
| `GET /casino/correos/:id` | Detalle e historial de intentos | 55/1/92 |
| `POST /casino/correos/:id/reintentar` | Devolver un error/cancelado a la cola | 55/1/92 |
| `POST /casino/correos-procesar` | Procesar un lote bajo demanda | 55/1/92 |
| `GET/POST /casino/maestros/solicitantes` | Listar y crear solicitantes Casino | 55/10/12 |
| `PUT/DELETE /casino/maestros/solicitantes/:id` | Editar o eliminar solicitantes sin pedidos | 55/10/12 |
| `POST /casino/cargas/validar` | Validar una plantilla XLSX sin escribir datos | 55/10/13 |
| `POST /casino/cargas/importar` | Aplicar la plantilla completa en una transacción | 55/10/13 |

Las cuatro matrices mensuales aceptan `from` y `to` en formato `YYYY-MM-DD`, con ambos
límites opcionales. Ya no reciben `year`: las columnas se generan como períodos mes/año
del rango solicitado, incluso cuando cruza de año. React abre con los últimos 30 días.

La respuesta de `GET /casino/bi/pedidos` incluye `conclusions`, con cuatro lecturas
ejecutivas, y `assistant`, con preguntas sugeridas y respuestas fundamentadas en los
agregados del mismo resultado. Este asistente es determinista y no llama a un modelo o
servicio externo.

El permiso 55/1/90 no reemplaza 55/1/1. Es una capacidad adicional que permite elegir
otro `PedRutSolicita` dentro de la empresa autenticada.

El permiso 55/1/91 reproduce `TPPRAcceso`: sin él, el contexto de creación excluye
tipos y productos restringidos (`TPPRAcceso=1`); con él, admite acceso 0 y 1. El mismo
control se repite dentro de la transacción al guardar, por lo que no puede eludirse
enviando manualmente un código de producto.
Una petición manipulada recibe 403 `RESTRICTED_PRODUCT_ACCESS_REQUIRED`. La respuesta
del contexto expone `canAccessRestrictedProducts` para que React informe si presenta
el catálogo liberado o el catálogo completo.

Los CRUD de maestros obtienen siempre `GECODEMP` de la sesión. La baja de un registro
referenciado responde 409 y no elimina en cascada pedidos, productos ni detalles.

El permiso 55/1/10 corresponde al control operacional del Casino. Además del permiso,
el backend exige que el RUT de `USUARIOS` esté asociado a `CASIRut` para limitar todas
las lecturas y mutaciones a ese Casino. El navegador no envía `empCod` ni `casinoId`.

### Crear borrador

El cliente envía solamente:

```json
{
  "requesterRut": 12911839,
  "casinoId": 1,
  "destinationId": 3,
  "motiveId": 2,
  "deliveryDate": "2026-08-03",
  "deliveryTime": "14:30",
  "description": "Reunión operativa",
  "lines": [{ "productCode": 111, "quantity": 5 }]
}
```

No agregar `empCod`, `login`, precios, división, subdivisión o centro de costo. El
backend los resuelve y valida.

El solicitante retornado por `GET /casino/pedidos/contexto` incluye
`locationComplete` y `missingLocationFields`. Si se intenta crear con una ficha
incompleta, `POST /casino/pedidos` responde `409 REQUESTER_LOCATION_REQUIRED`, enumera
los campos faltantes en `details.missingFields` y no reserva correlativo ni escribe el
pedido.

### Historial

Filtros admitidos: `from`, `to`, `status`, `casinoId`, `destinationId`, `motiveId`,
`categoryId`, `productId`, `search`, `page` y `pageSize`. Los tamaños admitidos son 10,
25 y 50. La respuesta incluye KPI, contadores por tipo y producto, tendencia, conclusión,
catálogos, pedidos y paginación.

React acepta `/casino/pedidos/historial?pedido=<numero>` para abrir inmediatamente el
detalle de un pedido recién enviado. Este parámetro no modifica el contrato backend ni
permite cambiar la empresa de sesión.

## Personas

| Método y ruta | Propósito | Permiso |
| --- | --- | --- |
| `GET /personas` | Búsqueda paginada | Algún acceso al sistema 10 o 55 |
| `GET /personas/:rut` | Ficha completa | Algún acceso al sistema 10 o 55 |
| `GET /personas/:rut/foto` | Fotografía | Algún acceso al sistema 10 o 55 |

Las consultas siempre filtran `FPPersonas.GECODEMP` por la sesión.
El listado incluye los identificadores y descripciones de división, subdivisión y centro
de costo para que los selectores puedan distinguir una ficha completa de una referencia
organizacional faltante.

## Seguridad

| Método y ruta | Propósito | Protección |
| --- | --- | --- |
| `POST /seguridad/login` | Autenticación por RUT y clave | Pública |
| `GET /seguridad/session` | Sesión, permisos y menú | Sesión |
| `GET /seguridad/menu` | Menú autorizado actualizado | Sesión |
| `POST /seguridad/logout` | Cerrar sesión | Cookie actual |
| `PUT /seguridad/password` | Cambiar clave | Sesión |
| `POST /seguridad/verificar-acceso` | Equivalente de consulta VA2 | Sesión |
| `GET /seguridad/resumen` | Indicadores de Seguridad | Administrador de Seguridad |
| `/seguridad/catalogos/*` | CRUD, roles y asignaciones | Administrador de Seguridad |

`requireSecurityAdmin` acepta el rol configurado `ADMINFULL`, logins explícitos o el
nivel de compatibilidad configurado. El frontend consume `session.security.canManage`,
pero el backend vuelve a validar cada operación.

## Rutas React y menú

| Ruta React | Origen de menú | Resultado |
| --- | --- | --- |
| `/dashboard/default` | Entrada estática `Inicio > Panel ejecutivo` | Dashboard principal |
| `/casino/pedidos/nuevo` | 55/1/1, `ssp.maeSSP06OPPedidosPlanta.aspx` | Nueva solicitud |
| `/casino/pedidos/historial` | 55/5/6, `react.casinoHistory` | Dashboard histórico |
| `/casino/solicitudes` | 55/1/10, `react.casinoRequests` | Control operacional del Casino |
| `/casino/maestros/casinos` | 55/10/1, `react.casinoMaster.casinos` | CRUD de casinos |
| `/casino/maestros/destinos` | 55/10/2, `react.casinoMaster.destinos` | CRUD de destinos |
| `/casino/maestros/motivos` | 55/10/3, `react.casinoMaster.motivos` | CRUD de motivos |
| `/casino/maestros/tipos-producto` | 55/10/10, `react.casinoMaster.tiposProducto` | CRUD de tipos de producto |
| `/casino/maestros/productos` | 55/10/11, `react.casinoMaster.productos` | CRUD de productos |
| `/casino/consultas/tipo-producto` | 55/5/1, `react.casinoReport.tipoProducto` | Pedidos por tipo |
| `/casino/consultas/centro-costo` | 55/5/2, `react.casinoReport.centroCosto` | Consumos por división |
| `/casino/consultas/persona` | 55/5/3, `react.casinoReport.persona` | Consumos por persona |
| `/casino/consultas/motivo` | 55/5/4, `react.casinoReport.motivo` | Pedidos por motivo |
| `/casino/consultas/descarga-general` | 55/5/5, `react.casinoReport.descargaGeneral` | Descarga general |
| `/casino/correos` | 55/1/92, `react.casinoMail.status` | Estado y reintentos de correos |
| `/casino/maestros/solicitantes` | 55/10/12, `react.casinoMaster.solicitantes` | CRUD de solicitantes |
| `/casino/cargas` | 55/10/13, `react.casinoLoad.center` | Validación e importación XLSX |
| `/personas` | Llamados GX de Personas | Listado de personas |
| `/personas/:rut` | Navegación interna | Ficha de persona |
| `/seguridad/*` | Llamados GX de Seguridad | Administración protegida |

`frontAS/src/menu-items/authorizedMenu.jsx` es la única traducción entre `ProgNomGX` y
rutas React. Registrar un programa en SQL sin agregar su traducción no lo hace visible;
agregar solo la traducción tampoco concede permisos.
