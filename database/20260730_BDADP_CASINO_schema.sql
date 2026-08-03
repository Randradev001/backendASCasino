/*
  Base independiente para la migracion de SSP06 Casino y su ficha de Personas.

  Conserva los nombres fisicos GeneXus de ambos modulos y la seguridad vigente.
  DEFEMP es una vista de compatibilidad: Seguridad consume EmpCod mientras
  Casino y la fuente ADP conservan GECODEMP.
*/
USE [master];
GO

IF DB_ID(N'BDADP_CASINO') IS NULL
BEGIN
  CREATE DATABASE [BDADP_CASINO] COLLATE Modern_Spanish_CI_AS;
END;
GO

ALTER DATABASE [BDADP_CASINO] SET RECOVERY SIMPLE;
GO

USE [BDADP_CASINO];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.G_Emp', N'U') IS NOT NULL
BEGIN
  PRINT 'El esquema BDADP_CASINO ya existe.';
  RETURN;
END;

BEGIN TRANSACTION;

/* Empresa ADP. DEFEMP se publica mas abajo como vista de homologacion. */
CREATE TABLE dbo.G_Emp (
  GECODEMP decimal(10,0) NOT NULL,
  GERAZSOC char(50) NOT NULL,
  GEgiro1 char(40) NOT NULL,
  GErut int NOT NULL,
  GEDv char(1) NOT NULL,
  GEdire char(50) NOT NULL,
  GEregion char(25) NOT NULL,
  GeComuna char(25) NOT NULL,
  GeEstado smallint NOT NULL,
  CONSTRAINT PK_G_Emp PRIMARY KEY (GECODEMP)
);

/* Catalogos propios de Personas. No corresponden a maestros fruticolas CONEX. */
CREATE TABLE dbo.FPGrupos (
  GECODEMP decimal(10,0) NOT NULL,
  GPId char(10) NOT NULL,
  GPDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPGrupos PRIMARY KEY (GECODEMP, GPId),
  CONSTRAINT FK_FPGrupos_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPArea (
  GECODEMP decimal(10,0) NOT NULL,
  APId char(10) NOT NULL,
  APDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPArea PRIMARY KEY (GECODEMP, APId),
  CONSTRAINT FK_FPArea_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPDivision (
  GECODEMP decimal(10,0) NOT NULL,
  DivId char(10) NOT NULL,
  DivDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPDivision PRIMARY KEY (GECODEMP, DivId),
  CONSTRAINT FK_FPDivision_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPDivisionSub (
  GECODEMP decimal(10,0) NOT NULL,
  DivId char(10) NOT NULL,
  SdiId char(10) NOT NULL,
  SdiDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPDivisionSub PRIMARY KEY (GECODEMP, DivId, SdiId),
  CONSTRAINT FK_FPDivisionSub_FPDivision FOREIGN KEY (GECODEMP, DivId)
    REFERENCES dbo.FPDivision (GECODEMP, DivId)
);

CREATE TABLE dbo.FPOrganiza (
  GECODEMP decimal(10,0) NOT NULL,
  UOrId char(10) NOT NULL,
  UOrDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPOrganiza PRIMARY KEY (GECODEMP, UOrId),
  CONSTRAINT FK_FPOrganiza_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPCenCos (
  GECODEMP decimal(10,0) NOT NULL,
  CecId char(10) NOT NULL,
  CecDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPCenCos PRIMARY KEY (GECODEMP, CecId),
  CONSTRAINT FK_FPCenCos_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPFuncion (
  GECODEMP decimal(10,0) NOT NULL,
  FunId char(10) NOT NULL,
  FunDescripcion char(80) NOT NULL,
  CONSTRAINT PK_FPFuncion PRIMARY KEY (GECODEMP, FunId),
  CONSTRAINT FK_FPFuncion_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPSindicato (
  GECODEMP decimal(10,0) NOT NULL,
  SindId decimal(10,0) NOT NULL,
  SinDesc char(80) NOT NULL,
  CONSTRAINT PK_FPSindicato PRIMARY KEY (GECODEMP, SindId),
  CONSTRAINT FK_FPSindicato_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

/* Referencia externa usada por el subtipo PerTURCod de la ficha. */
CREATE TABLE dbo.CHTurnos (
  GECODEMP decimal(10,0) NOT NULL,
  TURCod char(10) NOT NULL,
  TURDesc char(30) NOT NULL,
  CONSTRAINT PK_CHTurnos PRIMARY KEY (GECODEMP, TURCod),
  CONSTRAINT FK_CHTurnos_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.FPPersonas (
  GECODEMP decimal(10,0) NOT NULL,
  PerRut int NOT NULL,
  PerDV char(1) NOT NULL,
  PerPaterno char(40) NOT NULL,
  PerMaterno char(40) NOT NULL,
  Pernombre char(40) NOT NULL,
  PernombreCom char(130) NOT NULL,
  GPId char(10) NOT NULL,
  APId char(10) NOT NULL,
  DivId char(10) NOT NULL,
  SdiId char(10) NOT NULL,
  UOrId char(10) NOT NULL,
  CecId char(10) NOT NULL,
  FunId char(10) NOT NULL,
  PerPosicionID decimal(10,0) NOT NULL,
  PerPosicionDesc char(80) NOT NULL,
  PerDesde datetime NOT NULL,
  PerHasta datetime NOT NULL,
  PerFecha datetime NOT NULL,
  PerTratamiento char(10) NOT NULL,
  PerSexo char(15) NOT NULL,
  PerFechanac datetime NOT NULL,
  PerNacionalidad char(80) NOT NULL,
  PerEstadoCivil char(15) NOT NULL,
  PerHijos smallint NOT NULL,
  PerDireccion char(80) NOT NULL,
  PerCalleynumero char(80) NOT NULL,
  PerComuna char(50) NOT NULL,
  PerProvincia char(50) NOT NULL,
  PerRegion char(50) NOT NULL,
  PerPais char(50) NOT NULL,
  PerTelefono char(20) NOT NULL,
  PerTurno char(1) NOT NULL,
  PerEstadoLab smallint NOT NULL,
  SindId decimal(10,0) NOT NULL,
  PerFoto varbinary(max) NULL,
  PerJefe int NOT NULL,
  PerAnexo char(8) NOT NULL,
  PerGF smallint NOT NULL,
  PerCeCID char(10) NULL,
  PerCodConv char(10) NOT NULL,
  PerDescConv char(80) NOT NULL,
  PerCAFP char(10) NOT NULL,
  PerDescAFP char(80) NOT NULL,
  PerCISAPRE char(10) NOT NULL,
  PerDescISAPRE char(80) NOT NULL,
  PerCFonSolid char(10) NOT NULL,
  PerDescFonSolid char(80) NOT NULL,
  PerTURCod char(10) NOT NULL,
  Perfallas smallint NOT NULL,
  Perlicencias smallint NOT NULL,
  PerNCartas smallint NOT NULL,
  PerFecM datetime NOT NULL,
  PerLoginM char(10) NOT NULL,
  PerEmail char(50) NOT NULL,
  Percodigo smallint NULL,
  CONSTRAINT PK_FPPersonas PRIMARY KEY (GECODEMP, PerRut),
  CONSTRAINT FK_FPPersonas_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP),
  CONSTRAINT CK_FPPersonas_EstadoLab CHECK (PerEstadoLab IN (1, 2))
);

CREATE INDEX IX_FPPersonas_Nombre ON dbo.FPPersonas (GECODEMP, PernombreCom);
CREATE INDEX IX_FPPersonas_Grupo ON dbo.FPPersonas (GECODEMP, GPId);
CREATE INDEX IX_FPPersonas_Area ON dbo.FPPersonas (GECODEMP, APId);
CREATE INDEX IX_FPPersonas_Division ON dbo.FPPersonas (GECODEMP, DivId, SdiId);
CREATE INDEX IX_FPPersonas_Organiza ON dbo.FPPersonas (GECODEMP, UOrId);
CREATE INDEX IX_FPPersonas_CenCos ON dbo.FPPersonas (GECODEMP, CecId);
CREATE INDEX IX_FPPersonas_Funcion ON dbo.FPPersonas (GECODEMP, FunId);
CREATE INDEX IX_FPPersonas_Sindicato ON dbo.FPPersonas (GECODEMP, SindId);
CREATE INDEX IX_FPPersonas_Jefe ON dbo.FPPersonas (GECODEMP, PerJefe);
CREATE INDEX IX_FPPersonas_Turno ON dbo.FPPersonas (GECODEMP, PerTURCod);

/* Maestros propios de Casino. */
CREATE TABLE dbo.SSP06MACasinosPlanta (
  GECODEMP decimal(10,0) NOT NULL,
  CASICod decimal(10,0) NOT NULL,
  CASINom char(40) NOT NULL,
  CASIDV char(1) NOT NULL,
  CASIRut int NOT NULL,
  CASIEmail char(50) NOT NULL,
  CONSTRAINT PK_SSP06MACasinosPlanta PRIMARY KEY (GECODEMP, CASICod),
  CONSTRAINT FK_SSP06MACasinosPlanta_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.SSP06MADestinosPlanta (
  GECODEMP decimal(10,0) NOT NULL,
  DESTICod decimal(10,0) NOT NULL,
  DESTINom char(40) NOT NULL,
  CONSTRAINT PK_SSP06MADestinosPlanta PRIMARY KEY (GECODEMP, DESTICod),
  CONSTRAINT FK_SSP06MADestinosPlanta_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.SSP06MAMotivoPedidos (
  GECODEMP decimal(10,0) NOT NULL,
  Mot6Cod smallint NOT NULL,
  Mot6Descrip char(40) NOT NULL,
  CONSTRAINT PK_SSP06MAMotivoPedidos PRIMARY KEY (GECODEMP, Mot6Cod),
  CONSTRAINT FK_SSP06MAMotivoPedidos_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.SSP06MATPProducto (
  GECODEMP decimal(10,0) NOT NULL,
  TPPRCod decimal(10,0) NOT NULL,
  TPPRNombre char(40) NOT NULL,
  TPPROrden smallint NOT NULL,
  CONSTRAINT PK_SSP06MATPProducto PRIMARY KEY (GECODEMP, TPPRCod),
  CONSTRAINT FK_SSP06MATPProducto_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP)
);

CREATE TABLE dbo.SSP06MAProducto (
  GECODEMP decimal(10,0) NOT NULL,
  PRODCodigo decimal(10,0) NOT NULL,
  TPPRCod decimal(10,0) NOT NULL,
  ProdNombre char(40) NOT NULL,
  PRODPrecio decimal(10,0) NOT NULL,
  CASICod decimal(10,0) NOT NULL,
  CONSTRAINT PK_SSP06MAProducto PRIMARY KEY (GECODEMP, PRODCodigo),
  CONSTRAINT FK_SSP06MAProducto_Tipo FOREIGN KEY (GECODEMP, TPPRCod)
    REFERENCES dbo.SSP06MATPProducto (GECODEMP, TPPRCod),
  CONSTRAINT FK_SSP06MAProducto_Casino FOREIGN KEY (GECODEMP, CASICod)
    REFERENCES dbo.SSP06MACasinosPlanta (GECODEMP, CASICod),
  CONSTRAINT CK_SSP06MAProducto_Precio CHECK (PRODPrecio >= 0)
);

CREATE INDEX IX_SSP06MAProducto_Tipo ON dbo.SSP06MAProducto (GECODEMP, TPPRCod);
CREATE INDEX IX_SSP06MAProducto_Casino ON dbo.SSP06MAProducto (GECODEMP, CASICod);

/* Cabecera y segundo nivel de la transaccion SSP06OPPedidosPlanta. */
CREATE TABLE dbo.SSP06OPPedidosPlanta (
  GECODEMP decimal(10,0) NOT NULL,
  PEDNumero decimal(10,0) NOT NULL,
  PEDDescripcion char(400) NOT NULL,
  PEDFechaCrea datetime NOT NULL,
  DESTICod decimal(10,0) NOT NULL,
  CASICod decimal(10,0) NOT NULL,
  PEDSolicita char(10) NOT NULL,
  PedEstadoIngreso smallint NOT NULL,
  PedMM smallint NOT NULL,
  PedAA smallint NOT NULL,
  pedfechaEntrega datetime NOT NULL,
  PedAAEntrega smallint NOT NULL,
  PedMMEntrega smallint NOT NULL,
  Mot6Cod smallint NOT NULL,
  PedHHEntrega datetime NOT NULL,
  PedRutSolicita int NOT NULL,
  PEDSwCorreo smallint NOT NULL,
  PEDControlPago smallint NOT NULL,
  CONSTRAINT PK_SSP06OPPedidosPlanta PRIMARY KEY (GECODEMP, PEDNumero),
  CONSTRAINT FK_SSP06OPPedidosPlanta_Destino FOREIGN KEY (GECODEMP, DESTICod)
    REFERENCES dbo.SSP06MADestinosPlanta (GECODEMP, DESTICod),
  CONSTRAINT FK_SSP06OPPedidosPlanta_Casino FOREIGN KEY (GECODEMP, CASICod)
    REFERENCES dbo.SSP06MACasinosPlanta (GECODEMP, CASICod),
  CONSTRAINT FK_SSP06OPPedidosPlanta_Motivo FOREIGN KEY (GECODEMP, Mot6Cod)
    REFERENCES dbo.SSP06MAMotivoPedidos (GECODEMP, Mot6Cod),
  CONSTRAINT FK_SSP06OPPedidosPlanta_Persona FOREIGN KEY (GECODEMP, PedRutSolicita)
    REFERENCES dbo.FPPersonas (GECODEMP, PerRut),
  CONSTRAINT CK_SSP06OPPedidosPlanta_Estado CHECK (PedEstadoIngreso IN (0, 1, 2, 3, 5)),
  CONSTRAINT CK_SSP06OPPedidosPlanta_Pago CHECK (PEDControlPago IN (0, 1, 2))
);

CREATE INDEX IX_SSP06OPPedidosPlanta_Casino ON dbo.SSP06OPPedidosPlanta (GECODEMP, CASICod);
CREATE INDEX IX_SSP06OPPedidosPlanta_Destino ON dbo.SSP06OPPedidosPlanta (GECODEMP, DESTICod);
CREATE INDEX IX_SSP06OPPedidosPlanta_Motivo ON dbo.SSP06OPPedidosPlanta (GECODEMP, Mot6Cod);
CREATE INDEX IX_SSP06OPPedidosPlanta_Entrega ON dbo.SSP06OPPedidosPlanta (GECODEMP, pedfechaEntrega);

CREATE TABLE dbo.SSP06OPPedidosPlantaDet (
  GECODEMP decimal(10,0) NOT NULL,
  PEDNumero decimal(10,0) NOT NULL,
  PRODCodigo decimal(10,0) NOT NULL,
  PED1Precio decimal(10,0) NOT NULL,
  PED1Cantidad smallint NOT NULL,
  PED1FechaEnt datetime NOT NULL,
  DivId char(10) NOT NULL,
  SdiId char(10) NOT NULL,
  CecId char(10) NOT NULL,
  CONSTRAINT PK_SSP06OPPedidosPlantaDet PRIMARY KEY (GECODEMP, PEDNumero, PRODCodigo),
  CONSTRAINT FK_SSP06OPPedidosPlantaDet_Pedido FOREIGN KEY (GECODEMP, PEDNumero)
    REFERENCES dbo.SSP06OPPedidosPlanta (GECODEMP, PEDNumero) ON DELETE CASCADE,
  CONSTRAINT FK_SSP06OPPedidosPlantaDet_Producto FOREIGN KEY (GECODEMP, PRODCodigo)
    REFERENCES dbo.SSP06MAProducto (GECODEMP, PRODCodigo),
  CONSTRAINT FK_SSP06OPPedidosPlantaDet_Division FOREIGN KEY (GECODEMP, DivId)
    REFERENCES dbo.FPDivision (GECODEMP, DivId),
  CONSTRAINT FK_SSP06OPPedidosPlantaDet_Subdivision FOREIGN KEY (GECODEMP, DivId, SdiId)
    REFERENCES dbo.FPDivisionSub (GECODEMP, DivId, SdiId),
  CONSTRAINT FK_SSP06OPPedidosPlantaDet_CentroCosto FOREIGN KEY (GECODEMP, CecId)
    REFERENCES dbo.FPCenCos (GECODEMP, CecId),
  CONSTRAINT CK_SSP06OPPedidosPlantaDet_Precio CHECK (PED1Precio >= 0),
  CONSTRAINT CK_SSP06OPPedidosPlantaDet_Cantidad CHECK (PED1Cantidad > 0)
);

CREATE INDEX IX_SSP06OPPedidosPlantaDet_Producto ON dbo.SSP06OPPedidosPlantaDet (GECODEMP, PRODCodigo);
CREATE INDEX IX_SSP06OPPedidosPlantaDet_CentroCosto ON dbo.SSP06OPPedidosPlantaDet (GECODEMP, CecId);
CREATE INDEX IX_SSP06OPPedidosPlantaDet_Ubicacion ON dbo.SSP06OPPedidosPlantaDet (GECODEMP, DivId, SdiId);

CREATE TABLE dbo.SSP06OPEvalPedidoCasino (
  GECODEMP decimal(10,0) NOT NULL,
  EVPedCod int NOT NULL,
  PEDNumero decimal(10,0) NOT NULL,
  PEDCodigo int NOT NULL,
  EVPedObservacionCasino char(200) NOT NULL,
  EVPedEvaluacion smallint NOT NULL,
  EVPEDFecha datetime NOT NULL,
  EVPEDTipo smallint NOT NULL,
  EVPEDOBSCasino char(200) NOT NULL,
  EvPedObsUsuario char(200) NOT NULL,
  CONSTRAINT PK_SSP06OPEvalPedidoCasino PRIMARY KEY (GECODEMP, EVPedCod, PEDNumero),
  CONSTRAINT FK_SSP06OPEvalPedidoCasino_Pedido FOREIGN KEY (GECODEMP, PEDNumero)
    REFERENCES dbo.SSP06OPPedidosPlanta (GECODEMP, PEDNumero),
  CONSTRAINT CK_SSP06OPEvalPedidoCasino_Evaluacion CHECK (EVPedEvaluacion IN (0, 1, 2, 3))
);

CREATE INDEX IX_SSP06OPEvalPedidoCasino_Pedido ON dbo.SSP06OPEvalPedidoCasino (GECODEMP, PEDNumero);

/* Correlativo y cola de correo usados por el modulo original. */
CREATE TABLE dbo.MACorrelativos (
  GECODEMP decimal(10,0) NOT NULL,
  CRRID char(10) NOT NULL,
  CRRNum decimal(10,0) NOT NULL,
  CONSTRAINT PK_MACorrelativos PRIMARY KEY (GECODEMP, CRRID)
);

CREATE TABLE dbo.MailFormatos (
  GECODEMP decimal(10,0) NOT NULL,
  MForCod char(10) NOT NULL,
  MForAsunto char(200) NOT NULL,
  MForContenido varchar(400) NOT NULL,
  CONSTRAINT PK_MailFormatos PRIMARY KEY (GECODEMP, MForCod)
);

CREATE TABLE dbo.MailEnvios (
  GECODEMP decimal(10,0) NOT NULL,
  MailID decimal(10,0) NOT NULL,
  MailORG char(20) NOT NULL,
  MailEmite char(100) NOT NULL,
  MailAsunto char(200) NOT NULL,
  MailContenido varchar(max) NULL,
  MailDestino char(1000) NOT NULL,
  MailSWCopia smallint NOT NULL,
  MailCopia char(100) NOT NULL,
  MailFechIns datetime NOT NULL,
  MailFechEnv datetime NOT NULL,
  MailEstado smallint NOT NULL,
  MailMsg char(100) NOT NULL,
  MailAdjunto smallint NOT NULL,
  MailNomAdjunto char(100) NOT NULL,
  MailDato1 decimal(10,0) NOT NULL,
  CONSTRAINT PK_MailEnvios PRIMARY KEY (GECODEMP, MailID)
);

/* Seguridad: se conserva el modelo actual del backend, sin maestros CONEX. */
CREATE TABLE dbo.SISTEMAS (
  SistCod smallint NOT NULL,
  SistNombre char(40) NULL,
  SistFecCrea datetime NULL,
  SistVersion smallint NULL,
  SistFAIcons varchar(30) NULL,
  CONSTRAINT PK_SISTEMAS PRIMARY KEY (SistCod)
);

CREATE TABLE dbo.MODULOS (
  SistCod smallint NOT NULL,
  Modcod smallint NOT NULL,
  ModTipo smallint NULL,
  Modprg char(15) NULL,
  ModDes char(30) NULL,
  ModFcrea datetime NULL,
  ModVersion smallint NULL,
  ModFAIcons varchar(30) NULL,
  CONSTRAINT PK_MODULOS PRIMARY KEY (SistCod, Modcod),
  CONSTRAINT FK_MODULOS_SISTEMAS FOREIGN KEY (SistCod) REFERENCES dbo.SISTEMAS (SistCod)
);

CREATE TABLE dbo.PROGRAM (
  SistCod smallint NOT NULL,
  Modcod smallint NOT NULL,
  ProgCod smallint NOT NULL,
  ProgDes char(35) NULL,
  ProgFcrea datetime NULL,
  ProgTipo smallint NULL,
  ProgNomGX char(100) NULL,
  ProgIDmenu varchar(20) NULL,
  ProgTarget varchar(120) NULL,
  CONSTRAINT PK_PROGRAM PRIMARY KEY (SistCod, Modcod, ProgCod),
  CONSTRAINT FK_PROGRAM_MODULOS FOREIGN KEY (SistCod, Modcod) REFERENCES dbo.MODULOS (SistCod, Modcod)
);

CREATE TABLE dbo.PROGRAM1 (
  SistCod smallint NOT NULL,
  Modcod smallint NOT NULL,
  ProgCod smallint NOT NULL,
  ProgOPCod smallint NOT NULL,
  ProgOPDes char(35) NULL,
  CONSTRAINT PK_PROGRAM1 PRIMARY KEY (SistCod, Modcod, ProgCod, ProgOPCod),
  CONSTRAINT FK_PROGRAM1_PROGRAM FOREIGN KEY (SistCod, Modcod, ProgCod)
    REFERENCES dbo.PROGRAM (SistCod, Modcod, ProgCod)
);

CREATE TABLE dbo.USUARIOS (
  UsuLogin char(10) NOT NULL,
  UsuClave char(10) NULL,
  UsuRut int NULL,
  UsuDV char(1) NULL,
  Usunom char(35) NULL,
  UsuCargo char(30) NULL,
  UsuExpira datetime NULL,
  usucrea char(10) NULL,
  UsuNseg smallint NULL,
  UsuCorreo char(50) NULL,
  UsuEstado smallint NULL,
  UsuPerfil char(10) NULL,
  UsuTipo smallint NULL,
  CONSTRAINT PK_USUARIOS PRIMARY KEY (UsuLogin)
);

CREATE INDEX IX_USUARIOS_UsuRut ON dbo.USUARIOS (UsuRut);

CREATE TABLE dbo.NIVSEG (
  NSegMod smallint NOT NULL,
  NSegProg smallint NOT NULL,
  NSegDMod char(30) NULL,
  NsegDes char(35) NULL,
  NSegIns smallint NULL,
  NsegDel smallint NULL,
  NsegUPD smallint NULL,
  NsegLogA char(10) NULL,
  NsegPRC smallint NULL,
  CONSTRAINT PK_NIVSEG PRIMARY KEY (NSegMod, NSegProg)
);

CREATE TABLE dbo.ASIGSIST (
  GECODEMP decimal(10,0) NOT NULL,
  AsgSisLogin char(10) NOT NULL,
  SistCod smallint NOT NULL,
  CONSTRAINT PK_ASIGSIST PRIMARY KEY (GECODEMP, AsgSisLogin, SistCod)
);

CREATE TABLE dbo.ASIG (
  GECODEMP decimal(10,0) NOT NULL,
  AsigUsu char(10) NOT NULL,
  SistCod smallint NOT NULL,
  AsigMod smallint NOT NULL,
  AsigAsig char(10) NULL,
  CONSTRAINT PK_ASIG PRIMARY KEY (GECODEMP, AsigUsu, SistCod, AsigMod)
);

CREATE TABLE dbo.ASIGPROG (
  GECODEMP decimal(10,0) NOT NULL,
  UsuLogin char(10) NOT NULL,
  SistCod smallint NOT NULL,
  Modcod smallint NOT NULL,
  ProgCod smallint NOT NULL,
  ProgUsuC char(10) NULL,
  CONSTRAINT PK_ASIGPROG PRIMARY KEY (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod)
);

CREATE TABLE dbo.ASIGPROG1 (
  GECODEMP decimal(10,0) NOT NULL,
  UsuLogin char(10) NOT NULL,
  SistCod smallint NOT NULL,
  Modcod smallint NOT NULL,
  ProgCod smallint NOT NULL,
  ProgOPCod smallint NOT NULL,
  CONSTRAINT PK_ASIGPROG1 PRIMARY KEY (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgOPCod)
);

CREATE TABLE dbo.UROLES (
  ROLCod char(10) NOT NULL,
  ROLNombre char(30) NOT NULL,
  ROLFCrea datetime2(0) NOT NULL CONSTRAINT DF_UROLES_Fecha DEFAULT (SYSUTCDATETIME()),
  ROLUCrea char(10) NULL,
  CONSTRAINT PK_UROLES PRIMARY KEY (ROLCod)
);

CREATE TABLE dbo.SEGUSUEMP (
  GECODEMP decimal(10,0) NOT NULL,
  UsuLogin char(10) NOT NULL,
  UsuEstado smallint NOT NULL CONSTRAINT DF_SEGUSUEMP_Estado DEFAULT (1),
  UsuPerfil char(10) NULL,
  UsuTipo smallint NOT NULL CONSTRAINT DF_SEGUSUEMP_Tipo DEFAULT (0),
  EsPrincipal bit NOT NULL CONSTRAINT DF_SEGUSUEMP_Principal DEFAULT (0),
  FechaCrea datetime2(0) NOT NULL CONSTRAINT DF_SEGUSUEMP_Fecha DEFAULT (SYSUTCDATETIME()),
  UsuCrea char(10) NULL,
  CONSTRAINT PK_SEGUSUEMP PRIMARY KEY (GECODEMP, UsuLogin),
  CONSTRAINT FK_SEGUSUEMP_G_Emp FOREIGN KEY (GECODEMP) REFERENCES dbo.G_Emp (GECODEMP),
  CONSTRAINT FK_SEGUSUEMP_USUARIOS FOREIGN KEY (UsuLogin) REFERENCES dbo.USUARIOS (UsuLogin)
);

CREATE TABLE dbo.URolesPorUser (
  GECODEMP decimal(10,0) NOT NULL,
  UsuLogin char(10) NOT NULL,
  ROLCod char(10) NOT NULL,
  RXUFecCrea datetime2(0) NOT NULL CONSTRAINT DF_URolesPorUser_Fecha DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT PK_URolesPorUser PRIMARY KEY (GECODEMP, UsuLogin, ROLCod),
  CONSTRAINT FK_URolesPorUser_SEGUSUEMP FOREIGN KEY (GECODEMP, UsuLogin)
    REFERENCES dbo.SEGUSUEMP (GECODEMP, UsuLogin),
  CONSTRAINT FK_URolesPorUser_UROLES FOREIGN KEY (ROLCod) REFERENCES dbo.UROLES (ROLCod)
);

CREATE TABLE dbo.SEGUSUCRED (
  UsuLogin char(10) NOT NULL,
  PasswordSalt varchar(64) NOT NULL,
  PasswordHash varchar(256) NOT NULL,
  MigradoDesdeGX bit NOT NULL CONSTRAINT DF_SEGUSUCRED_Migrado DEFAULT (0),
  FechaCambio datetime2(0) NOT NULL CONSTRAINT DF_SEGUSUCRED_Fecha DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT PK_SEGUSUCRED PRIMARY KEY (UsuLogin),
  CONSTRAINT FK_SEGUSUCRED_USUARIOS FOREIGN KEY (UsuLogin) REFERENCES dbo.USUARIOS (UsuLogin)
);

CREATE TABLE dbo.SEGSESION (
  TokenHash varchar(64) NOT NULL,
  UsuLogin char(10) NOT NULL,
  EmpCod decimal(10,0) NOT NULL,
  FechaCreacion datetime2(0) NOT NULL,
  FechaExpiracion datetime2(0) NOT NULL,
  UltimoUso datetime2(0) NOT NULL,
  Revocada bit NOT NULL CONSTRAINT DF_SEGSESION_Revocada DEFAULT (0),
  CONSTRAINT PK_SEGSESION PRIMARY KEY (TokenHash),
  CONSTRAINT FK_SEGSESION_SEGUSUEMP FOREIGN KEY (EmpCod, UsuLogin)
    REFERENCES dbo.SEGUSUEMP (GECODEMP, UsuLogin)
);

CREATE INDEX IX_SEGSESION_Usuario ON dbo.SEGSESION (UsuLogin, Revocada, FechaExpiracion);

COMMIT TRANSACTION;
GO

CREATE OR ALTER VIEW dbo.DEFEMP
AS
SELECT
  GECODEMP AS EmpCod,
  GERAZSOC AS EmpNom,
  GEgiro1 AS EmpGiro,
  GEdire AS Empdir,
  GErut AS EmpRut,
  GEDv AS EmpDV,
  GeEstado AS EmpSw,
  GEregion AS empreg,
  GeComuna AS Empcom
FROM dbo.G_Emp;
GO

SELECT DB_NAME() AS BaseDatos, o.type_desc AS DEFEMP_Tipo
FROM sys.objects o
WHERE o.object_id=OBJECT_ID(N'dbo.DEFEMP');
