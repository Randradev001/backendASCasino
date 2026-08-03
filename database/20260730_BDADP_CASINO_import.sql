/*
  Importa Casino, la ficha de Personas, Seguridad de los sistemas 55 y 10, y
  dependencias ADP necesarias. La fuente debe estar adjunta como
  BDADP_CASINO_SOURCE.
*/
USE [BDADP_CASINO];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_ID(N'BDADP_CASINO_SOURCE') IS NULL
BEGIN
  THROW 50001, 'La fuente BDADP_CASINO_SOURCE no esta adjunta.', 1;
END;

IF EXISTS (SELECT 1 FROM dbo.G_Emp) OR EXISTS (SELECT 1 FROM dbo.SSP06OPPedidosPlanta)
BEGIN
  THROW 50002, 'BDADP_CASINO ya contiene datos; la importacion no se repite automaticamente.', 1;
END;

BEGIN TRANSACTION;

INSERT INTO dbo.G_Emp (GECODEMP, GERAZSOC, GEgiro1, GErut, GEDv, GEdire, GEregion, GeComuna, GeEstado)
SELECT GECODEMP, GERAZSOC, GEgiro1, GErut, GEDv, GEdire, GEregion, GeComuna, GeEstado
FROM BDADP_CASINO_SOURCE.dbo.G_Emp
WHERE GECODEMP=1;

INSERT INTO dbo.FPGrupos (GECODEMP, GPId, GPDescripcion)
SELECT GECODEMP, GPId, GPDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPGrupos
WHERE GECODEMP=1;

INSERT INTO dbo.FPArea (GECODEMP, APId, APDescripcion)
SELECT GECODEMP, APId, APDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPArea
WHERE GECODEMP=1;

INSERT INTO dbo.FPDivision (GECODEMP, DivId, DivDescripcion)
SELECT GECODEMP, DivId, DivDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPDivision
WHERE GECODEMP=1;

INSERT INTO dbo.FPDivisionSub (GECODEMP, DivId, SdiId, SdiDescripcion)
SELECT GECODEMP, DivId, SdiId, SdiDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPDivisionSub
WHERE GECODEMP=1;

INSERT INTO dbo.FPOrganiza (GECODEMP, UOrId, UOrDescripcion)
SELECT GECODEMP, UOrId, UOrDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPOrganiza
WHERE GECODEMP=1;

INSERT INTO dbo.FPCenCos (GECODEMP, CecId, CecDescripcion)
SELECT GECODEMP, CecId, CecDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPCenCos
WHERE GECODEMP=1;

INSERT INTO dbo.FPFuncion (GECODEMP, FunId, FunDescripcion)
SELECT GECODEMP, FunId, FunDescripcion
FROM BDADP_CASINO_SOURCE.dbo.FPFuncion
WHERE GECODEMP=1;

INSERT INTO dbo.FPSindicato (GECODEMP, SindId, SinDesc)
SELECT GECODEMP, SindId, SinDesc
FROM BDADP_CASINO_SOURCE.dbo.FPSindicato
WHERE GECODEMP=1;

INSERT INTO dbo.CHTurnos (GECODEMP, TURCod, TURDesc)
SELECT GECODEMP, TURCod, TURDesc
FROM BDADP_CASINO_SOURCE.dbo.CHTurnos
WHERE GECODEMP=1;

/* La ficha requiere personas activas y finiquitadas, con sus fotos historicas. */
INSERT INTO dbo.FPPersonas (
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
  P.GECODEMP, P.PerRut, P.PerDV, P.PerPaterno, P.PerMaterno, P.Pernombre, P.PernombreCom,
  P.GPId, P.APId, P.DivId, P.SdiId, P.UOrId, P.CecId, P.FunId, P.PerPosicionID,
  P.PerPosicionDesc, P.PerDesde, P.PerHasta, P.PerFecha, P.PerTratamiento, P.PerSexo,
  P.PerFechanac, P.PerNacionalidad, P.PerEstadoCivil, P.PerHijos, P.PerDireccion,
  P.PerCalleynumero, P.PerComuna, P.PerProvincia, P.PerRegion, P.PerPais, P.PerTelefono,
  P.PerTurno, P.PerEstadoLab, P.SindId, P.PerFoto, P.PerJefe, P.PerAnexo, P.PerGF,
  P.PerCeCID, P.PerCodConv, P.PerDescConv, P.PerCAFP, P.PerDescAFP, P.PerCISAPRE,
  P.PerDescISAPRE, P.PerCFonSolid, P.PerDescFonSolid, P.PerTURCod, P.Perfallas,
  P.Perlicencias, P.PerNCartas, P.PerFecM, P.PerLoginM, P.PerEmail, P.Percodigo
FROM BDADP_CASINO_SOURCE.dbo.FPPersonas P
WHERE P.GECODEMP=1;

INSERT INTO dbo.SSP06MACasinosPlanta (GECODEMP, CASICod, CASINom, CASIDV, CASIRut, CASIEmail)
SELECT GECODEMP, CASICod, CASINom, CASIDV, CASIRut, CASIEmail
FROM BDADP_CASINO_SOURCE.dbo.SSP06MACasinosPlanta
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06MADestinosPlanta (GECODEMP, DESTICod, DESTINom)
SELECT GECODEMP, DESTICod, DESTINom
FROM BDADP_CASINO_SOURCE.dbo.SSP06MADestinosPlanta
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06MAMotivoPedidos (GECODEMP, Mot6Cod, Mot6Descrip)
SELECT GECODEMP, Mot6Cod, Mot6Descrip
FROM BDADP_CASINO_SOURCE.dbo.SSP06MAMotivoPedidos
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06MATPProducto (GECODEMP, TPPRCod, TPPRNombre, TPPROrden)
SELECT GECODEMP, TPPRCod, TPPRNombre, TPPROrden
FROM BDADP_CASINO_SOURCE.dbo.SSP06MATPProducto
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06MAProducto (GECODEMP, PRODCodigo, TPPRCod, ProdNombre, PRODPrecio, CASICod)
SELECT GECODEMP, PRODCodigo, TPPRCod, ProdNombre, PRODPrecio, CASICod
FROM BDADP_CASINO_SOURCE.dbo.SSP06MAProducto
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06OPPedidosPlanta (
  GECODEMP, PEDNumero, PEDDescripcion, PEDFechaCrea, DESTICod, CASICod, PEDSolicita,
  PedEstadoIngreso, PedMM, PedAA, pedfechaEntrega, PedAAEntrega, PedMMEntrega,
  Mot6Cod, PedHHEntrega, PedRutSolicita, PEDSwCorreo, PEDControlPago
)
SELECT
  GECODEMP, PEDNumero, PEDDescripcion, PEDFechaCrea, DESTICod, CASICod, PEDSolicita,
  PedEstadoIngreso, PedMM, PedAA, pedfechaEntrega, PedAAEntrega, PedMMEntrega,
  Mot6Cod, PedHHEntrega, PedRutSolicita, PEDSwCorreo, PEDControlPago
FROM BDADP_CASINO_SOURCE.dbo.SSP06OPPedidosPlanta
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06OPPedidosPlantaDet (
  GECODEMP, PEDNumero, PRODCodigo, PED1Precio, PED1Cantidad, PED1FechaEnt, DivId, SdiId, CecId
)
SELECT GECODEMP, PEDNumero, PRODCodigo, PED1Precio, PED1Cantidad, PED1FechaEnt, DivId, SdiId, CecId
FROM BDADP_CASINO_SOURCE.dbo.SSP06OPPedidosPlantaDet
WHERE GECODEMP=1;

INSERT INTO dbo.SSP06OPEvalPedidoCasino (
  GECODEMP, EVPedCod, PEDNumero, PEDCodigo, EVPedObservacionCasino, EVPedEvaluacion,
  EVPEDFecha, EVPEDTipo, EVPEDOBSCasino, EvPedObsUsuario
)
SELECT
  GECODEMP, EVPedCod, PEDNumero, PEDCodigo, EVPedObservacionCasino, EVPedEvaluacion,
  EVPEDFecha, EVPEDTipo, EVPEDOBSCasino, EvPedObsUsuario
FROM BDADP_CASINO_SOURCE.dbo.SSP06OPEvalPedidoCasino
WHERE GECODEMP=1;

/* El codigo 2021 usa PEDCASINOS; la copia 2020 aun no tenia esa fila. */
INSERT INTO dbo.MACorrelativos (GECODEMP, CRRID, CRRNum)
SELECT 1, 'PEDCASINOS', COALESCE(
  (SELECT MAX(CRRNum) FROM BDADP_CASINO_SOURCE.dbo.MACorrelativos WHERE GECODEMP=1 AND RTRIM(CRRID)='PEDCASINOS'),
  (SELECT MAX(PEDNumero) FROM BDADP_CASINO_SOURCE.dbo.SSP06OPPedidosPlanta WHERE GECODEMP=1),
  0
);

/* Catalogo y asignaciones de Casino (55) y Personas (10). */
INSERT INTO dbo.SISTEMAS (SistCod, SistNombre, SistFecCrea, SistVersion)
SELECT SistCod, SistNombre, SistFecCrea, SistVersion
FROM BDADP_CASINO_SOURCE.dbo.Sistemas
WHERE SistCod IN (10, 55);

INSERT INTO dbo.MODULOS (SistCod, Modcod, ModTipo, Modprg, ModDes, ModFcrea, ModVersion)
SELECT SistCod, Modcod, ModTipo, Modprg, ModDes, ModFcrea, ModVersion
FROM BDADP_CASINO_SOURCE.dbo.Modulos
WHERE SistCod IN (10, 55);

INSERT INTO dbo.PROGRAM (SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget)
SELECT SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget
FROM BDADP_CASINO_SOURCE.dbo.Program
WHERE SistCod IN (10, 55);

/* Permiso solicitado por SolicitaPedidoCasino pero ausente del catalogo 2020. */
IF NOT EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=1 AND ProgCod=91)
BEGIN
  INSERT INTO dbo.PROGRAM (SistCod, Modcod, ProgCod, ProgDes, ProgFcrea, ProgTipo, ProgNomGX, ProgIDmenu, ProgTarget)
  VALUES (55, 1, 91, 'Acceso todos productos', GETDATE(), 0, '', '', '');
END;

INSERT INTO dbo.PROGRAM1 (SistCod, Modcod, ProgCod, ProgOPCod, ProgOPDes)
SELECT SistCod, Modcod, ProgCod, ProgOPCod, ProgOPDes
FROM BDADP_CASINO_SOURCE.dbo.Program1
WHERE SistCod IN (10, 55);

CREATE TABLE #AppLogins (
  UsuLogin char(10) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY
);

INSERT INTO #AppLogins (UsuLogin)
SELECT DISTINCT UsuLogin
FROM (
  SELECT AsgSisLogin AS UsuLogin FROM BDADP_CASINO_SOURCE.dbo.AsigSist WHERE GECODEMP=1 AND SistCod IN (10, 55)
  UNION
  SELECT AsigUsu FROM BDADP_CASINO_SOURCE.dbo.Asig WHERE GECODEMP=1 AND SistCod IN (10, 55)
  UNION
  SELECT UsuLogin FROM BDADP_CASINO_SOURCE.dbo.AsigProg WHERE GECODEMP=1 AND SistCod IN (10, 55)
) U;

INSERT INTO dbo.USUARIOS (
  UsuLogin, UsuClave, UsuRut, UsuDV, Usunom, UsuCargo, UsuExpira, usucrea,
  UsuNseg, UsuCorreo, UsuEstado, UsuPerfil, UsuTipo
)
SELECT
  U.UsuLogin, U.UsuClave, U.UsuRut, U.UsuDV, U.Usunom, U.UsuCargo, NULL, U.usucrea,
  0, U.UsuCorreo, U.UsuEstado, U.UsuPerfil, U.UsuTipo
FROM BDADP_CASINO_SOURCE.dbo.Usuarios U
INNER JOIN #AppLogins L ON RTRIM(L.UsuLogin)=RTRIM(U.UsuLogin)
WHERE U.GECODEMP=1;

INSERT INTO dbo.UROLES (ROLCod, ROLNombre, ROLFCrea, ROLUCrea)
SELECT ROLCod, ROLNombre, ROLFCrea, ROLUCrea
FROM BDADP_CASINO_SOURCE.dbo.UROLES;

INSERT INTO dbo.SEGUSUEMP (GECODEMP, UsuLogin, UsuEstado, UsuPerfil, UsuTipo, EsPrincipal, UsuCrea)
SELECT 1, U.UsuLogin, COALESCE(U.UsuEstado, 1), U.UsuPerfil, COALESCE(U.UsuTipo, 0), 1, 'MIGRACION'
FROM dbo.USUARIOS U;

INSERT INTO dbo.URolesPorUser (GECODEMP, UsuLogin, ROLCod, RXUFecCrea)
SELECT R.GECODEMP, R.UsuLogin, R.ROLCod, R.RXUFecCrea
FROM BDADP_CASINO_SOURCE.dbo.URolesPorUser R
INNER JOIN #AppLogins L ON RTRIM(L.UsuLogin)=RTRIM(R.UsuLogin)
WHERE R.GECODEMP=1;

INSERT INTO dbo.ASIGSIST (GECODEMP, AsgSisLogin, SistCod)
SELECT GECODEMP, AsgSisLogin, SistCod
FROM BDADP_CASINO_SOURCE.dbo.AsigSist
WHERE GECODEMP IN (0, 1) AND SistCod IN (10, 55);

INSERT INTO dbo.ASIG (GECODEMP, AsigUsu, SistCod, AsigMod, AsigAsig)
SELECT GECODEMP, AsigUsu, SistCod, AsigMod, AsigAsig
FROM BDADP_CASINO_SOURCE.dbo.Asig
WHERE GECODEMP IN (0, 1) AND SistCod IN (10, 55);

INSERT INTO dbo.ASIGPROG (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC)
SELECT GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgUsuC
FROM BDADP_CASINO_SOURCE.dbo.AsigProg
WHERE GECODEMP IN (0, 1) AND SistCod IN (10, 55);

INSERT INTO dbo.ASIGPROG1 (GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgOPCod)
SELECT GECODEMP, UsuLogin, SistCod, Modcod, ProgCod, ProgOPCod
FROM BDADP_CASINO_SOURCE.dbo.AsigProg1
WHERE GECODEMP IN (0, 1) AND SistCod IN (10, 55);

DROP TABLE #AppLogins;

COMMIT TRANSACTION;

DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;

SELECT 'SSP06MACasinosPlanta' AS Tabla, COUNT(*) AS Filas FROM dbo.SSP06MACasinosPlanta
UNION ALL SELECT 'SSP06MADestinosPlanta', COUNT(*) FROM dbo.SSP06MADestinosPlanta
UNION ALL SELECT 'SSP06MAMotivoPedidos', COUNT(*) FROM dbo.SSP06MAMotivoPedidos
UNION ALL SELECT 'SSP06MATPProducto', COUNT(*) FROM dbo.SSP06MATPProducto
UNION ALL SELECT 'SSP06MAProducto', COUNT(*) FROM dbo.SSP06MAProducto
UNION ALL SELECT 'SSP06OPPedidosPlanta', COUNT(*) FROM dbo.SSP06OPPedidosPlanta
UNION ALL SELECT 'SSP06OPPedidosPlantaDet', COUNT(*) FROM dbo.SSP06OPPedidosPlantaDet
UNION ALL SELECT 'SSP06OPEvalPedidoCasino', COUNT(*) FROM dbo.SSP06OPEvalPedidoCasino;
