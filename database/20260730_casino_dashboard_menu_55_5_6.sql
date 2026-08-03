SET XACT_ABORT ON;
BEGIN TRANSACTION;

/* Segundo llamado de menú: dashboard consolidado de productos e historial. */
IF EXISTS (SELECT 1 FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=5 AND ProgCod=6)
  UPDATE dbo.PROGRAM
  SET ProgDes='Historial de Pedidos',
      ProgTipo=1,
      ProgNomGX='react.casinoHistory',
      ProgIDmenu='ID550506',
      ProgTarget=''
  WHERE SistCod=55 AND Modcod=5 AND ProgCod=6;
ELSE
  INSERT INTO dbo.PROGRAM
    (SistCod,Modcod,ProgCod,ProgDes,ProgFcrea,ProgTipo,ProgNomGX,ProgIDmenu,ProgTarget)
  VALUES
    (55,5,6,'Historial de Pedidos',GETDATE(),1,'react.casinoHistory','ID550506','');

/* Conserva el alcance: recibe el dashboard quien ya tenia alguna consulta 55/5. */
INSERT INTO dbo.ASIGPROG (GECODEMP,UsuLogin,SistCod,Modcod,ProgCod,ProgUsuC)
SELECT DISTINCT A.GECODEMP,A.UsuLogin,55,5,6,'MIGRACION'
FROM dbo.ASIGPROG A
WHERE A.SistCod=55 AND A.Modcod=5 AND A.ProgCod BETWEEN 1 AND 5
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.ASIGPROG T
    WHERE T.GECODEMP=A.GECODEMP
      AND RTRIM(T.UsuLogin)=RTRIM(A.UsuLogin)
      AND T.SistCod=55 AND T.Modcod=5 AND T.ProgCod=6
  );

COMMIT TRANSACTION;

SELECT P.SistCod,P.Modcod,P.ProgCod,RTRIM(P.ProgDes) Programa,
       RTRIM(P.ProgNomGX) Llamado,COUNT(A.UsuLogin) Asignaciones
FROM dbo.PROGRAM P
LEFT JOIN dbo.ASIGPROG A
  ON A.SistCod=P.SistCod AND A.Modcod=P.Modcod AND A.ProgCod=P.ProgCod
WHERE P.SistCod=55 AND P.Modcod=5 AND P.ProgCod=6
GROUP BY P.SistCod,P.Modcod,P.ProgCod,P.ProgDes,P.ProgNomGX;
