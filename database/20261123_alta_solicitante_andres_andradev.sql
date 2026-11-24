SET NOCOUNT ON;
SET XACT_ABORT ON;

USE BDADP_CASINO;
GO

/*
  Alta de solicitante Casino para la cuenta existente 17526007-7.

  Antes de ejecutar, completar con codigos reales de la empresa 1:
    @DivId: division de FPDIVISION.
    @SdiId: subdivision de FPDIVISIONSUB para la division indicada.
    @CecId: centro de costo de FPCENCOS.

  El script no crea ni cambia la clave. La cuenta ya debe existir en USUARIOS.
*/

DECLARE @GECODEMP decimal(10,0) = 1;
DECLARE @Login varchar(10) = '17526007';
DECLARE @Rut int = 17526007;
DECLARE @Dv char(1) = '2';
DECLARE @Email varchar(50) = 'andres.andradev@gmail.com';
DECLARE @Nombres varchar(40) = 'Andres';
DECLARE @ApellidoPaterno varchar(40) = '';
DECLARE @ApellidoMaterno varchar(40) = '';
DECLARE @NombreCompleto varchar(130) = 'Andres';
DECLARE @DivId varchar(10) = NULL; -- TODO: completar codigo real.
DECLARE @SdiId varchar(10) = NULL; -- TODO: completar codigo real.
DECLARE @CecId varchar(10) = NULL; -- TODO: completar codigo real.
DECLARE @Rol varchar(10) = 'CAS_USER';
DECLARE @Actor varchar(10) = 'MIGRACION';

IF NULLIF(LTRIM(RTRIM(@DivId)), '') IS NULL
   OR NULLIF(LTRIM(RTRIM(@SdiId)), '') IS NULL
   OR NULLIF(LTRIM(RTRIM(@CecId)), '') IS NULL
  THROW 51000, 'Complete @DivId, @SdiId y @CecId con los codigos organizacionales reales antes de ejecutar.', 1;

IF NOT EXISTS (
  SELECT 1
  FROM dbo.USUARIOS
  WHERE RTRIM(UsuLogin)=@Login AND UsuRut=@Rut AND RTRIM(UsuDV)=@Dv
)
  THROW 51001, 'No existe la cuenta esperada 17526007-2 en USUARIOS. No se aplicaron cambios.', 1;

IF NOT EXISTS (
  SELECT 1 FROM dbo.SEGUSUEMP
  WHERE GECODEMP=@GECODEMP AND RTRIM(UsuLogin)=@Login AND UsuEstado=1
)
  THROW 51002, 'La cuenta no esta activa en la empresa 1.', 1;

IF NOT EXISTS (
  SELECT 1 FROM dbo.FPDivision
  WHERE GECODEMP=@GECODEMP AND RTRIM(DivId)=RTRIM(@DivId)
)
  THROW 51003, 'La division indicada no existe en la empresa 1.', 1;

IF NOT EXISTS (
  SELECT 1 FROM dbo.FPDivisionSub
  WHERE GECODEMP=@GECODEMP
    AND RTRIM(DivId)=RTRIM(@DivId)
    AND RTRIM(SdiId)=RTRIM(@SdiId)
)
  THROW 51004, 'La subdivision indicada no pertenece a la division seleccionada.', 1;

IF NOT EXISTS (
  SELECT 1 FROM dbo.FPCenCos
  WHERE GECODEMP=@GECODEMP AND RTRIM(CecId)=RTRIM(@CecId)
)
  THROW 51005, 'El centro de costo indicado no existe en la empresa 1.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.UROLES WHERE RTRIM(ROLCod)=@Rol)
  THROW 51006, 'No existe el rol CAS_USER.', 1;

IF NOT EXISTS (
  SELECT 1 FROM dbo.ASIGPROG
  WHERE GECODEMP=0 AND RTRIM(UsuLogin)=@Rol
    AND SistCod=55 AND Modcod=1 AND ProgCod=1
)
  THROW 51007, 'La plantilla CAS_USER no contiene el permiso 55/1/1.', 1;

BEGIN TRANSACTION;

UPDATE dbo.USUARIOS
SET UsuCorreo=@Email
WHERE RTRIM(UsuLogin)=@Login;

IF NOT EXISTS (
  SELECT 1 FROM dbo.FPPersonas
  WHERE GECODEMP=@GECODEMP AND PerRut=@Rut
)
BEGIN
  INSERT INTO dbo.FPPersonas (
    GECODEMP, PerRut, PerDV, PerPaterno, PerMaterno, Pernombre, PernombreCom,
    GPId, APId, DivId, SdiId, UOrId, CecId, FunId,
    PerPosicionID, PerPosicionDesc, PerDesde, PerHasta, PerFecha,
    PerTratamiento, PerSexo, PerFechanac, PerNacionalidad, PerEstadoCivil,
    PerHijos, PerDireccion, PerCalleynumero, PerComuna, PerProvincia,
    PerRegion, PerPais, PerTelefono, PerTurno, PerEstadoLab, SindId,
    PerFoto, PerJefe, PerAnexo, PerGF, PerCeCID, PerCodConv, PerDescConv,
    PerCAFP, PerDescAFP, PerCISAPRE, PerDescISAPRE, PerCFonSolid,
    PerDescFonSolid, PerTURCod, Perfallas, Perlicencias, PerNCartas,
    PerFecM, PerLoginM, PerEmail, Percodigo
  )
  VALUES (
    @GECODEMP, @Rut, @Dv, @ApellidoPaterno, @ApellidoMaterno, @Nombres, @NombreCompleto,
    '', '', @DivId, @SdiId, '', @CecId, '',
    0, '', GETDATE(), CONVERT(datetime, '99991231', 112), GETDATE(),
    '', '', CONVERT(datetime, '19000101', 112), '', '',
    0, '', '', '', '',
    '', '', '', '', 1, 0,
    NULL, 0, '', 0, NULL, '', '',
    '', '', '', '', '',
    '', '', 0, 0, 0,
    GETDATE(), @Actor, @Email, NULL
  );
END
ELSE
BEGIN
  UPDATE dbo.FPPersonas
  SET PerEmail=@Email,
      DivId=@DivId,
      SdiId=@SdiId,
      CecId=@CecId,
      PerFecM=GETDATE(),
      PerLoginM=@Actor
  WHERE GECODEMP=@GECODEMP AND PerRut=@Rut;
END;

IF NOT EXISTS (
  SELECT 1 FROM dbo.ASIGSIST
  WHERE GECODEMP=@GECODEMP AND RTRIM(AsgSisLogin)=@Login AND SistCod=55
)
  INSERT INTO dbo.ASIGSIST (GECODEMP, AsgSisLogin, SistCod)
  VALUES (@GECODEMP, @Login, 55);

IF NOT EXISTS (
  SELECT 1 FROM dbo.URolesPorUser
  WHERE GECODEMP=@GECODEMP AND RTRIM(UsuLogin)=@Login AND RTRIM(ROLCod)=@Rol
)
  INSERT INTO dbo.URolesPorUser (GECODEMP, UsuLogin, ROLCod, RXUFecCrea)
  VALUES (@GECODEMP, @Login, @Rol, SYSUTCDATETIME());

COMMIT TRANSACTION;

SELECT
  RTRIM(U.UsuLogin) AS UsuLogin,
  U.UsuRut,
  RTRIM(U.UsuDV) AS UsuDV,
  RTRIM(U.UsuCorreo) AS UsuCorreo,
  P.GECODEMP,
  RTRIM(P.PernombreCom) AS Solicitante,
  RTRIM(P.DivId) AS DivId,
  RTRIM(P.SdiId) AS SdiId,
  RTRIM(P.CecId) AS CecId,
  P.PerEstadoLab,
  CASE WHEN EXISTS (
    SELECT 1
    FROM dbo.URolesPorUser RU
    INNER JOIN dbo.ASIGPROG RP
      ON RP.GECODEMP=0 AND RTRIM(RP.UsuLogin)=RTRIM(RU.ROLCod)
    WHERE RU.GECODEMP=@GECODEMP
      AND RTRIM(RU.UsuLogin)=@Login
      AND RP.SistCod=55 AND RP.Modcod=1 AND RP.ProgCod=1
  ) THEN 1 ELSE 0 END AS TienePermisoSolicitar
FROM dbo.USUARIOS U
INNER JOIN dbo.FPPersonas P
  ON P.GECODEMP=@GECODEMP AND P.PerRut=U.UsuRut
WHERE RTRIM(U.UsuLogin)=@Login;
GO
