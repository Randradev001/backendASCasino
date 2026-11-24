SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_SSP06MASolicitante_Persona')
  ALTER TABLE dbo.SSP06MASolicitante DROP CONSTRAINT FK_SSP06MASolicitante_Persona;
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_SSP06OPPedidosPlanta_Persona')
  ALTER TABLE dbo.SSP06OPPedidosPlanta DROP CONSTRAINT FK_SSP06OPPedidosPlanta_Persona;

IF COL_LENGTH('dbo.SSP06MAProducto','ProdNombre') < 60
  ALTER TABLE dbo.SSP06MAProducto ALTER COLUMN ProdNombre varchar(60) NOT NULL;

IF COL_LENGTH('dbo.FPDivision','DivCodigoExterno') IS NULL
  ALTER TABLE dbo.FPDivision ADD DivCodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.FPDivisionSub','SdiCodigoExterno') IS NULL
  ALTER TABLE dbo.FPDivisionSub ADD SdiCodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.FPCenCos','CecCodigoExterno') IS NULL
  ALTER TABLE dbo.FPCenCos ADD CecCodigoExterno varchar(30) NULL;

EXEC(N'UPDATE dbo.FPDivision SET DivCodigoExterno=RTRIM(DivId) WHERE NULLIF(LTRIM(RTRIM(DivCodigoExterno)),'''') IS NULL;');
EXEC(N'UPDATE dbo.FPDivisionSub SET SdiCodigoExterno=CONCAT(RTRIM(DivId),''-'',RTRIM(SdiId)) WHERE NULLIF(LTRIM(RTRIM(SdiCodigoExterno)),'''') IS NULL;');
EXEC(N'UPDATE dbo.FPCenCos SET CecCodigoExterno=RTRIM(CecId) WHERE NULLIF(LTRIM(RTRIM(CecCodigoExterno)),'''') IS NULL;');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.FPDivision') AND name='UX_FPDivision_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_FPDivision_Externo ON dbo.FPDivision(GECODEMP,DivCodigoExterno) WHERE DivCodigoExterno IS NOT NULL;');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.FPDivisionSub') AND name='UX_FPDivisionSub_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_FPDivisionSub_Externo ON dbo.FPDivisionSub(GECODEMP,SdiCodigoExterno) WHERE SdiCodigoExterno IS NOT NULL;');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.FPCenCos') AND name='UX_FPCenCos_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_FPCenCos_Externo ON dbo.FPCenCos(GECODEMP,CecCodigoExterno) WHERE CecCodigoExterno IS NOT NULL;');

IF COL_LENGTH('dbo.SSP06MACasinosPlanta','CASICodigoExterno') IS NULL
  ALTER TABLE dbo.SSP06MACasinosPlanta ADD CASICodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.SSP06MACasinosPlanta','CASIActivo') IS NULL
  ALTER TABLE dbo.SSP06MACasinosPlanta ADD CASIActivo bit NOT NULL CONSTRAINT DF_SSP06MACasinosPlanta_Activo DEFAULT (1);

IF COL_LENGTH('dbo.SSP06MADestinosPlanta','DESTICodigoExterno') IS NULL
  ALTER TABLE dbo.SSP06MADestinosPlanta ADD DESTICodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.SSP06MADestinosPlanta','DESTIActivo') IS NULL
  ALTER TABLE dbo.SSP06MADestinosPlanta ADD DESTIActivo bit NOT NULL CONSTRAINT DF_SSP06MADestinosPlanta_Activo DEFAULT (1);

IF COL_LENGTH('dbo.SSP06MAMotivoPedidos','Mot6CodigoExterno') IS NULL
  ALTER TABLE dbo.SSP06MAMotivoPedidos ADD Mot6CodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.SSP06MAMotivoPedidos','Mot6Activo') IS NULL
  ALTER TABLE dbo.SSP06MAMotivoPedidos ADD Mot6Activo bit NOT NULL CONSTRAINT DF_SSP06MAMotivoPedidos_Activo DEFAULT (1);

IF COL_LENGTH('dbo.SSP06MATPProducto','TPPRCodigoExterno') IS NULL
  ALTER TABLE dbo.SSP06MATPProducto ADD TPPRCodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.SSP06MATPProducto','TPPRActivo') IS NULL
  ALTER TABLE dbo.SSP06MATPProducto ADD TPPRActivo bit NOT NULL CONSTRAINT DF_SSP06MATPProducto_Activo DEFAULT (1);

IF COL_LENGTH('dbo.SSP06MAProducto','PRODCodigoExterno') IS NULL
  ALTER TABLE dbo.SSP06MAProducto ADD PRODCodigoExterno varchar(30) NULL;
IF COL_LENGTH('dbo.SSP06MAProducto','PRODActivo') IS NULL
  ALTER TABLE dbo.SSP06MAProducto ADD PRODActivo bit NOT NULL CONSTRAINT DF_SSP06MAProducto_Activo DEFAULT (1);

EXEC(N'UPDATE dbo.SSP06MACasinosPlanta SET CASICodigoExterno=CONCAT(''LEGACY-'',CONVERT(varchar(20),CASICod)) WHERE NULLIF(LTRIM(RTRIM(CASICodigoExterno)),'''') IS NULL;');
EXEC(N'UPDATE dbo.SSP06MADestinosPlanta SET DESTICodigoExterno=CONCAT(''LEGACY-'',CONVERT(varchar(20),DESTICod)) WHERE NULLIF(LTRIM(RTRIM(DESTICodigoExterno)),'''') IS NULL;');
EXEC(N'UPDATE dbo.SSP06MAMotivoPedidos SET Mot6CodigoExterno=CONCAT(''LEGACY-'',CONVERT(varchar(20),Mot6Cod)) WHERE NULLIF(LTRIM(RTRIM(Mot6CodigoExterno)),'''') IS NULL;');
EXEC(N'UPDATE dbo.SSP06MATPProducto SET TPPRCodigoExterno=CONCAT(''LEGACY-'',CONVERT(varchar(20),TPPRCod)) WHERE NULLIF(LTRIM(RTRIM(TPPRCodigoExterno)),'''') IS NULL;');
EXEC(N'UPDATE dbo.SSP06MAProducto SET PRODCodigoExterno=CONCAT(''LEGACY-'',CONVERT(varchar(20),PRODCodigo)) WHERE NULLIF(LTRIM(RTRIM(PRODCodigoExterno)),'''') IS NULL;');

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.SSP06MACasinosPlanta') AND name='UX_SSP06MACasinosPlanta_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_SSP06MACasinosPlanta_Externo ON dbo.SSP06MACasinosPlanta(GECODEMP,CASICodigoExterno);');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.SSP06MADestinosPlanta') AND name='UX_SSP06MADestinosPlanta_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_SSP06MADestinosPlanta_Externo ON dbo.SSP06MADestinosPlanta(GECODEMP,DESTICodigoExterno);');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.SSP06MAMotivoPedidos') AND name='UX_SSP06MAMotivoPedidos_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_SSP06MAMotivoPedidos_Externo ON dbo.SSP06MAMotivoPedidos(GECODEMP,Mot6CodigoExterno);');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.SSP06MATPProducto') AND name='UX_SSP06MATPProducto_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_SSP06MATPProducto_Externo ON dbo.SSP06MATPProducto(GECODEMP,TPPRCodigoExterno);');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.SSP06MAProducto') AND name='UX_SSP06MAProducto_Externo')
  EXEC(N'CREATE UNIQUE INDEX UX_SSP06MAProducto_Externo ON dbo.SSP06MAProducto(GECODEMP,PRODCodigoExterno);');

IF OBJECT_ID('dbo.SSP06MASolicitante','U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06MASolicitante (
    SOLId bigint IDENTITY(1,1) NOT NULL,
    GECODEMP decimal(10,0) NOT NULL,
    SOLCodigoExterno varchar(30) NOT NULL,
    SOLRut int NOT NULL,
    SOLLogin char(10) NOT NULL,
    SOLNombres varchar(40) NOT NULL,
    SOLApellidoPaterno varchar(40) NOT NULL,
    SOLApellidoMaterno varchar(40) NOT NULL CONSTRAINT DF_SSP06MASolicitante_Materno DEFAULT (''),
    SOLEmail varchar(50) NOT NULL,
    DivId char(10) NOT NULL,
    SdiId char(10) NOT NULL,
    CecId char(10) NOT NULL,
    SOLActivo bit NOT NULL CONSTRAINT DF_SSP06MASolicitante_Activo DEFAULT (1),
    SOLFechaCrea datetime2(0) NOT NULL CONSTRAINT DF_SSP06MASolicitante_FechaCrea DEFAULT (SYSUTCDATETIME()),
    SOLFechaModifica datetime2(0) NOT NULL CONSTRAINT DF_SSP06MASolicitante_FechaModifica DEFAULT (SYSUTCDATETIME()),
    SOLUsuarioModifica char(10) NOT NULL,
    CONSTRAINT PK_SSP06MASolicitante PRIMARY KEY (GECODEMP,SOLId),
    CONSTRAINT UQ_SSP06MASolicitante_Codigo UNIQUE (GECODEMP,SOLCodigoExterno),
    CONSTRAINT UQ_SSP06MASolicitante_Rut UNIQUE (GECODEMP,SOLRut),
    CONSTRAINT FK_SSP06MASolicitante_Empresa FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp(GECODEMP),
    CONSTRAINT FK_SSP06MASolicitante_Usuario FOREIGN KEY (GECODEMP,SOLLogin) REFERENCES dbo.SEGUSUEMP(GECODEMP,UsuLogin),
    CONSTRAINT FK_SSP06MASolicitante_Division FOREIGN KEY (GECODEMP,DivId) REFERENCES dbo.FPDivision(GECODEMP,DivId),
    CONSTRAINT FK_SSP06MASolicitante_Subdivision FOREIGN KEY (GECODEMP,DivId,SdiId) REFERENCES dbo.FPDivisionSub(GECODEMP,DivId,SdiId),
    CONSTRAINT FK_SSP06MASolicitante_CentroCosto FOREIGN KEY (GECODEMP,CecId) REFERENCES dbo.FPCenCos(GECODEMP,CecId)
  );
  CREATE INDEX IX_SSP06MASolicitante_Email ON dbo.SSP06MASolicitante(GECODEMP,SOLEmail);
END;

IF OBJECT_ID('dbo.SSP06OPCargaCasino','U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06OPCargaCasino (
    CARId bigint IDENTITY(1,1) NOT NULL PRIMARY KEY,
    GECODEMP decimal(10,0) NOT NULL,
    CARArchivo varchar(255) NOT NULL,
    CARResumen nvarchar(max) NOT NULL,
    CARUsuario char(10) NOT NULL,
    CARFecha datetime2(0) NOT NULL CONSTRAINT DF_SSP06OPCargaCasino_Fecha DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_SSP06OPCargaCasino_Empresa FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp(GECODEMP)
  );
END;

EXEC(N'CREATE OR ALTER VIEW dbo.SSP06VWSolicitanteHistorico AS
  SELECT S.GECODEMP,S.SOLRut PerRut,U.UsuDV PerDV,
    CONVERT(varchar(130),LTRIM(RTRIM(CONCAT(S.SOLNombres,'' '',S.SOLApellidoPaterno,'' '',S.SOLApellidoMaterno)))) PernombreCom,
    CONVERT(varchar(50),S.SOLEmail) PerEmail,S.DivId,S.SdiId,S.CecId,CASE WHEN S.SOLActivo=1 THEN 1 ELSE 2 END PerEstadoLab
  FROM dbo.SSP06MASolicitante S
  INNER JOIN dbo.USUARIOS U ON RTRIM(U.UsuLogin)=RTRIM(S.SOLLogin)
  UNION ALL
  SELECT P.GECODEMP,P.PerRut,P.PerDV,CONVERT(varchar(130),RTRIM(P.PernombreCom)),CONVERT(varchar(50),RTRIM(P.PerEmail)),P.DivId,P.SdiId,P.CecId,P.PerEstadoLab
  FROM dbo.FPPersonas P
  WHERE NOT EXISTS (SELECT 1 FROM dbo.SSP06MASolicitante S WHERE S.GECODEMP=P.GECODEMP AND S.SOLRut=P.PerRut);');

IF NOT EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=10 AND ProgCod=12)
  INSERT dbo.PROGRAM(SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget)
  VALUES(55,10,12,'Solicitantes',GETDATE(),1,'react.casinoMaster.solicitantes','ID551012','');
ELSE
  UPDATE dbo.PROGRAM SET ProgDes='Solicitantes',ProgNomGX='react.casinoMaster.solicitantes',ProgTarget=''
  WHERE SistCod=55 AND Modcod=10 AND ProgCod=12;

IF NOT EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=10 AND ProgCod=13)
  INSERT dbo.PROGRAM(SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget)
  VALUES(55,10,13,'Centro de cargas',GETDATE(),1,'react.casinoLoad.center','ID551013','');
ELSE
  UPDATE dbo.PROGRAM SET ProgDes='Centro de cargas',ProgNomGX='react.casinoLoad.center',ProgTarget=''
  WHERE SistCod=55 AND Modcod=10 AND ProgCod=13;

IF EXISTS (SELECT 1 FROM dbo.UROLES WHERE RTRIM(ROLCod)='ADMINFULL')
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG WHERE GECODEMP=0 AND RTRIM(UsuLogin)='ADMINFULL' AND SistCod=55 AND Modcod=10 AND ProgCod=12)
    INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC) VALUES(0,'ADMINFULL',55,10,12,'MIGRACION');
  IF NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG WHERE GECODEMP=0 AND RTRIM(UsuLogin)='ADMINFULL' AND SistCod=55 AND Modcod=10 AND ProgCod=13)
    INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC) VALUES(0,'ADMINFULL',55,10,13,'MIGRACION');
IF NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG WHERE GECODEMP=0 AND RTRIM(UsuLogin)='CAS_USER' AND SistCod=55 AND Modcod=1 AND ProgCod=91)
    INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC) VALUES(0,'CAS_USER',55,1,91,'MIGRACION');
END;

COMMIT TRANSACTION;

SELECT
  OBJECT_ID('dbo.SSP06MASolicitante') Solicitantes,
  OBJECT_ID('dbo.SSP06OPCargaCasino') Cargas,
  (SELECT COUNT(*) FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=10 AND ProgCod IN (12,13)) Programas;
GO
