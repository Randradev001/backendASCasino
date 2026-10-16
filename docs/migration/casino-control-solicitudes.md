# Control operacional de solicitudes Casino

## Propósito

Migrar la primera pantalla de `SSP.PedidosCasinoStatus` para que cada Casino revise las
solicitudes que le fueron enviadas, consulte el detalle y el historial del solicitante,
y registre una aprobación o rechazo.

## Fuente GeneXus y seguridad

- Objeto: `SSP.PedidosCasinoStatus` de `ProyectoADP-casino.xpz`.
- Programa vigente: 55/1/10, antes descrito como `Control de Pedidos`.
- Ruta React: `/casino/solicitudes`.
- Llamado de menú: `react.casinoRequests`.
- El Casino se obtiene cruzando `USUARIOS.UsuRut` con
  `SSP06MACasinosPlanta.CASIRut` dentro de `req.context.empCod`.
- Ni la empresa ni el casino se aceptan desde React. Un usuario 55/1/10 sin asociación
  de RUT recibe `CASINO_NOT_LINKED` y no obtiene pedidos de otro Casino.

El script `database/20261016_casino_control_solicitudes.sql` conserva las asignaciones
directas y por rol existentes para 55/1/10; no concede permisos nuevos.

## Contrato y transiciones

- `GET /backendDocker/casino/solicitudes`: listado paginado del Casino de sesión.
- `GET /backendDocker/casino/solicitudes/:numero`: detalle y productos.
- `GET /backendDocker/casino/solicitudes/personas/:rut/historial`: últimos 20 pedidos
  de la persona para el mismo Casino.
- `POST /backendDocker/casino/solicitudes/:numero/aprobar`: exige fecha y hora; cambia
  exclusivamente 1 → 2 y actualiza la fecha del detalle.
- `POST /backendDocker/casino/solicitudes/:numero/rechazar`: exige comentario; cambia
  exclusivamente 1 → 5.
- `POST /backendDocker/casino/solicitudes/:numero/entregar`: cambia exclusivamente
  2 → 3, usa la hora del servidor y registra si la entrega fue a tiempo, anticipada o
  tarde junto con la diferencia en minutos.

Ambas decisiones bloquean el pedido en transacción, verifican nuevamente empresa,
casino y estado, y registran usuario y fecha en `SSP06OPPedidosPlantaDecision`. No se
reutiliza la tabla de evaluación posterior a la entrega porque representa otro hecho de
negocio.

La entrega también bloquea y vuelve a verificar el pedido. La hora comprometida, la
hora efectiva, la diferencia y el usuario quedan en `SSP06OPPedidosPlantaEntrega`. Una
diferencia negativa es anticipada, cero corresponde al mismo minuto y una diferencia
positiva es tardía.

## Diferencia deliberada

El objeto GeneXus aceptaba el pedido con un clic y conservaba la fecha original. La
pantalla nueva solicita confirmarla antes de aprobar, según el requerimiento funcional.
El rechazo con comentario no existía en `EstadoPedido`; se implementa como anulación
estado 5 con auditoría separada, sin sobrescribir `PEDDescripcion`.

## Aplicación

El cambio de catálogo y esquema se entrega como SQL idempotente. No se aplica a
`BDADP_CASINO` automáticamente; debe ejecutarse de forma explícita antes de habilitar la
ruta en un ambiente.
