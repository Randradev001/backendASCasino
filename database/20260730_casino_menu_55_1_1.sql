SET XACT_ABORT ON;
BEGIN TRANSACTION;

/* Menú principal del módulo Casino. Las asignaciones se administran por separado. */
IF EXISTS (SELECT 1 FROM dbo.SISTEMAS WHERE SistCod=55)
  UPDATE dbo.SISTEMAS
  SET SistNombre='Pedidos Casino'
  WHERE SistCod=55;
ELSE
  INSERT INTO dbo.SISTEMAS (SistCod,SistNombre,SistFecCrea,SistVersion,SistFAIcons)
  VALUES (55,'Pedidos Casino',GETDATE(),0,NULL);

IF EXISTS (SELECT 1 FROM dbo.MODULOS WHERE SistCod=55 AND Modcod=1)
  UPDATE dbo.MODULOS
  SET ModTipo=1,Modprg='ID5501',ModDes='Operacional'
  WHERE SistCod=55 AND Modcod=1;
ELSE
  INSERT INTO dbo.MODULOS (SistCod,Modcod,ModTipo,Modprg,ModDes,ModFcrea,ModVersion,ModFAIcons)
  VALUES (55,1,1,'ID5501','Operacional',GETDATE(),0,NULL);

IF EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=1 AND ProgCod=1)
  UPDATE dbo.PROGRAM
  SET ProgDes='Pedidos Casino',
      ProgTipo=1,
      ProgNomGX='ssp.maeSSP06OPPedidosPlanta.aspx',
      ProgIDmenu='ID550101',
      ProgTarget=''
  WHERE SistCod=55 AND Modcod=1 AND ProgCod=1;
ELSE
  INSERT INTO dbo.PROGRAM
    (SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget)
  VALUES
    (55,1,1,'Pedidos Casino',GETDATE(),1,'ssp.maeSSP06OPPedidosPlanta.aspx','ID550101','');

COMMIT TRANSACTION;

SELECT S.SistCod,RTRIM(S.SistNombre) SistNombre,
       M.Modcod,RTRIM(M.ModDes) Modulo,
       P.ProgCod,RTRIM(P.ProgDes) Programa,RTRIM(P.ProgNomGX) Llamado
FROM dbo.SISTEMAS S
INNER JOIN dbo.MODULOS M ON M.SistCod=S.SistCod
INNER JOIN dbo.PROGRAM P ON P.SistCod=M.SistCod AND P.Modcod=M.Modcod
WHERE S.SistCod=55 AND M.Modcod=1 AND P.ProgCod=1;
