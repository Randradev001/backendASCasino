/*
  Amplia una BDADP_CASINO ya creada con la ficha historica de Personas.
  La fuente debe estar adjunta en modo lectura como BDADP_PERSONAS_SOURCE.
*/
USE [BDADP_CASINO];
SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_ID(N'BDADP_PERSONAS_SOURCE') IS NULL
  THROW 51020, 'Debe adjuntar la copia fuente como BDADP_PERSONAS_SOURCE.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name=N'BDADP_PERSONAS_SOURCE' AND is_read_only=1)
  THROW 51021, 'BDADP_PERSONAS_SOURCE debe estar en modo READ_ONLY.', 1;

BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.FPGrupos', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FPGrupos (
    GECODEMP decimal(10,0) NOT NULL,
    GPId char(10) NOT NULL,
    GPDescripcion char(80) NOT NULL,
    CONSTRAINT PK_FPGrupos PRIMARY KEY (GECODEMP, GPId),
    CONSTRAINT FK_FPGrupos_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
  );
END;

IF OBJECT_ID(N'dbo.FPArea', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FPArea (
    GECODEMP decimal(10,0) NOT NULL,
    APId char(10) NOT NULL,
    APDescripcion char(80) NOT NULL,
    CONSTRAINT PK_FPArea PRIMARY KEY (GECODEMP, APId),
    CONSTRAINT FK_FPArea_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
  );
END;

IF OBJECT_ID(N'dbo.FPOrganiza', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FPOrganiza (
    GECODEMP decimal(10,0) NOT NULL,
    UOrId char(10) NOT NULL,
    UOrDescripcion char(80) NOT NULL,
    CONSTRAINT PK_FPOrganiza PRIMARY KEY (GECODEMP, UOrId),
    CONSTRAINT FK_FPOrganiza_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
  );
END;

IF OBJECT_ID(N'dbo.FPFuncion', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FPFuncion (
    GECODEMP decimal(10,0) NOT NULL,
    FunId char(10) NOT NULL,
    FunDescripcion char(80) NOT NULL,
    CONSTRAINT PK_FPFuncion PRIMARY KEY (GECODEMP, FunId),
    CONSTRAINT FK_FPFuncion_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
  );
END;

IF OBJECT_ID(N'dbo.FPSindicato', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.FPSindicato (
    GECODEMP decimal(10,0) NOT NULL,
    SindId decimal(10,0) NOT NULL,
    SinDesc char(80) NOT NULL,
    CONSTRAINT PK_FPSindicato PRIMARY KEY (GECODEMP, SindId),
    CONSTRAINT FK_FPSindicato_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
  );
END;

IF OBJECT_ID(N'dbo.CHTurnos', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CHTurnos (
    GECODEMP decimal(10,0) NOT NULL,
    TURCod char(10) NOT NULL,
    TURDesc char(30) NOT NULL,
    CONSTRAINT PK_CHTurnos PRIMARY KEY (GECODEMP, TURCod),
    CONSTRAINT FK_CHTurnos_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
  );
END;

INSERT INTO dbo.FPGrupos (GECODEMP, GPId, GPDescripcion)
SELECT S.GECODEMP, S.GPId, S.GPDescripcion
FROM BDADP_PERSONAS_SOURCE.dbo.FPGrupos S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.FPGrupos T WHERE T.GECODEMP=S.GECODEMP AND T.GPId=S.GPId);

INSERT INTO dbo.FPArea (GECODEMP, APId, APDescripcion)
SELECT S.GECODEMP, S.APId, S.APDescripcion
FROM BDADP_PERSONAS_SOURCE.dbo.FPArea S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.FPArea T WHERE T.GECODEMP=S.GECODEMP AND T.APId=S.APId);

INSERT INTO dbo.FPOrganiza (GECODEMP, UOrId, UOrDescripcion)
SELECT S.GECODEMP, S.UOrId, S.UOrDescripcion
FROM BDADP_PERSONAS_SOURCE.dbo.FPOrganiza S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.FPOrganiza T WHERE T.GECODEMP=S.GECODEMP AND T.UOrId=S.UOrId);

INSERT INTO dbo.FPFuncion (GECODEMP, FunId, FunDescripcion)
SELECT S.GECODEMP, S.FunId, S.FunDescripcion
FROM BDADP_PERSONAS_SOURCE.dbo.FPFuncion S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.FPFuncion T WHERE T.GECODEMP=S.GECODEMP AND T.FunId=S.FunId);

INSERT INTO dbo.FPSindicato (GECODEMP, SindId, SinDesc)
SELECT S.GECODEMP, S.SindId, S.SinDesc
FROM BDADP_PERSONAS_SOURCE.dbo.FPSindicato S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.FPSindicato T WHERE T.GECODEMP=S.GECODEMP AND T.SindId=S.SindId);

INSERT INTO dbo.CHTurnos (GECODEMP, TURCod, TURDesc)
SELECT S.GECODEMP, S.TURCod, S.TURDesc
FROM BDADP_PERSONAS_SOURCE.dbo.CHTurnos S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.CHTurnos T WHERE T.GECODEMP=S.GECODEMP AND T.TURCod=S.TURCod);

IF COL_LENGTH(N'dbo.FPPersonas', N'GPId') IS NULL ALTER TABLE dbo.FPPersonas ADD GPId char(10) NOT NULL CONSTRAINT DF_FPPersonas_GPId DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'APId') IS NULL ALTER TABLE dbo.FPPersonas ADD APId char(10) NOT NULL CONSTRAINT DF_FPPersonas_APId DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'UOrId') IS NULL ALTER TABLE dbo.FPPersonas ADD UOrId char(10) NOT NULL CONSTRAINT DF_FPPersonas_UOrId DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'FunId') IS NULL ALTER TABLE dbo.FPPersonas ADD FunId char(10) NOT NULL CONSTRAINT DF_FPPersonas_FunId DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerPosicionID') IS NULL ALTER TABLE dbo.FPPersonas ADD PerPosicionID decimal(10,0) NOT NULL CONSTRAINT DF_FPPersonas_PerPosicionID DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerPosicionDesc') IS NULL ALTER TABLE dbo.FPPersonas ADD PerPosicionDesc char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerPosicionDesc DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerDesde') IS NULL ALTER TABLE dbo.FPPersonas ADD PerDesde datetime NOT NULL CONSTRAINT DF_FPPersonas_PerDesde DEFAULT (CONVERT(datetime,'17530101',112)) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerHasta') IS NULL ALTER TABLE dbo.FPPersonas ADD PerHasta datetime NOT NULL CONSTRAINT DF_FPPersonas_PerHasta DEFAULT (CONVERT(datetime,'17530101',112)) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerFecha') IS NULL ALTER TABLE dbo.FPPersonas ADD PerFecha datetime NOT NULL CONSTRAINT DF_FPPersonas_PerFecha DEFAULT (CONVERT(datetime,'17530101',112)) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerTratamiento') IS NULL ALTER TABLE dbo.FPPersonas ADD PerTratamiento char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerTratamiento DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerSexo') IS NULL ALTER TABLE dbo.FPPersonas ADD PerSexo char(15) NOT NULL CONSTRAINT DF_FPPersonas_PerSexo DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerFechanac') IS NULL ALTER TABLE dbo.FPPersonas ADD PerFechanac datetime NOT NULL CONSTRAINT DF_FPPersonas_PerFechanac DEFAULT (CONVERT(datetime,'17530101',112)) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerNacionalidad') IS NULL ALTER TABLE dbo.FPPersonas ADD PerNacionalidad char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerNacionalidad DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerEstadoCivil') IS NULL ALTER TABLE dbo.FPPersonas ADD PerEstadoCivil char(15) NOT NULL CONSTRAINT DF_FPPersonas_PerEstadoCivil DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerHijos') IS NULL ALTER TABLE dbo.FPPersonas ADD PerHijos smallint NOT NULL CONSTRAINT DF_FPPersonas_PerHijos DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerDireccion') IS NULL ALTER TABLE dbo.FPPersonas ADD PerDireccion char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerDireccion DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerCalleynumero') IS NULL ALTER TABLE dbo.FPPersonas ADD PerCalleynumero char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerCalleynumero DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerComuna') IS NULL ALTER TABLE dbo.FPPersonas ADD PerComuna char(50) NOT NULL CONSTRAINT DF_FPPersonas_PerComuna DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerProvincia') IS NULL ALTER TABLE dbo.FPPersonas ADD PerProvincia char(50) NOT NULL CONSTRAINT DF_FPPersonas_PerProvincia DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerRegion') IS NULL ALTER TABLE dbo.FPPersonas ADD PerRegion char(50) NOT NULL CONSTRAINT DF_FPPersonas_PerRegion DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerPais') IS NULL ALTER TABLE dbo.FPPersonas ADD PerPais char(50) NOT NULL CONSTRAINT DF_FPPersonas_PerPais DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerTelefono') IS NULL ALTER TABLE dbo.FPPersonas ADD PerTelefono char(20) NOT NULL CONSTRAINT DF_FPPersonas_PerTelefono DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerTurno') IS NULL ALTER TABLE dbo.FPPersonas ADD PerTurno char(1) NOT NULL CONSTRAINT DF_FPPersonas_PerTurno DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'SindId') IS NULL ALTER TABLE dbo.FPPersonas ADD SindId decimal(10,0) NOT NULL CONSTRAINT DF_FPPersonas_SindId DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerFoto') IS NULL ALTER TABLE dbo.FPPersonas ADD PerFoto varbinary(max) NULL;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerJefe') IS NULL ALTER TABLE dbo.FPPersonas ADD PerJefe int NOT NULL CONSTRAINT DF_FPPersonas_PerJefe DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerGF') IS NULL ALTER TABLE dbo.FPPersonas ADD PerGF smallint NOT NULL CONSTRAINT DF_FPPersonas_PerGF DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerCeCID') IS NULL ALTER TABLE dbo.FPPersonas ADD PerCeCID char(10) NULL;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerCodConv') IS NULL ALTER TABLE dbo.FPPersonas ADD PerCodConv char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerCodConv DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerDescConv') IS NULL ALTER TABLE dbo.FPPersonas ADD PerDescConv char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerDescConv DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerCAFP') IS NULL ALTER TABLE dbo.FPPersonas ADD PerCAFP char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerCAFP DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerDescAFP') IS NULL ALTER TABLE dbo.FPPersonas ADD PerDescAFP char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerDescAFP DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerCISAPRE') IS NULL ALTER TABLE dbo.FPPersonas ADD PerCISAPRE char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerCISAPRE DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerDescISAPRE') IS NULL ALTER TABLE dbo.FPPersonas ADD PerDescISAPRE char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerDescISAPRE DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerCFonSolid') IS NULL ALTER TABLE dbo.FPPersonas ADD PerCFonSolid char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerCFonSolid DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerDescFonSolid') IS NULL ALTER TABLE dbo.FPPersonas ADD PerDescFonSolid char(80) NOT NULL CONSTRAINT DF_FPPersonas_PerDescFonSolid DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerTURCod') IS NULL ALTER TABLE dbo.FPPersonas ADD PerTURCod char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerTURCod DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'Perfallas') IS NULL ALTER TABLE dbo.FPPersonas ADD Perfallas smallint NOT NULL CONSTRAINT DF_FPPersonas_Perfallas DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'Perlicencias') IS NULL ALTER TABLE dbo.FPPersonas ADD Perlicencias smallint NOT NULL CONSTRAINT DF_FPPersonas_Perlicencias DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerNCartas') IS NULL ALTER TABLE dbo.FPPersonas ADD PerNCartas smallint NOT NULL CONSTRAINT DF_FPPersonas_PerNCartas DEFAULT (0) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerFecM') IS NULL ALTER TABLE dbo.FPPersonas ADD PerFecM datetime NOT NULL CONSTRAINT DF_FPPersonas_PerFecM DEFAULT (CONVERT(datetime,'17530101',112)) WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'PerLoginM') IS NULL ALTER TABLE dbo.FPPersonas ADD PerLoginM char(10) NOT NULL CONSTRAINT DF_FPPersonas_PerLoginM DEFAULT ('') WITH VALUES;
IF COL_LENGTH(N'dbo.FPPersonas', N'Percodigo') IS NULL ALTER TABLE dbo.FPPersonas ADD Percodigo smallint NULL;

EXEC sys.sp_executesql N'UPDATE T
SET T.PerDV=S.PerDV, T.PerPaterno=S.PerPaterno, T.PerMaterno=S.PerMaterno,
    T.Pernombre=S.Pernombre, T.PernombreCom=S.PernombreCom, T.GPId=S.GPId,
    T.APId=S.APId, T.DivId=S.DivId, T.SdiId=S.SdiId, T.UOrId=S.UOrId,
    T.CecId=S.CecId, T.FunId=S.FunId, T.PerPosicionID=S.PerPosicionID,
    T.PerPosicionDesc=S.PerPosicionDesc, T.PerDesde=S.PerDesde,
    T.PerHasta=S.PerHasta, T.PerFecha=S.PerFecha, T.PerTratamiento=S.PerTratamiento,
    T.PerSexo=S.PerSexo, T.PerFechanac=S.PerFechanac,
    T.PerNacionalidad=S.PerNacionalidad, T.PerEstadoCivil=S.PerEstadoCivil,
    T.PerHijos=S.PerHijos, T.PerDireccion=S.PerDireccion,
    T.PerCalleynumero=S.PerCalleynumero, T.PerComuna=S.PerComuna,
    T.PerProvincia=S.PerProvincia, T.PerRegion=S.PerRegion, T.PerPais=S.PerPais,
    T.PerTelefono=S.PerTelefono, T.PerTurno=S.PerTurno,
    T.PerEstadoLab=S.PerEstadoLab, T.SindId=S.SindId, T.PerFoto=S.PerFoto,
    T.PerJefe=S.PerJefe, T.PerAnexo=S.PerAnexo, T.PerGF=S.PerGF,
    T.PerCeCID=S.PerCeCID, T.PerCodConv=S.PerCodConv, T.PerDescConv=S.PerDescConv,
    T.PerCAFP=S.PerCAFP, T.PerDescAFP=S.PerDescAFP,
    T.PerCISAPRE=S.PerCISAPRE, T.PerDescISAPRE=S.PerDescISAPRE,
    T.PerCFonSolid=S.PerCFonSolid, T.PerDescFonSolid=S.PerDescFonSolid,
    T.PerTURCod=S.PerTURCod, T.Perfallas=S.Perfallas,
    T.Perlicencias=S.Perlicencias, T.PerNCartas=S.PerNCartas,
    T.PerFecM=S.PerFecM, T.PerLoginM=S.PerLoginM, T.PerEmail=S.PerEmail,
    T.Percodigo=S.Percodigo
FROM dbo.FPPersonas T
INNER JOIN BDADP_PERSONAS_SOURCE.dbo.FPPersonas S
  ON S.GECODEMP=T.GECODEMP AND S.PerRut=T.PerRut
WHERE S.GECODEMP=1;';

EXEC sys.sp_executesql N'INSERT INTO dbo.FPPersonas (
  GECODEMP, PerRut, PerDV, PerPaterno, PerMaterno, Pernombre, PernombreCom,
  GPId, APId, DivId, SdiId, UOrId, CecId, FunId, PerPosicionID,
  PerPosicionDesc, PerDesde, PerHasta, PerFecha, PerTratamiento, PerSexo,
  PerFechanac, PerNacionalidad, PerEstadoCivil, PerHijos, PerDireccion,
  PerCalleynumero, PerComuna, PerProvincia, PerRegion, PerPais, PerTelefono,
  PerTurno, PerEstadoLab, SindId, PerFoto, PerJefe, PerAnexo, PerGF,
  PerCeCID, PerCodConv, PerDescConv, PerCAFP, PerDescAFP, PerCISAPRE,
  PerDescISAPRE, PerCFonSolid, PerDescFonSolid, PerTURCod, Perfallas,
  Perlicencias, PerNCartas, PerFecM, PerLoginM, PerEmail, Percodigo
)
SELECT
  S.GECODEMP, S.PerRut, S.PerDV, S.PerPaterno, S.PerMaterno, S.Pernombre, S.PernombreCom,
  S.GPId, S.APId, S.DivId, S.SdiId, S.UOrId, S.CecId, S.FunId, S.PerPosicionID,
  S.PerPosicionDesc, S.PerDesde, S.PerHasta, S.PerFecha, S.PerTratamiento, S.PerSexo,
  S.PerFechanac, S.PerNacionalidad, S.PerEstadoCivil, S.PerHijos, S.PerDireccion,
  S.PerCalleynumero, S.PerComuna, S.PerProvincia, S.PerRegion, S.PerPais, S.PerTelefono,
  S.PerTurno, S.PerEstadoLab, S.SindId, S.PerFoto, S.PerJefe, S.PerAnexo, S.PerGF,
  S.PerCeCID, S.PerCodConv, S.PerDescConv, S.PerCAFP, S.PerDescAFP, S.PerCISAPRE,
  S.PerDescISAPRE, S.PerCFonSolid, S.PerDescFonSolid, S.PerTURCod, S.Perfallas,
  S.Perlicencias, S.PerNCartas, S.PerFecM, S.PerLoginM, S.PerEmail, S.Percodigo
FROM BDADP_PERSONAS_SOURCE.dbo.FPPersonas S
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.FPPersonas T WHERE T.GECODEMP=S.GECODEMP AND T.PerRut=S.PerRut);';

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_FPPersonas_EstadoLab')
  ALTER TABLE dbo.FPPersonas WITH CHECK ADD CONSTRAINT CK_FPPersonas_EstadoLab CHECK (PerEstadoLab IN (1,2));

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Grupo') EXEC(N'CREATE INDEX IX_FPPersonas_Grupo ON dbo.FPPersonas (GECODEMP, GPId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Area') EXEC(N'CREATE INDEX IX_FPPersonas_Area ON dbo.FPPersonas (GECODEMP, APId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Division') EXEC(N'CREATE INDEX IX_FPPersonas_Division ON dbo.FPPersonas (GECODEMP, DivId, SdiId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Organiza') EXEC(N'CREATE INDEX IX_FPPersonas_Organiza ON dbo.FPPersonas (GECODEMP, UOrId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_CenCos') EXEC(N'CREATE INDEX IX_FPPersonas_CenCos ON dbo.FPPersonas (GECODEMP, CecId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Funcion') EXEC(N'CREATE INDEX IX_FPPersonas_Funcion ON dbo.FPPersonas (GECODEMP, FunId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Sindicato') EXEC(N'CREATE INDEX IX_FPPersonas_Sindicato ON dbo.FPPersonas (GECODEMP, SindId)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Jefe') EXEC(N'CREATE INDEX IX_FPPersonas_Jefe ON dbo.FPPersonas (GECODEMP, PerJefe)');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.FPPersonas') AND name=N'IX_FPPersonas_Turno') EXEC(N'CREATE INDEX IX_FPPersonas_Turno ON dbo.FPPersonas (GECODEMP, PerTURCod)');

/* Seguridad del sistema 10, sin reemplazar credenciales ni cambios actuales. */
INSERT INTO dbo.SISTEMAS (SistCod, SistNombre, SistFecCrea, SistVersion)
SELECT S.SistCod, S.SistNombre, S.SistFecCrea, S.SistVersion
FROM BDADP_PERSONAS_SOURCE.dbo.Sistemas S
WHERE S.SistCod=10 AND NOT EXISTS (SELECT 1 FROM dbo.SISTEMAS T WHERE T.SistCod=S.SistCod);

INSERT INTO dbo.MODULOS (SistCod, Modcod, ModTipo, Modprg, ModDes, ModFcrea, ModVersion)
SELECT S.SistCod, S.Modcod, S.ModTipo, S.Modprg, S.ModDes, S.ModFcrea, S.ModVersion
FROM BDADP_PERSONAS_SOURCE.dbo.Modulos S
WHERE S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.MODULOS T WHERE T.SistCod=S.SistCod AND T.Modcod=S.Modcod);

INSERT INTO dbo.PROGRAM (SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget)
SELECT S.SistCod, S.Modcod, S.ProgCod, S.ProgDes, S.ProgFcrea, S.ProgTipo, S.ProgNomGX, S.ProgIDmenu, S.ProgTarget
FROM BDADP_PERSONAS_SOURCE.dbo.Program S
WHERE S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.PROGRAM T WHERE T.SistCod=S.SistCod AND T.Modcod=S.Modcod AND T.ProgCod=S.ProgCod);

INSERT INTO dbo.PROGRAM1 (SistCod, Modcod, ProgCod, ProgOPCod, ProgOPDes)
SELECT S.SistCod, S.Modcod, S.ProgCod, S.ProgOPCod, S.ProgOPDes
FROM BDADP_PERSONAS_SOURCE.dbo.Program1 S
WHERE S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.PROGRAM1 T WHERE T.SistCod=S.SistCod AND T.Modcod=S.Modcod AND T.ProgCod=S.ProgCod AND T.ProgOPCod=S.ProgOPCod);

CREATE TABLE #PersonasLogins (UsuLogin char(10) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY);

INSERT INTO #PersonasLogins (UsuLogin)
SELECT DISTINCT UsuLogin
FROM (
  SELECT AsgSisLogin UsuLogin FROM BDADP_PERSONAS_SOURCE.dbo.AsigSist WHERE GECODEMP=1 AND SistCod=10
  UNION SELECT AsigUsu FROM BDADP_PERSONAS_SOURCE.dbo.Asig WHERE GECODEMP=1 AND SistCod=10
  UNION SELECT UsuLogin FROM BDADP_PERSONAS_SOURCE.dbo.AsigProg WHERE GECODEMP=1 AND SistCod=10
) U;

INSERT INTO dbo.USUARIOS (
  UsuLogin, UsuClave, UsuRut, UsuDV, Usunom, UsuCargo, UsuExpira, usucrea,
  UsuNseg, UsuCorreo, UsuEstado, UsuPerfil, UsuTipo
)
SELECT U.UsuLogin, U.UsuClave, U.UsuRut, U.UsuDV, U.Usunom, U.UsuCargo,
       NULL, U.usucrea, 0, U.UsuCorreo, U.UsuEstado, U.UsuPerfil, U.UsuTipo
FROM BDADP_PERSONAS_SOURCE.dbo.Usuarios U
INNER JOIN #PersonasLogins L ON RTRIM(L.UsuLogin)=RTRIM(U.UsuLogin)
WHERE U.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.USUARIOS T WHERE RTRIM(T.UsuLogin)=RTRIM(U.UsuLogin));

INSERT INTO dbo.UROLES (ROLCod, ROLNombre, ROLFCrea, ROLUCrea)
SELECT S.ROLCod, S.ROLNombre, S.ROLFCrea, S.ROLUCrea
FROM BDADP_PERSONAS_SOURCE.dbo.UROLES S
WHERE NOT EXISTS (SELECT 1 FROM dbo.UROLES T WHERE RTRIM(T.ROLCod)=RTRIM(S.ROLCod));

INSERT INTO dbo.SEGUSUEMP (GECODEMP, UsuLogin, UsuEstado, UsuPerfil, UsuTipo, EsPrincipal, UsuCrea)
SELECT 1, U.UsuLogin, COALESCE(U.UsuEstado,1), U.UsuPerfil, COALESCE(U.UsuTipo,0), 1, 'MIGRACION'
FROM dbo.USUARIOS U
INNER JOIN #PersonasLogins L ON RTRIM(L.UsuLogin)=RTRIM(U.UsuLogin)
WHERE NOT EXISTS (SELECT 1 FROM dbo.SEGUSUEMP T WHERE T.GECODEMP=1 AND RTRIM(T.UsuLogin)=RTRIM(U.UsuLogin));

INSERT INTO dbo.URolesPorUser (GECODEMP, UsuLogin, ROLCod, RXUFecCrea)
SELECT S.GECODEMP, S.UsuLogin, S.ROLCod, S.RXUFecCrea
FROM BDADP_PERSONAS_SOURCE.dbo.URolesPorUser S
INNER JOIN #PersonasLogins L ON RTRIM(L.UsuLogin)=RTRIM(S.UsuLogin)
WHERE S.GECODEMP=1
  AND NOT EXISTS (SELECT 1 FROM dbo.URolesPorUser T WHERE T.GECODEMP=S.GECODEMP AND RTRIM(T.UsuLogin)=RTRIM(S.UsuLogin) AND RTRIM(T.ROLCod)=RTRIM(S.ROLCod));

INSERT INTO dbo.ASIGSIST (GECODEMP, AsgSisLogin, SistCod)
SELECT S.GECODEMP, S.AsgSisLogin, S.SistCod
FROM BDADP_PERSONAS_SOURCE.dbo.AsigSist S
WHERE S.GECODEMP IN (0,1) AND S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.ASIGSIST T WHERE T.GECODEMP=S.GECODEMP AND RTRIM(T.AsgSisLogin)=RTRIM(S.AsgSisLogin) AND T.SistCod=S.SistCod);

INSERT INTO dbo.ASIG (GECODEMP, AsigUsu, SistCod, AsigMod, AsigAsig)
SELECT S.GECODEMP, S.AsigUsu, S.SistCod, S.AsigMod, S.AsigAsig
FROM BDADP_PERSONAS_SOURCE.dbo.Asig S
WHERE S.GECODEMP IN (0,1) AND S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.ASIG T WHERE T.GECODEMP=S.GECODEMP AND RTRIM(T.AsigUsu)=RTRIM(S.AsigUsu) AND T.SistCod=S.SistCod AND T.AsigMod=S.AsigMod);

INSERT INTO dbo.ASIGPROG (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC)
SELECT S.GECODEMP, S.UsuLogin, S.SistCod, S.Modcod, S.ProgCod, S.ProgUsuC
FROM BDADP_PERSONAS_SOURCE.dbo.AsigProg S
WHERE S.GECODEMP IN (0,1) AND S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG T WHERE T.GECODEMP=S.GECODEMP AND RTRIM(T.UsuLogin)=RTRIM(S.UsuLogin) AND T.SistCod=S.SistCod AND T.Modcod=S.Modcod AND T.ProgCod=S.ProgCod);

INSERT INTO dbo.ASIGPROG1 (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgOPCod)
SELECT S.GECODEMP, S.UsuLogin, S.SistCod, S.Modcod, S.ProgCod, S.ProgOPCod
FROM BDADP_PERSONAS_SOURCE.dbo.AsigProg1 S
WHERE S.GECODEMP IN (0,1) AND S.SistCod=10
  AND NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG1 T WHERE T.GECODEMP=S.GECODEMP AND RTRIM(T.UsuLogin)=RTRIM(S.UsuLogin) AND T.SistCod=S.SistCod AND T.Modcod=S.Modcod AND T.ProgCod=S.ProgCod AND T.ProgOPCod=S.ProgOPCod);

DROP TABLE #PersonasLogins;

COMMIT TRANSACTION;

DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;

SELECT 'FPPersonas' Tabla, COUNT(*) Filas FROM dbo.FPPersonas
UNION ALL SELECT 'FPGrupos', COUNT(*) FROM dbo.FPGrupos
UNION ALL SELECT 'FPArea', COUNT(*) FROM dbo.FPArea
UNION ALL SELECT 'FPDivision', COUNT(*) FROM dbo.FPDivision
UNION ALL SELECT 'FPDivisionSub', COUNT(*) FROM dbo.FPDivisionSub
UNION ALL SELECT 'FPOrganiza', COUNT(*) FROM dbo.FPOrganiza
UNION ALL SELECT 'FPCenCos', COUNT(*) FROM dbo.FPCenCos
UNION ALL SELECT 'FPFuncion', COUNT(*) FROM dbo.FPFuncion
UNION ALL SELECT 'FPSindicato', COUNT(*) FROM dbo.FPSindicato
UNION ALL SELECT 'CHTurnos', COUNT(*) FROM dbo.CHTurnos;
