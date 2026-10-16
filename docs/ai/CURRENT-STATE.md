# Estado actual de ADP Casino

Última verificación: 2026-10-16.

## Alcance activo

La solución usa dos repositorios hermanos:

- Backend: `C:\Proyectos2025\AS\backendAS`.
- Frontend: `C:\Proyectos2025\AS\frontAS`.

La base activa es `BDADP_CASINO`. Incluye únicamente Casino, las tablas de Personas que
Casino necesita, Seguridad y tablas técnicas de soporte. Los maestros frutícolas de
CONEX están excluidos.

## Flujo técnico

```text
React/MUI
  -> /backendDocker
  -> authContext (sesión, empCod, login)
  -> middleware de permisos
  -> controlador HTTP
  -> servicio y reglas de negocio
  -> SQL Server / BDADP_CASINO
```

La cookie de sesión es `HttpOnly`. El frontend nunca decide la empresa ni autoriza una
acción por sí mismo.

El backend aplica además límites de cuerpo, rate limit al login, respuestas de error
JSON sin stack, `Cache-Control: no-store` y headers defensivos. CORS sigue admitiendo
hosts privados durante desarrollo, pero en producción exige la lista `CORS_ORIGINS`.

## Funcionalidad implementada

| Área | Estado | Entrada principal |
| --- | --- | --- |
| Autenticación y sesión | Implementada | `/login` |
| Administración de Seguridad | Implementada para `ADMINFULL` | `/seguridad/*` |
| Ficha y búsqueda de Personas | Implementada | `/personas` |
| Dashboard ejecutivo principal | Implementado | `/dashboard/default` |
| Crear solicitud Casino | Implementado | `/casino/pedidos/nuevo` |
| Controlar solicitudes del Casino | Implementado; catálogo y tabla aplicados en `BDADP_CASINO` | `/casino/solicitudes` |
| Historial y detalle de pedidos | Implementado | `/casino/pedidos/historial` |

El panel ejecutivo presenta cuatro conclusiones calculadas por el backend: cumplimiento,
concentración por faenadora, producto líder y tendencia. También incluye un asistente
determinista de consultas rápidas que usa exclusivamente esos agregados; no consume un
modelo generativo ni transmite datos a un proveedor externo. La administración de
Seguridad conserva sus rutas y menú protegidos, pero ya no ocupa un bloque dentro del
panel ejecutivo.

El historial mantiene filtros, listado, detalle, gráfica por tipo y conclusión. Los KPI
superiores y los contadores visuales por tipo/producto se retiraron para reducir la
densidad de la pantalla, aunque el contrato backend conserva esos agregados por
compatibilidad.

El dashboard principal permanece siempre en el grupo estático `Inicio > Panel
ejecutivo`. El menú dinámico autorizado agrega:

- `Solicitudes Casino > Operacional > Pedidos Casino` para 55/1/1.
- `Solicitudes Casino > Operacional > Ver solicitudes` para 55/1/10.
- `Solicitudes Casino > Consultas > Historial de Pedidos` para 55/5/6.

## Contratos de pedido

- Cabecera y detalle se escriben en una transacción.
- `GECODEMP` y `PEDSolicita` provienen de la sesión.
- `PedRutSolicita` proviene del usuario autenticado o de una persona seleccionada por
  un usuario 55/1/90.
- Los precios se vuelven a consultar en `SSP06MAProducto`.
- El detalle toma división, subdivisión y centro de costo desde `FPPersonas`.
- Guardar crea estado 0; enviar cambia a estado 1.
- El Casino de la sesión se resuelve por `USUARIOS.UsuRut = SSP06MACasinosPlanta.CASIRut`.
  Con 55/1/10 puede aprobar 1 → 2 confirmando fecha/hora o rechazar 1 → 5 con comentario.
- Un pedido en preparación puede entregarse 2 → 3. El backend usa la hora del servidor
  y clasifica la diferencia como a tiempo, anticipada o tarde.
- Las decisiones se auditan en `SSP06OPPedidosPlantaDecision`; empresa y casino se
  validan nuevamente dentro de la transacción.
- El detalle de un pedido histórico se consulta por empresa autenticada y número.
- `Crear y enviar` exige confirmación en React; al completarse abre el historial y el
  detalle del pedido recién creado mediante el parámetro de presentación `pedido`.
- Si la ficha de Personas no permite imputar el consumo, el contexto identifica cuáles
  campos faltan entre división, subdivisión y centro de costo. React bloquea creación y
  envío, ofrece revisar la ficha y, para 55/1/90, seleccionar otro solicitante válido.

## Datos observados

Los siguientes valores fueron comprobados en `BDADP_CASINO`; son una fotografía y no
deben convertirse en constantes:

- 2 casinos, 7 tipos y 75 productos.
- 15 pedidos históricos, 1.411 unidades en la verificación del historial.
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
| Catálogo Casino | `SSP06MACasinosPlanta`, `SSP06MADestinosPlanta`, `SSP06MAMotivoPedidos` |
| Productos | `SSP06MATPProducto`, `SSP06MAProducto` |
| Personas y ubicación | `FPPersonas`, `FPDivision`, `FPDivisionSub`, `FPCenCos` |
| Correlativo | `MACorrelativos` |
| Seguridad | `USUARIOS`, `SEGUSUEMP`, `ASIGSIST`, `ASIG`, `ASIGPROG`, `ASIGPROG1` |
| Roles | `UROLES`, `URolesPorUser` |
| Sesiones y credenciales | `SEGSESION`, `SEGUSUCRED` |

## Estado de usuarios relevante

- La ficha de `MANDRADE` no tiene `DivId`, `SdiId` ni `CecId`; la creación debe exigir
  que seleccione otra persona o que se complete la ficha.
- `6563483` aparece inactivo en `FPPersonas`, aunque conserva permisos. No bloquearlo
  automáticamente sin decisión del negocio.

## Pendientes conocidos

1. Integrar la notificación del procedimiento `CorreoCasino`. Actualmente enviar cambia
   el estado a 1, pero no afirma haber enviado correo.
2. Migrar o resolver `TPPRAcceso`, atributo presente en el XPZ 2021 pero ausente en la
   tabla actual `SSP06MATPProducto`.
3. Confirmar los códigos organizacionales de Faenadora San Vicente y Lo Miranda. Solo
   Rosario está homologada; no asignar códigos por parecido de nombre.
4. Definir si una persona con `PerEstadoLab` inactivo puede crear pedidos.
5. Realizar validación funcional controlada con usuarios de negocio para creación,
   envío, filtros históricos y detalle.
6. Validar funcionalmente aprobación y rechazo con un usuario asociado a cada Casino.

## Verificación vigente

- Backend: 37 pruebas pasan con `node --test` al 2026-10-16, incluidas cinco
  verificaciones HTTP de endurecimiento.
- Dependencias de producción: frontend sin vulnerabilidades informadas por `npm audit`;
  backend sin críticas y con 10 observaciones residuales concentradas en Puppeteer y
  el driver transitivo de SQL Server.
- Base: `npm run verify:casino` conserva las comprobaciones de alcance, pero la ejecución
  del 2026-10-16 no finalizó porque esperaba 15 pedidos y la base de trabajo contiene
  24. No se alteraron esos datos durante este cambio.
- Frontend: ESLint dirigido y compilación Vite de producción correctos al 2026-10-16.
- El flujo nuevo tiene aplicado su SQL idempotente y aún requiere una prueba funcional
  controlada; la compilación no sustituye esa validación.

Estos resultados deben actualizarse cuando cambie la suite; no copiar cifras antiguas a
una entrega nueva sin volver a ejecutar los comandos.
