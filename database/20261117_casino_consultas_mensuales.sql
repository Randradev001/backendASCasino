SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @Calls TABLE (ProgCod smallint PRIMARY KEY, ProgNomGX varchar(100));
INSERT @Calls VALUES
  (1,'react.casinoReport.tipoProducto'),
  (2,'react.casinoReport.centroCosto'),
  (3,'react.casinoReport.persona'),
  (4,'react.casinoReport.motivo');

UPDATE P SET ProgNomGX=C.ProgNomGX,ProgTarget='_self'
FROM dbo.PROGRAM P JOIN @Calls C ON C.ProgCod=P.ProgCod
WHERE P.SistCod=55 AND P.Modcod=5;

COMMIT TRANSACTION;

SELECT SistCod,Modcod,ProgCod,RTRIM(ProgDes) ProgDes,RTRIM(ProgNomGX) ProgNomGX
FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=5 AND ProgCod BETWEEN 1 AND 4 ORDER BY ProgCod;
