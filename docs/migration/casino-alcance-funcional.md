# Alcance funcional de ADP Casino

Revisión del 17 de noviembre de 2026. El sistema permite a personas de una empresa
solicitar productos de sus casinos, al casino gestionar la entrega y a los usuarios
autorizados consultar los consumos. El alcance solicitado comprende cinco maestros,
dos funciones operativas, cuatro consultas mensuales y la descarga general.

## Maestros

Los cinco maestros y el nuevo maestro de solicitantes cuentan con CRUD backend y pantallas React independientes. Comparten
el listado operacional azul, indicadores, filtros automáticos, tabla paginada y
exportaciones Excel/PDF del conjunto filtrado. La empresa proviene exclusivamente de
la sesión y cada maestro conserva su programa histórico 55/10.

| Maestro | Tabla y objeto de mantención GeneXus | Cobertura actual y trabajo pendiente |
| --- | --- | --- |
| Casinos | `SSP06MACasinosPlanta` · `maeSSP06MACasinosPlanta` | Implementado con 55/10/1: nombre, RUT, dígito verificador y correo. Conserva `CASIRut` para asociar al encargado con su casino. |
| Destinos de pedidos | `SSP06MADestinosPlanta` · `maeSSP06MADestinosPlanta` | Implementado con 55/10/2. La baja se bloquea cuando existen pedidos asociados. |
| Motivos de pedidos | `SSP06MAMotivoPedidos` · `maeSSP06MAMotivoPedidos` | Implementado con 55/10/3. La baja se bloquea cuando existen pedidos asociados. |
| Tipos de productos | `SSP06MATPProducto` · `maeSSP06MATPProducto` | Implementado con 55/10/10: nombre, orden y `TPPRAcceso`. La baja se bloquea si contiene productos. |
| Productos de casino | `SSP06MAProducto` · `maeSSP06MAProducto` | Implementado con 55/10/11: nombre, tipo, precio y casino. La baja se bloquea si aparece en pedidos. |
| Solicitantes | `SSP06MASolicitante` | Implementado con 55/10/12. Mantiene un ID interno autoincremental y sincroniza RUT, usuario y ubicación con Personas y Seguridad. |

El centro de cargas 55/10/13 valida e importa XLSX. Los códigos de negocio se guardan
como códigos externos y las relaciones usan IDs internos generados. La carga completa
es transaccional y registra su resumen en `SSP06OPCargaCasino`.

`TPPRAcceso=0` significa liberado. `TPPRAcceso=1` significa restringido y requiere la
capacidad adicional 55/1/91 al crear pedidos. La consulta del contexto filtra esos
tipos y productos, y el guardado vuelve a comprobarlo dentro de la transacción. Como
la base anterior no conservaba la columna, los siete tipos existentes se inicializaron
en 0; un administrador puede clasificarlos posteriormente desde el CRUD.

## Operación

Se toma «Panel de casino» como la pantalla que usa el encargado para atender pedidos.
El proyecto también cuenta con un panel ejecutivo y un historial general de consulta.

| Función | Estado | Ruta y permiso | Cobertura y pendientes |
| --- | --- | --- | --- |
| Pedidos de casino | Implementado | `/casino/pedidos/nuevo` · 55/1/1 | Guarda borrador y envía al casino. 55/1/90 permite pedir por otra persona de la empresa. La integración de correo y la validación funcional con usuarios siguen pendientes. |
| Panel de casino | Implementado | `/casino/solicitudes` · 55/1/10 | Lista solicitudes del casino asociado al usuario, muestra detalle e historial del solicitante y permite aprobar, rechazar y registrar la entrega. Queda pendiente validar estas acciones con encargados de casino. |

Después de la entrega, el solicitante puede evaluar visualmente el servicio. Malo
bloquea el pago; Regular o Bueno lo liberan. El Casino puede responder y ajustar el
control con trazabilidad. La diferencia deliberada frente a etiquetas contradictorias
del legado está documentada en `casino-evaluaciones-pago-correo.md`.

El borrador puede enviarse desde la confirmación de guardado. Falta una acción para
retomar y editar un borrador al volver a la aplicación. Al enviar, React abre el
historial general, cuyo backend exige 55/5/6. Un solicitante con solo 55/1/1 puede
enviar el pedido, pero recibe una denegación al consultar ese historial.

## Consultas mensuales

Las cuatro consultas están implementadas como matrices independientes con rango de
fechas, columnas mes/año dinámicas, total, indicadores, filtros automáticos y
exportación del conjunto filtrado. Al abrir muestran los últimos 30 días; ambos límites
pueden limpiarse para consultar intervalos abiertos.

| Consulta | Programa histórico | Salida solicitada | Referencia GeneXus |
| --- | --- | --- | --- |
| Pedidos por tipo de producto | 55/5/1 | Implementada por casino y tipo. | `SSP06ConsultaAnualTipoProducto` |
| Consumos por centro de costo | 55/5/2 | Implementada por división imputada al detalle. | `SSP06ConsultaAnualUbicacion` |
| Pedidos por persona | 55/5/3 | Implementada por persona solicitante. | `SSP06ConsultaAnualUsuario` y `TraeCantidadMes` |
| Pedidos por motivo | 55/5/4 | Implementada por casino y motivo. | `CPedpormotivo` y `ConsultaAnualMotivo` |
| Descarga general | 55/5/5 | Implementada por línea, con filtros, paginación y exportación. | `SSP06ConsultaGeneral` |

El importe se calcula con la cantidad y el precio guardados en cada línea
(`PED1Cantidad × PED1Precio`). Para cada reporte, la unión entre cabecera y detalle
debe usar empresa y número de pedido, con la empresa obtenida de la sesión. Los
códigos 55/5/1 a 55/5/4 ya forman parte de la autorización del panel ejecutivo.
Cada reporte requiere su propia ruta con el permiso correspondiente y su entrada
de menú.

La implementación conserva estado 3 (entregado) como criterio de consumo. Las cuatro
consultas imputan el mes por `PED1FechaEnt`; esto corrige deliberadamente la
inconsistencia de la consulta GeneXus por persona, que mezclaba la fecha de cabecera
con `PedAA`/`PedMM`. Todas suman `PED1Cantidad × PED1Precio` y filtran por empresa de
sesión.

Cuando se consultan todos los casinos, las pantallas GeneXus de tipo de producto y
motivo consolidan los importes bajo «Todos los Casinos». El alcance nuevo pide
desglosarlos por casino.

## Evidencia de la revisión

- `Modelo Casino ADP.zip` contiene la exportación GeneXus `Modelo Casino ADP.xml`.
  Se revisaron los objetos de mantención, operación y consultas citados arriba.
- `Tablas de Casino.sql` contiene DDL de las ocho tablas históricas `SSP06` para
  `BDADP`. Al comparar nombres, tipos y nulabilidad de las columnas con el
  [esquema reproducible](../../database/20260730_BDADP_CASINO_schema.sql), la
  diferencia en esas ocho tablas es `SSP06MATPProducto.TPPRAcceso` (`smallint NULL`),
  presente en el adjunto. GeneXus identifica `0` como liberado y `1` como restringido.
  La migración agrega tablas de auditoría de decisiones y entregas. El DDL adjunto
  se revisó como referencia y no se ejecutó.
- Se contrastaron [las rutas y permisos del backend](../../src/Router/casino.routes.js)
  con `src/routes/MainRoutes.jsx`, `src/menu-items/authorizedMenu.jsx` y los clientes
  API del frontend. El cálculo actual se revisó en
  [el servicio BI](../../src/services/casinoBi.service.js) y
  [el servicio de historial](../../src/services/casinoHistorial.service.js).
- Pasaron 41 pruebas de backend con Node 24.22.3. La base restaurada fue renombrada
  a `BDADP_CASINO` el 2026-11-17 y quedó disponible para la verificación de solo
  lectura. Queda por realizar la validación funcional con usuarios del ambiente.
