SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.SSP06MAProducto', 'PRODImagen') IS NULL
  ALTER TABLE dbo.SSP06MAProducto ADD PRODImagen varbinary(max) NULL;

IF COL_LENGTH('dbo.SSP06MAProducto', 'PRODImagenMime') IS NULL
  ALTER TABLE dbo.SSP06MAProducto ADD PRODImagenMime varchar(50) NULL;

COMMIT TRANSACTION;

SELECT c.name, t.name AS tipo, c.max_length
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.SSP06MAProducto')
  AND c.name IN ('PRODImagen', 'PRODImagenMime')
ORDER BY c.column_id;
