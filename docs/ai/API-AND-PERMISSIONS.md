# API, rutas y permisos

Última verificación: 2026-08-02.

Todas las rutas backend cuelgan de `/backendDocker`. Salvo login, requieren la cookie de
sesión. Los códigos de empresa no forman parte del contrato público.

## Casino

| Método y ruta | Propósito | Permiso efectivo |
| --- | --- | --- |
| `GET /casino/bi/pedidos` | Dashboard ejecutivo principal | 55/1/1 o cualquiera de 55/5/1–6 |
| `GET /casino/bi/historial` | Indicadores, filtros y listado histórico | 55/5/6 |
| `GET /casino/bi/pedidos/:numero` | Detalle completo del pedido histórico | 55/5/6 |
| `GET /casino/pedidos/contexto` | Solicitante y catálogos para crear | 55/1/1 |
| `POST /casino/pedidos` | Crear borrador con cabecera y detalle | 55/1/1 |
| `POST /casino/pedidos/:numero/enviar` | Pasar borrador propio a estado 1 | 55/1/1 |
| `GET /casino/solicitudes` | Solicitudes del Casino asociado a la sesión | 55/1/10 |
| `GET /casino/solicitudes/:numero` | Detalle operacional del mismo Casino | 55/1/10 |
| `GET /casino/solicitudes/personas/:rut/historial` | Historial de la persona en el mismo Casino | 55/1/10 |
| `POST /casino/solicitudes/:numero/aprobar` | Confirmar fecha/hora y cambiar 1 → 2 | 55/1/10 |
| `POST /casino/solicitudes/:numero/rechazar` | Exigir comentario y cambiar 1 → 5 | 55/1/10 |
| `POST /casino/solicitudes/:numero/entregar` | Registrar hora efectiva y cambiar 2 → 3 | 55/1/10 |

La respuesta de `GET /casino/bi/pedidos` incluye `conclusions`, con cuatro lecturas
ejecutivas, y `assistant`, con preguntas sugeridas y respuestas fundamentadas en los
agregados del mismo resultado. Este asistente es determinista y no llama a un modelo o
servicio externo.

El permiso 55/1/90 no reemplaza 55/1/1. Es una capacidad adicional que permite elegir
otro `PedRutSolicita` dentro de la empresa autenticada.

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
| `/personas` | Llamados GX de Personas | Listado de personas |
| `/personas/:rut` | Navegación interna | Ficha de persona |
| `/seguridad/*` | Llamados GX de Seguridad | Administración protegida |

`frontAS/src/menu-items/authorizedMenu.jsx` es la única traducción entre `ProgNomGX` y
rutas React. Registrar un programa en SQL sin agregar su traducción no lo hace visible;
agregar solo la traducción tampoco concede permisos.
