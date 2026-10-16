SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.SSP06OPPedidosPlantaDecision', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SSP06OPPedidosPlantaDecision (
    GECODEMP decimal(10,0) NOT NULL,
    PEDNumero decimal(10,0) NOT NULL,
    Decision varchar(10) NOT NULL,
    Comentario varchar(500) NULL,
    FechaEntregaConfirmada datetime NULL,
    HoraEntregaConfirmada datetime NULL,
    UsuLogin varchar(10) NOT NULL,
    FechaDecision datetime2 NOT NULL,
    CONSTRAINT PK_SSP06OPPedidosPlantaDecision PRIMARY KEY (GECODEMP, PEDNumero),
    CONSTRAINT FK_SSP06OPPedidosPlantaDecision_Pedido FOREIGN KEY (GECODEMP, PEDNumero)
      REFERENCES dbo.SSP06OPPedidosPlanta (GECODEMP, PEDNumero),
    CONSTRAINT CK_SSP06OPPedidosPlantaDecision_Tipo CHECK (Decision IN ('APROBADO', 'RECHAZADO')),
    CONSTRAINT CK_SSP06OPPedidosPlantaDecision_Comentario CHECK (
      Decision <> 'RECHAZADO' OR (Comentario IS NOT NULL AND LEN(LTRIM(RTRIM(Comentario))) >= 3)
    ),
    CONSTRAINT CK_SSP06OPPedidosPlantaDecision_Entrega CHECK (
      Decision <> 'APROBADO' OR (FechaEntregaConfirmada IS NOT NULL AND HoraEntregaConfirmada IS NOT NULL)
    )
  );
END;

/* Conserva el sistema 55 y su permiso legado 55/1/10 de PedidosCasinoStatus. */
IF EXISTS (SELECT 1 FROM dbo.SISTEMAS WHERE SistCod=55)
  UPDATE dbo.SISTEMAS SET SistNombre='Solicitudes Casino' WHERE SistCod=55;
ELSE
  INSERT INTO dbo.SISTEMAS (SistCod,SistNombre,SistFecCrea,SistVersion,SistFAIcons)
  VALUES (55,'Solicitudes Casino',GETDATE(),0,NULL);

IF EXISTS (SELECT 1 FROM dbo.MODULOS WHERE SistCod=55 AND Modcod=1)
  UPDATE dbo.MODULOS SET ModDes='Operacional',ModTipo=1,Modprg='ID5501' WHERE SistCod=55 AND Modcod=1;
ELSE
  INSERT INTO dbo.MODULOS (SistCod,Modcod,ModTipo,Modprg,ModDes,ModFcrea,ModVersion,ModFAIcons)
  VALUES (55,1,1,'ID5501','Operacional',GETDATE(),0,NULL);

IF EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=1 AND ProgCod=10)
  UPDATE dbo.PROGRAM
  SET ProgDes='Ver solicitudes',ProgTipo=1,ProgNomGX='react.casinoRequests',ProgIDmenu='ID550110',ProgTarget=''
  WHERE SistCod=55 AND Modcod=1 AND ProgCod=10;
ELSE
  INSERT INTO dbo.PROGRAM
    (SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget)
  VALUES
    (55,1,10,'Ver solicitudes',GETDATE(),1,'react.casinoRequests','ID550110','');

/* No se crean asignaciones: se preservan los accesos directos y por rol ya existentes para 55/1/10. */
COMMIT TRANSACTION;

SELECT P.SistCod,P.Modcod,P.ProgCod,RTRIM(P.ProgDes) Programa,RTRIM(P.ProgNomGX) Llamado,
       COUNT(A.UsuLogin) AsignacionesDirectasORol
FROM dbo.PROGRAM P
LEFT JOIN dbo.ASIGPROG A
  ON A.SistCod=P.SistCod AND A.Modcod=P.Modcod AND A.ProgCod=P.ProgCod
WHERE P.SistCod=55 AND P.Modcod=1 AND P.ProgCod=10
GROUP BY P.SistCod,P.Modcod,P.ProgCod,P.ProgDes,P.ProgNomGX;

SELECT OBJECT_ID('dbo.SSP06OPPedidosPlantaDecision', 'U') TablaDecision,
       COUNT(*) DecisionesRegistradas
FROM dbo.SSP06OPPedidosPlantaDecision;
