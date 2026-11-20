SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.SSP06MATPProducto', 'TPPRAcceso') IS NULL
  ALTER TABLE dbo.SSP06MATPProducto ADD TPPRAcceso smallint NULL;

EXEC(N'UPDATE dbo.SSP06MATPProducto SET TPPRAcceso=0 WHERE TPPRAcceso IS NULL;');

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id=OBJECT_ID(N'dbo.SSP06MATPProducto')
    AND name=N'CK_SSP06MATPProducto_Acceso'
)
  EXEC(N'ALTER TABLE dbo.SSP06MATPProducto WITH CHECK
    ADD CONSTRAINT CK_SSP06MATPProducto_Acceso CHECK (TPPRAcceso IN (0,1));');

DECLARE @Programs TABLE (ProgCod decimal(10,0), ProgNomGX varchar(100));
INSERT INTO @Programs (ProgCod,ProgNomGX) VALUES
  (1,'react.casinoMaster.casinos'),
  (2,'react.casinoMaster.destinos'),
  (3,'react.casinoMaster.motivos'),
  (10,'react.casinoMaster.tiposProducto'),
  (11,'react.casinoMaster.productos');

UPDATE P
SET P.ProgNomGX=R.ProgNomGX,
    P.ProgTarget=''
FROM dbo.PROGRAM P
INNER JOIN @Programs R ON R.ProgCod=P.ProgCod
WHERE P.SistCod=55 AND P.Modcod=10;

COMMIT TRANSACTION;

EXEC(N'SELECT TPPRCod,RTRIM(TPPRNombre) TPPRNombre,TPPROrden,TPPRAcceso
  FROM dbo.SSP06MATPProducto ORDER BY TPPROrden,TPPRCod;');

SELECT P.SistCod,P.Modcod,P.ProgCod,RTRIM(P.ProgDes) Programa,RTRIM(P.ProgNomGX) Llamado
FROM dbo.PROGRAM P
WHERE P.SistCod=55 AND P.Modcod=10
ORDER BY P.ProgCod;
