# Evaluaciones, control de pago y correo Casino

Revisión del 17 de noviembre de 2026 contra `ProyectoADP-casino.xpz`.

## Regla migrada

`EvaluacionPedido` permite al solicitante evaluar un pedido entregado como Malo (1),
Regular (2) o Bueno (3). Malo y Regular exigen observación. El Casino puede registrar
su propia observación. La evaluación se conserva en el registro canónico `EVPedCod=1`.

El legado contiene etiquetas contradictorias para `PEDControlPago`. La conducta
operativa predominante es `0=sin evaluación`, `1=pago liberado`, `2=pago bloqueado`:
la rutina `SSP06EstadoPago` lleva una evaluación Mala a 2 y las pantallas de consulta
presentan `Liberado:1,Bloqueado:2`. La exportación general que invierte esos textos se
considera un defecto histórico y no se reproduce.

La versión React simplifica el flujo: Malo bloquea automáticamente; Regular o Bueno
liberan. El encargado del Casino puede liberar o bloquear manualmente después de la
entrega; bloquear exige motivo. Cada transición se registra en
`SSP06OPPedidosPlantaPagoHistorial` con estado anterior/nuevo, origen, usuario y fecha.

## Estrategia recomendada para correos

No conviene enviar correo dentro de la transacción del pedido: una caída del proveedor
podría hacer fallar una operación válida o producir duplicados al reintentar. Se propone
un patrón **outbox transaccional**:

1. La misma transacción del cambio de estado inserta un evento pendiente con clave
   idempotente, tipo, pedido y destinatario resuelto por el backend.
2. Un trabajador separado toma eventos pendientes, renderiza una plantilla por tipo y
   llama al proveedor de correo.
3. Guarda identificador del proveedor, intentos, último error y fecha de envío. Los
   reintentos usan la misma clave idempotente.
4. Los eventos iniciales recomendados son pedido enviado (al correo del Casino), pedido
   aprobado/rechazado y entregado (al solicitante), y pago bloqueado/liberado.

La outbox quedó implementada en `SSP06OPCorreoOutbox`, con intentos en
`SSP06OPCorreoIntento`. Los cambios de estado encolan eventos dentro de la misma
transacción y el worker aplica bloqueo temporal, máximo de cinco intentos y espera
exponencial. `/casino/correos` permite revisar, exportar, procesar y reintentar.

El proveedor es Resend y permanece deshabilitado si falta cualquiera de
`CASINO_EMAIL_ENABLED=true`, `CASINO_EMAIL_FROM` o `RESEND`. El worker requiere además
`CASINO_EMAIL_WORKER_ENABLED=true`. Esta separación permite validar la cola sin enviar
mensajes reales. Antes de habilitarlo se debe verificar el dominio, usar destinatarios
de prueba y aprobar las plantillas definitivas.
