SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.PROGRAM
SET ProgNomGX='react.casinoReport.descargaGeneral'
  ,ProgTarget='_self'
WHERE SistCod=55 AND Modcod=5 AND ProgCod=5;

IF @@ROWCOUNT <> 1
  THROW 51000, 'No se encontro el programa 55/5/5 Descarga de Datos Pedidos.', 1;

COMMIT TRANSACTION;

SELECT SistCod,Modcod,ProgCod,RTRIM(ProgDes) ProgDes,RTRIM(ProgNomGX) ProgNomGX
FROM dbo.PROGRAM
WHERE SistCod=55 AND Modcod=5 AND ProgCod=5;
