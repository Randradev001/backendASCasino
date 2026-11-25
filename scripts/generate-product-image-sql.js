const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const imageDirectory = path.join(root, 'database', 'assets', 'product-images', '6100');
const outputFile = path.join(root, 'database', '20261124_casino_productos_imagen_6100_data.sql');

const images = fs.readdirSync(imageDirectory)
  .filter((name) => /^p\d+-.*\.jpg$/i.test(name))
  .map((name) => ({
    name,
    code: Number(name.match(/^p(\d+)-/i)[1]),
    bytes: fs.readFileSync(path.join(imageDirectory, name))
  }))
  .sort((left, right) => left.code - right.code);

if (images.length !== 48 || images.some((image, index) => image.code !== index + 1)) {
  throw new Error('Se requieren exactamente las imágenes P1 a P48.');
}

const sqlBinary = (bytes) => {
  const hex = bytes.toString('hex').toUpperCase();
  const chunks = hex.match(/.{1,8000}/g);
  return `CONVERT(varbinary(max),0x${chunks[0]})${chunks.slice(1).map((chunk) => ` +\n           0x${chunk}`).join('')}`;
};

const updates = images.map((image) => `
    UPDATE dbo.SSP06MAProducto
       SET PRODImagen=${sqlBinary(image.bytes)},
           PRODImagenMime='image/jpeg'
     WHERE GECODEMP=6100 AND PRODCodigoExterno='P${image.code}';`).join('\n');

const sql = `USE [BDADP_CASINO];
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;

BEGIN TRY
  BEGIN TRANSACTION;

  IF COL_LENGTH('dbo.SSP06MAProducto', 'PRODImagen') IS NULL
    ALTER TABLE dbo.SSP06MAProducto ADD PRODImagen varbinary(max) NULL;

  IF COL_LENGTH('dbo.SSP06MAProducto', 'PRODImagenMime') IS NULL
    ALTER TABLE dbo.SSP06MAProducto ADD PRODImagenMime varchar(50) NULL;

  IF (
    SELECT COUNT(*)
    FROM dbo.SSP06MAProducto
    WHERE GECODEMP=6100
      AND PRODCodigoExterno IN (${images.map((image) => `'P${image.code}'`).join(',')})
  ) <> 48
    THROW 50000, 'No se encontraron exactamente los productos P1 a P48 para la empresa 6100.', 1;
${updates}

  IF (
    SELECT COUNT(*)
    FROM dbo.SSP06MAProducto
    WHERE GECODEMP=6100
      AND PRODCodigoExterno IN (${images.map((image) => `'P${image.code}'`).join(',')})
      AND PRODImagen IS NOT NULL
      AND PRODImagenMime='image/jpeg'
  ) <> 48
    THROW 50000, 'La carga de imágenes no quedó completa.', 1;

  COMMIT TRANSACTION;
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;

SELECT GECODEMP, COUNT(*) AS ProductosConImagen,
       SUM(DATALENGTH(PRODImagen)) AS BytesImagenes
FROM dbo.SSP06MAProducto
WHERE GECODEMP=6100 AND PRODImagen IS NOT NULL
GROUP BY GECODEMP;
`;

fs.writeFileSync(outputFile, sql, 'utf8');
console.log(`Generado ${path.relative(root, outputFile)} con ${images.length} imágenes.`);
