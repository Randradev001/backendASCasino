SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SSP06OPCorreoOutbox','U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06OPCorreoOutbox (
    GECODEMP decimal(10,0) NOT NULL,
    CorreoId bigint IDENTITY(1,1) NOT NULL,
    Idempotencia varchar(120) NOT NULL,
    PEDNumero decimal(10,0) NULL,
    TipoEvento varchar(40) NOT NULL,
    Destinatario varchar(254) NOT NULL,
    Asunto varchar(200) NOT NULL,
    Datos nvarchar(max) NOT NULL,
    Estado varchar(12) NOT NULL,
    Intentos smallint NOT NULL CONSTRAINT DF_SSP06OPCorreoOutbox_Intentos DEFAULT 0,
    DisponibleDesde datetime2 NOT NULL,
    BloqueadoHasta datetime2 NULL,
    EnviadoEn datetime2 NULL,
    ProveedorId varchar(120) NULL,
    UltimoError varchar(500) NULL,
    CreadoEn datetime2 NOT NULL,
    CreadoPor varchar(10) NOT NULL,
    CONSTRAINT PK_SSP06OPCorreoOutbox PRIMARY KEY (GECODEMP,CorreoId),
    CONSTRAINT UQ_SSP06OPCorreoOutbox_Idempotencia UNIQUE (GECODEMP,Idempotencia),
    CONSTRAINT FK_SSP06OPCorreoOutbox_Pedido FOREIGN KEY (GECODEMP,PEDNumero) REFERENCES dbo.SSP06OPPedidosPlanta(GECODEMP,PEDNumero),
    CONSTRAINT CK_SSP06OPCorreoOutbox_Estado CHECK (Estado IN ('PENDIENTE','PROCESANDO','ENVIADO','ERROR','CANCELADO')),
    CONSTRAINT CK_SSP06OPCorreoOutbox_Intentos CHECK (Intentos>=0),
    CONSTRAINT CK_SSP06OPCorreoOutbox_DatosJson CHECK (ISJSON(Datos)=1)
  );
  CREATE INDEX IX_SSP06OPCorreoOutbox_Cola ON dbo.SSP06OPCorreoOutbox(Estado,DisponibleDesde,BloqueadoHasta);
  CREATE INDEX IX_SSP06OPCorreoOutbox_Pedido ON dbo.SSP06OPCorreoOutbox(GECODEMP,PEDNumero,CreadoEn DESC);
END;

IF OBJECT_ID('dbo.SSP06OPCorreoIntento','U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06OPCorreoIntento (
    GECODEMP decimal(10,0) NOT NULL,
    CorreoId bigint NOT NULL,
    Intento smallint NOT NULL,
    Fecha datetime2 NOT NULL,
    Exitoso bit NOT NULL,
    ProveedorId varchar(120) NULL,
    Error varchar(500) NULL,
    CONSTRAINT PK_SSP06OPCorreoIntento PRIMARY KEY (GECODEMP,CorreoId,Intento),
    CONSTRAINT FK_SSP06OPCorreoIntento_Outbox FOREIGN KEY (GECODEMP,CorreoId) REFERENCES dbo.SSP06OPCorreoOutbox(GECODEMP,CorreoId)
  );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=1 AND ProgCod=92)
  INSERT dbo.PROGRAM(SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget)
  VALUES(55,1,92,'Estado de Correos',GETDATE(),1,'react.casinoMail.status',NULL,'_self');
ELSE
  UPDATE dbo.PROGRAM SET ProgDes='Estado de Correos',ProgNomGX='react.casinoMail.status',ProgTarget='_self'
  WHERE SistCod=55 AND Modcod=1 AND ProgCod=92;

INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC)
SELECT A.GECODEMP,A.UsuLogin,55,1,92,A.ProgUsuC
FROM dbo.ASIGPROG A
WHERE A.SistCod=55 AND A.Modcod=1 AND A.ProgCod=99
  AND NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG T WHERE T.GECODEMP=A.GECODEMP AND RTRIM(T.UsuLogin)=RTRIM(A.UsuLogin) AND T.SistCod=55 AND T.Modcod=1 AND T.ProgCod=92);

IF EXISTS (SELECT 1 FROM dbo.UROLES WHERE RTRIM(ROLCod)='ADMINFULL')
  AND NOT EXISTS (SELECT 1 FROM dbo.ASIGPROG WHERE GECODEMP=0 AND RTRIM(UsuLogin)='ADMINFULL' AND SistCod=55 AND Modcod=1 AND ProgCod=92)
  INSERT dbo.ASIGPROG(GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC)
  VALUES(0,'ADMINFULL',55,1,92,'SYSTEM');

COMMIT TRANSACTION;

SELECT OBJECT_ID('dbo.SSP06OPCorreoOutbox','U') Outbox,OBJECT_ID('dbo.SSP06OPCorreoIntento','U') Intentos;
SELECT SistCod,Modcod,ProgCod,RTRIM(ProgDes) ProgDes,RTRIM(ProgNomGX) ProgNomGX FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=1 AND ProgCod=92;
SELECT GECODEMP,RTRIM(UsuLogin) UsuLogin FROM dbo.ASIGPROG WHERE SistCod=55 AND Modcod=1 AND ProgCod=92 ORDER BY GECODEMP,UsuLogin;
