# Migración operativa de SolicitaPedidoCasino

## Alcance

La nueva experiencia reemplaza la entrada `SSP.maeSSP06OPPedidosPlanta` y la captura de
`SolicitaPedidoCasino` sin modificar los nombres de las tablas GeneXus. El dashboard
permite iniciar una solicitud y la pantalla de catálogo administra un borrador visual.

## Contrato conservado

- Programa operativo: sistema 55, módulo 1, programa 1.
- Elección de otro solicitante: programa 55/1/90 (`Adm de Pedidos`).
- Empresa y login se obtienen únicamente de la sesión autenticada.
- El solicitante normal se obtiene de `USUARIOS.UsuRut` y debe estar activo en
  `SSP06MASolicitante`; un administrador 55/1/90 puede seleccionar otro solicitante
  activo de la misma empresa.
- Si el administrador 55/1/90 no es solicitante, el contexto carga los catálogos y
  exige elegir uno antes de crear. La ausencia de ficha propia no bloquea el selector.
- El correlativo se mantiene en `MACorrelativos`, clave `PEDCASINOS`.
- Estados: 0 borrador, 1 enviado al casino, 3 entregado y 5 anulado.
- Los precios y la pertenencia de cada producto al casino se vuelven a validar en el
  backend antes de escribir el encabezado y su nivel detalle.
- `DivId`, `SdiId` y `CecId` se obtienen de `SSP06MASolicitante`; nunca de React.

## Decisiones de migración

La versión GeneXus reservaba el correlativo y creaba una cabecera antes de abrir la
captura. La migración crea encabezado y líneas en una sola transacción al guardar el
borrador. Esto conserva el número y las tablas finales, pero evita cabeceras huérfanas
si el usuario abandona la pantalla.

`SSP06MATPProducto` contiene `TPPRAcceso` desde el script idempotente
`20261117_casino_maestros_crud.sql`. El valor 0 publica el tipo como liberado; el valor
1 exige además 55/1/91. El backend filtra el contexto y vuelve a validar cada producto
dentro de la transacción. El envío por correo de `CorreoCasino` queda como dependencia
pendiente: el envío cambia el estado a 1, pero no afirma haber enviado un correo.

En la experiencia React, `Crear y enviar` muestra un resumen de confirmación antes de
escribir. Tras una respuesta exitosa de creación y envío, navega a
`/casino/pedidos/historial?pedido=<numero>` y el historial abre el detalle. Esta mejora
no altera la transacción, los estados ni la validación de precios del backend.

Una ficha de solicitante incompleta no se corrige desde la solicitud. El backend informa exactamente
si falta división, subdivisión o centro de costo; React bloquea ambos botones de
creación, permite revisar el maestro de Solicitantes y, con 55/1/90, elegir otro solicitante.
Los solicitantes incompletos aparecen deshabilitados en el selector para evitar un error al
final del flujo.

## API

- `GET /backendDocker/casino/pedidos/contexto`
- `POST /backendDocker/casino/pedidos`
- `POST /backendDocker/casino/pedidos/:numero/enviar`

## Registro de menú

La entrada visible se conserva en el modelo de seguridad original:

- Sistema 55: `Pedidos Casino`.
- Módulo 1: `Operacional`.
- Programa 1: `Pedidos Casino`.
- Llamado compatible: `ssp.maeSSP06OPPedidosPlanta.aspx`, resuelto en React hacia
  `/casino/pedidos/nuevo`.
- Segundo llamado de consulta: sistema 55, módulo 5, programa 6,
  `Historial de Pedidos`, resuelto mediante `react.casinoHistory` hacia
  `/casino/pedidos/historial`. El dashboard ejecutivo principal permanece visible en
  `Inicio > Panel ejecutivo` y conserva `/dashboard/default`.

El script idempotente `database/20260730_casino_menu_55_1_1.sql` crea o normaliza el
catálogo. No entrega permisos nuevos: la visibilidad sigue dependiendo de `ASIGPROG` o
de las asignaciones heredadas por rol.

El script `database/20260730_casino_dashboard_menu_55_5_6.sql` agrega el segundo
llamado y replica 55/5/6 solamente a usuarios o roles que ya tenían al menos una
consulta 55/5/1–5.

## Verificación

- Reglas puras en `test/casinoPedidos.rules.test.js`.
- Prueba completa con `node --test`.
- Compilación de producción del frontend con Vite.

## Estado

Implementado para revisión funcional. Pendiente validar con usuarios de negocio el
calendario permitido de entrega e integrar la notificación de correo.
