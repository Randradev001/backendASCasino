# Panel BI de pedidos Casino

## Objetivo

Consolidar la lectura ejecutiva de pedidos para la administracion de Faenadora Rosario, Faenadora San Vicente y Faenadora Lo Miranda. El panel es de solo lectura y obtiene `GECODEMP` exclusivamente desde `req.context.empCod`.

## Origen GeneXus revisado

El XPZ `ProyectoADP-casino.xpz` contiene las consultas `SSP06ConsultaAnualTipoProducto`, `SSP06ConsultaAnualUbicacion` y `SSP06ConsultaAnualUsuario`. El catalogo `PROGRAM` del sistema 55, modulo 5, tambien identifica:

- 55/5/1: Pedidos por Tipo Producto.
- 55/5/2: Consumos por Centro Costo.
- 55/5/3: Consumos por Persona.
- 55/5/4: Pedidos por Motivo.
- 55/5/5: Descarga Datos Pedidos.

El endpoint `GET /casino/bi/pedidos` conserva el acceso operativo 55/1/1 y también
acepta cualquiera de los permisos de consulta 55/5/1 a 55/5/6, directos o heredados por
rol. El segundo dashboard histórico usa exclusivamente 55/5/6 y se publica en
`GET /casino/bi/historial`; su detalle usa `GET /casino/bi/pedidos/:numero`.

## Tablas y reglas

- Cabecera: `SSP06OPPedidosPlanta`.
- Nivel dos: `SSP06OPPedidosPlantaDet`; no se trata como maestro independiente.
- Descripciones: `SSP06MAProducto`, `SSP06MAMotivoPedidos`, `SSP06MACasinosPlanta`, `SSP06MADestinosPlanta`.
- Division: `FPDivision`, solo para describir y homologar la ubicacion de cada linea.
- Importe: `PED1Cantidad * PED1Precio`.
- Estados conservados: 0 pendiente, 1 enviado al casino, 2 en preparacion, 3 entregado y 5 anulado.

## Homologacion de faenadoras

La base actual asocia `D053`, `D054` y `D055` con Rosario. No existen divisiones identificadas como San Vicente o Lo Miranda. `D136` esta descrita como Faenadora El Milagro y se informa separadamente como dato no homologado; no se fuerza una equivalencia comercial sin confirmacion del negocio.

El panel mantiene visibles las tres faenadoras requeridas, incluso cuando una no tiene homologacion o datos. Los filtros aceptan `rosario`, `san-vicente` y `lo-miranda`, nunca una empresa enviada por el navegador.

## Salida ejecutiva

El servicio entrega KPI de pedidos, entrega, pendientes, anulaciones, unidades, importe,
ticket promedio y cumplimiento; comparativo por faenadora; tendencia mensual; estados;
productos; motivos y pedidos recientes. Además genera cuatro conclusiones rápidas sobre
cumplimiento, concentración por faenadora, producto líder y tendencia.

## Asistente de negocio sin costo de modelo

La primera versión del cuadro, presentado como `Asistente analítico de negocio`, no usa
ChatGPT ni un LLM. El backend produce respuestas
fundamentadas en los mismos agregados autorizados del panel y React clasifica preguntas
sobre cumplimiento, faenadoras, productos y tendencia. La alternativa evita costo por
tokens, exposición de información y alucinaciones, y mantiene abierta una integración
posterior con un modelo pequeño si el negocio necesita preguntas realmente abiertas.

Si el backend activo no contiene el objeto `assistant`, React deshabilita la entrada y
muestra que se debe actualizar o reiniciar el servicio; no deja un cuadro vacío ni un
botón que falle silenciosamente.

La administración de Seguridad sigue disponible bajo `/seguridad/*` para usuarios
autorizados, pero su resumen se retiró del panel ejecutivo para separar gestión técnica
de la lectura de negocio.

## Estado

- Backend BI: implementado y protegido.
- Homologacion Rosario: verificada contra la base.
- Homologacion San Vicente y Lo Miranda: pendiente de codigos oficiales.
- Frontend ejecutivo: implementado en `/dashboard/default`.
- Frontend histórico: implementado en `/casino/pedidos/historial` con filtros,
  paginación y detalle. La vista conserva gráfica y conclusión, pero omite KPI superiores
  y contadores visuales por tipo/producto para mantener una composición más limpia.
