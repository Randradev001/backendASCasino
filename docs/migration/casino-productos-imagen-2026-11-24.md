# Imagen en el maestro de productos

Fecha: 24 de noviembre de 2026.

## Propósito

El formulario React de `Productos de casino` permite cargar una imagen opcional tanto
en el alta como en la edición. Al editar se puede conservar, reemplazar o quitar la
imagen actual.

## Contrato y persistencia

- El programa y permiso se mantienen en 55/10/11.
- La empresa se obtiene únicamente de `req.context.empCod`.
- `POST /casino/maestros/productos` y `PUT /casino/maestros/productos/:id` aceptan
  `multipart/form-data`, con el archivo en `image` y los campos del producto como texto.
- Se admiten JPEG, PNG y WebP de hasta 2 MB. El backend comprueba MIME y firma binaria.
- `removeImage=true` quita una imagen existente durante la edición.
- `GET /casino/maestros/productos/:id/imagen` entrega el binario solo dentro de la
  empresa autenticada y bajo el mismo permiso.
- `GET /casino/pedidos/productos/:id/imagen` permite que un usuario con 55/1/1 vea la
  imagen en el catálogo de pedidos, siempre limitada a su empresa autenticada.
- `SSP06MAProducto.PRODImagen varbinary(max)` conserva el contenido y
  `PRODImagenMime varchar(50)` su tipo.

El esquema reproducible incluye las columnas y
`database/20261124_casino_productos_imagen.sql` las agrega de forma idempotente a una
base existente. No se usan nombres de archivo enviados por el navegador ni rutas
públicas compartidas.

## Carga inicial de San Vicente

Se generaron 48 imágenes JPEG cuadradas para los productos externos P1 a P48 de la
empresa 6100. Los archivos fuente quedan en
`database/assets/product-images/6100/` y el generador reproducible en
`scripts/generate-product-image-sql.js`.

`database/20261124_casino_productos_imagen_6100_data.sql` contiene los binarios y puede
ejecutarse directamente en SQL Server 2016. Es reejecutable, agrega las columnas si no
existen, valida los 48 códigos antes de actualizar y usa una transacción con rollback
ante cualquier diferencia.
