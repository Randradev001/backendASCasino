# Estudio de `SolicitaPedido02`

## Conclusión ejecutiva

`SSP.SolicitaPedido02` es un Web Panel GeneXus denominado **Solicita Pedido**, incluido en `ProyectoADP-casino.xpz` y actualizado por última vez el 11-03-2020. Conserva una propuesta visual útil —tipos de producto, tarjetas de productos y carrito—, pero no corresponde al flujo productivo más reciente ni está listo para migrarse literalmente.

El programa registrado en Seguridad como **Pedidos a Casino** es 55/1/1 y abre `ssp.maeSSP06OPPedidosPlanta.aspx`. Desde ese Work With, la creación y modificación llaman a `SSP.SolicitaPedidoCasino`, actualizado en 2021. No se encontraron llamadas a `SolicitaPedido02` ni una entrada `PROGRAM` que la haga alcanzable.

## Pantalla anterior y punto de entrada real

La pantalla indicada funcionalmente como `maeSSP06PPedidosPlanta` aparece en el XPZ con el nombre exacto `SSP.maeSSP06OPPedidosPlanta` —incluye `OP` por la transacción `SSP06OPPedidosPlanta`—. Es el punto de entrada real de Pedidos a Casino.

Su flujo es:

1. Obtiene `GECODEMP` y `login` desde la sesión.
2. Valida el acceso general al programa 55/1/1.
3. Presenta la lista de pedidos y permite filtrar por número, RUT solicitante, fechas, casino, destino, motivo, estado y evaluación.
4. Recupera el RUT asociado al usuario mediante `TraeRutLogin`.
5. Consulta el permiso 55/1/90, **Adm de Pedidos**.
6. Si el usuario no tiene 55/1/90, oculta la búsqueda y fija su propio RUT; si lo tiene, habilita el selector `PrPersonas` para comenzar un pedido para otra persona.
7. Al ejecutar `DoInsert`, exige un RUT, obtiene el siguiente correlativo `PEDCASINOS` desde `MACorrelativos` y abre:

   `SolicitaPedidoCasino(GECODEMP, PEDNumero, PerRut, PernombreCom)`

8. La modificación de un pedido en estado 0 abre la misma pantalla con su número y solicitante existentes.

Por tanto, la selección del solicitante y la creación del número pertenecen a la pantalla anterior. La pantalla de solicitud recibe ese contexto y no debe volver a aceptar empresa, usuario o un RUT arbitrario desde el navegador.

La migración debe tomar:

- La navegación visual de catálogo/carrito de `SolicitaPedido02`.
- Las reglas funcionales posteriores de `SolicitaPedidoCasino`, `AgregaProducto`, `EstadoPedido` y `maeSSP06OPPedidosPlanta`.
- Las restricciones multiempresa, de sesión y permisos del backend actual.

## Fuente revisada

| Elemento | Evidencia |
| --- | --- |
| XPZ Casino | `C:\paso\ProyectoADP-casino.xpz` |
| Objeto | `SSP.SolicitaPedido02` |
| GUID | `73e8a454-f819-4fc4-b96b-600b73a005a2` |
| Carpeta GeneXus | `SSP.CASOperaciones` |
| Descripción | Solicita Pedido |
| Última actualización | 2020-03-11 |
| Pantalla sucesora | `SSP.SolicitaPedidoCasino`, actualización 2021-07-30 |
| Entrada productiva | `PROGRAM` 55/1/1 → `ssp.maeSSP06OPPedidosPlanta.aspx` |

`PrPersonas` fue localizado en `ProyectoADPpersonas.xpz`; busca personas por nombre y limita la grilla por `GECODEMP`, pero no filtra por estado activo.

## Composición de la pantalla 02

La interfaz contiene tres zonas principales:

1. Tipos de producto, provenientes de `SSP06MATPProducto`, ordenados por empresa y `TPPROrden`.
2. Productos del tipo seleccionado, provenientes de `SSP06MAProducto`, mostrados como tarjetas con acción de agregar.
3. Carrito del pedido, proveniente del segundo nivel `SSP06OPPedidosPlantaDet`, limitado por `GECODEMP` y `PEDNumero`.

También solicita:

- Persona solicitante y nombre.
- Destino.
- Casino.
- Descripción del pedido.
- División, subdivisión y centro de costo.
- Confirmación para alternar entre enviar y eliminar.

No muestra cantidad, motivo, fecha de entrega ni hora de entrega. La versión 2021 sí incorpora estos datos.

## Flujo reconstruido de `SolicitaPedido02`

1. `Start` obtiene la empresa desde `Session.Get('EMP')`.
2. Al activar un tipo de producto asigna `TPPRCod` y `TPPRNombre`.
3. `Grid2.Load` consulta los productos de ese tipo y empresa.
4. Al presionar la imagen de carrito llama a la subrutina `carga`.
5. `carga` invoca `AgregaProducto` y refresca el detalle.
6. Al validar una persona recupera su nombre y su ubicación organizacional desde `FPPersonas`.
7. El botón enviar llama `EstadoPedido(..., 1)`.
8. El botón eliminar llama `EstadoPedido(..., 2)`.

En `EstadoPedido`, el selector 1 asigna estado 0 y el selector 2 elimina físicamente cabecera y detalle. Por lo tanto, el “envío” de esta variante no cambia el pedido a enviado; la pantalla sucesora utiliza el selector 3, que asigna estado 1 y luego llama a `CorreoCasino`.

## Modelo persistente

### Cabecera `SSP06OPPedidosPlanta`

Clave: `GECODEMP, PEDNumero`.

Contiene solicitante, casino, destino, motivo, descripción, fechas, hora, usuario creador, control de correo/pago y estado.

### Nivel dos `SSP06OPPedidosPlantaDet`

Clave: `GECODEMP, PEDNumero, PRODCodigo`.

Contiene precio, cantidad, fecha de entrega y la imputación `DivId/SdiId/CecId`. Es el segundo nivel de la transacción y no debe implementarse como maestro independiente.

La clave impide repetir un producto dentro del mismo pedido. Se debe decidir si la nueva pantalla rechazará el duplicado o acumulará su cantidad; GeneXus intentaba un `New` y no resolvía explícitamente el duplicado.

## Dependencias

| Objeto GeneXus | Responsabilidad | Destino de migración |
| --- | --- | --- |
| `AgregaProducto` | Crea/actualiza cabecera y agrega una línea, tomando el precio del catálogo | Servicio transaccional backend |
| `EstadoPedido` | Borrador, eliminación, envío, preparación y entrega | Acciones backend con validación de transición |
| `PrPersonas` | Busca solicitante por empresa y nombre | Endpoint Personas reutilizable |
| `PRDivision` | Busca división | Endpoint de ubicación Personas |
| `prsbdivicion` | Busca subdivisión | Endpoint dependiente de división |
| `prcentrocosto` | Busca centro de costo | Endpoint de centros de costo |
| `TraeNombrePM` | Recupera componentes del nombre | Servicio Personas existente/adaptado |
| `TraeDescDiv` | Describe división | Servicio Personas existente/adaptado |
| `TraeDescSDiv` | Describe subdivisión | Servicio Personas existente/adaptado |
| `TraeDescCeco` | Describe centro de costo | Servicio Personas existente/adaptado |
| `maeSSP06OPPedidosPlanta` | Lista, filtra, inicia, modifica, anula y evalúa pedidos | Pantalla y API operacional de pedidos |
| `CorreoCasino` | Notifica el envío al casino | Servicio backend posterior a una transición confirmada |

Los objetos de ubicación no fueron exportados dentro del XPZ Casino. Sus tablas sí están presentes en `BDADP_CASINO`: `FPDivision`, `FPDivisionSub` y `FPCenCos`.

## Diferencias frente a la pantalla productiva 2021

| Regla | `SolicitaPedido02` | `SolicitaPedidoCasino` |
| --- | --- | --- |
| Entrada | Sin parámetros | Empresa, pedido, RUT y nombre |
| Número de pedido | No se genera ni recibe | Generado por `MACorrelativos/PEDCASINOS` desde el Work With |
| Usuario solicitante | `login` no se carga | Sale de la sesión |
| Persona | Selección libre desde la pantalla | El Work With fija la persona; permiso 55/1/90 permite operar para terceros |
| Fecha/hora entrega | No existen | Obligatorias |
| Motivo | No existe | Obligatorio |
| Cantidad | No existe | `CantPed`, obligatoria para persistir por el esquema nuevo |
| Productos por casino | No filtra | Filtra `CASICod` |
| Enviar | Selector 1 → estado 0 | Selector 3 → estado 1 y correo |
| Eliminar línea | No existe | `SSP06EliminarProducto` |
| Firma `AgregaProducto` | Lista antigua de parámetros | `SDT_PedidoCasino` |
| Acceso de productos | No aplica | Programa 55/1/91 y atributo `TPPRAcceso` |

## Riesgos encontrados en la pantalla 02

1. `PEDNumero` no es parámetro ni se genera; puede operar con cero o valor no inicializado.
2. `login` no se obtiene de sesión, aunque se envía al procedimiento antiguo.
3. La llamada de múltiples parámetros a `AgregaProducto` no coincide con la firma exportada, que recibe `SDT_PedidoCasino`.
4. El botón enviar conserva estado 0 y no representa un envío real.
5. No valida solicitante, catálogo, fecha, hora, motivo, cantidad ni que el carrito tenga líneas.
6. Los combos de casino y destino no declaran filtro explícito por empresa.
7. No restringe productos por casino.
8. Permite buscar otra persona sin verificar el permiso administrativo 55/1/90.
9. La llamada a `TraeDescSDiv` usa una firma distinta de la versión sucesora y omite la división.
10. No ofrece eliminación de una línea ni tratamiento de producto duplicado.
11. Algunos rótulos reutilizan títulos de atributos no relacionados y resultarían confusos.

Por estos puntos, la pantalla se clasifica como **referencia visual/prototipo**, no como fuente funcional final.

## Seguridad que debe conservarse

- Permiso base 55/1/1 para consultar y operar Pedidos a Casino.
- Permiso 55/1/90 para seleccionar otra persona y administrar/anular pedidos ajenos.
- Permiso 55/1/91 para categorías restringidas, si el negocio confirma que esta regla sigue vigente.
- `req.context.empCod` y `req.context.login` como únicas fuentes de empresa y usuario.
- Un usuario sin 55/1/90 solo puede crear y modificar sus propios borradores.
- Toda lectura y mutación debe incluir `GECODEMP` de la sesión.
- Solo un borrador (estado 0) puede editarse o eliminarse físicamente.
- El envío debe ser una acción backend independiente, validada y transaccional.

En la base revisada, tres usuarios tienen 55/1/1 y dos de ellos también 55/1/90. No existen asignaciones efectivas para 55/1/91.

## Brecha de versión en la base nueva

El XPZ 2021 utiliza `TPPRAcceso` en la transacción `SSP06MATPProducto`, con valores `Liberado: 0` y `Restringido: 1`. La tabla actual `BDADP_CASINO.dbo.SSP06MATPProducto` no contiene esa columna porque la fuente de datos migrada corresponde a una versión anterior.

Antes de implementar el filtro 55/1/91 se requiere una decisión:

- Agregar `TPPRAcceso` con valor inicial 0 y permitir que el negocio clasifique categorías restringidas; o
- Retirar formalmente la regla 55/1/91 y documentar que todos los tipos están disponibles.

No se debe simular esta regla únicamente en React.

## Propuesta de experiencia nueva

### Paso 1: Datos del pedido

- Solicitante, fijado desde la sesión salvo permiso 55/1/90.
- Casino, destino y motivo.
- Fecha y hora de entrega.
- Observación.
- División, subdivisión y centro de costo obtenidos de la ficha de Persona y mostrados como imputación del consumo.

### Paso 2: Productos y carrito

- Categorías ordenadas por `TPPROrden`.
- Productos filtrados por empresa, casino y acceso.
- Cantidad positiva antes de agregar.
- Carrito con producto, cantidad, precio unitario, subtotal y acción de quitar.
- Total del pedido.
- Acciones Guardar borrador, Eliminar borrador y Enviar al casino.

## Contrato backend propuesto

- `GET /casino/pedidos/contexto`: catálogos y solicitante permitido.
- `GET /casino/pedidos/:numero`: cabecera y nivel dos.
- `POST /casino/pedidos`: crea borrador y reserva correlativo en una transacción.
- `PATCH /casino/pedidos/:numero`: modifica solo estado 0.
- `POST /casino/pedidos/:numero/items`: agrega o actualiza una línea validada.
- `DELETE /casino/pedidos/:numero/items/:producto`: elimina una línea del borrador.
- `POST /casino/pedidos/:numero/enviar`: valida datos y líneas, cambia 0 → 1 y agenda el correo.
- `DELETE /casino/pedidos/:numero`: elimina físicamente solo un borrador.
- `POST /casino/pedidos/:numero/anular`: transición a 5, reservada al permiso administrativo.

El precio debe obtenerse de `SSP06MAProducto` en el backend. El número debe generarse bloqueando `MACorrelativos` por empresa para evitar duplicados concurrentes.

## Estado de migración

- Estudio XPZ: completado.
- Contraste con `ProyectoADPpersonas.xpz`: completado para `PrPersonas`.
- Contraste con `BDADP_CASINO`: completado.
- Endpoint operacional: no implementado.
- Pantalla React: no implementada.
- Decisión `TPPRAcceso/55-1-91`: pendiente.
- Política de producto duplicado: pendiente.
- Validación de persona activa: pendiente de confirmación de negocio.
- Integración de correo: pendiente de estudiar `CorreoCasino` y su infraestructura.
