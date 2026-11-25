const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { statusLabel } = require('./casinoBi.rules');

const clean = (value) => String(value || '').trim();
const num = (value) => Number(value || 0);

const dashboard = async (context, profile) => {
  const empCod = Number(context?.empCod);
  const login = clean(context?.login).toUpperCase();
  if (!Number.isInteger(empCod) || empCod < 1 || !login) throw new SecurityError(401, 'UNAUTHENTICATED', 'La sesión no es válida.');
  const pool = await getPool();
  const identity = (await pool.request().input('empCod', sql.Int, empCod).input('login', sql.VarChar(10), login).query(`
    SELECT TOP (1) U.UsuRut,(SELECT TOP (1) C.CASICod FROM SSP06MACasinosPlanta C WHERE C.GECODEMP=@empCod AND C.CASIActivo=1 AND C.CASIRut=U.UsuRut ORDER BY C.CASICod) CASICod
    FROM USUARIOS U INNER JOIN SEGUSUEMP E ON E.GECODEMP=@empCod AND RTRIM(E.UsuLogin)=RTRIM(U.UsuLogin) WHERE RTRIM(U.UsuLogin)=@login;
  `)).recordset[0];
  if (!num(identity?.UsuRut)) throw new SecurityError(409, 'USER_NOT_LINKED', 'El usuario no tiene un RUT asociado.');
  if (profile === 'casino' && !num(identity?.CASICod)) throw new SecurityError(409, 'CASINO_NOT_LINKED', 'El usuario no está asociado a un casino activo.');
  const request = pool.request().input('empCod', sql.Int, empCod);
  const scoped = profile === 'person' ? 'P.PedRutSolicita=@rut' : 'P.CASICod=@casino';
  if (profile === 'person') request.input('rut', sql.Int, num(identity.UsuRut));
  else request.input('casino', sql.Decimal(10, 0), num(identity.CASICod));
  const base = `FROM SSP06OPPedidosPlanta P INNER JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero LEFT JOIN SSP06MAProducto PR ON PR.GECODEMP=D.GECODEMP AND PR.PRODCodigo=D.PRODCodigo LEFT JOIN SSP06MATPProducto T ON T.GECODEMP=PR.GECODEMP AND T.TPPRCod=PR.TPPRCod WHERE P.GECODEMP=@empCod AND ${scoped}`;
  const result = await request.query(`
    SELECT COUNT(DISTINCT P.PEDNumero) Orders,ISNULL(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)),0) Quantity,ISNULL(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio),0) Amount ${base};
    SELECT CONVERT(char(7),P.PEDFechaCrea,120) Period,COUNT(DISTINCT P.PEDNumero) Orders ${base} GROUP BY CONVERT(char(7),P.PEDFechaCrea,120) ORDER BY Period;
    SELECT PR.TPPRCod Id,MAX(RTRIM(ISNULL(T.TPPRNombre,'Sin tipo'))) Name,COUNT(DISTINCT P.PEDNumero) Orders,SUM(CONVERT(decimal(18,2),D.PED1Cantidad)) Quantity,SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio) Amount ${base} GROUP BY PR.TPPRCod ORDER BY Orders DESC;
    SELECT D.PRODCodigo Id,MAX(RTRIM(ISNULL(PR.ProdNombre,'Producto sin nombre'))) Name,COUNT(DISTINCT P.PEDNumero) Orders,SUM(CONVERT(decimal(18,2),D.PED1Cantidad)) Quantity,SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio) Amount ${base} GROUP BY D.PRODCodigo ORDER BY Orders DESC;
    SELECT TOP (8) P.PEDNumero,P.PEDFechaCrea,P.PedEstadoIngreso,RTRIM(ISNULL(S.PernombreCom,P.PEDSolicita)) Requester,SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio) Amount FROM SSP06OPPedidosPlanta P INNER JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero LEFT JOIN SSP06VWSolicitanteHistorico S ON S.GECODEMP=P.GECODEMP AND S.PerRut=P.PedRutSolicita WHERE P.GECODEMP=@empCod AND ${scoped} GROUP BY P.PEDNumero,P.PEDFechaCrea,P.PedEstadoIngreso,S.PernombreCom,P.PEDSolicita ORDER BY P.PEDFechaCrea DESC,P.PEDNumero DESC;
    ${profile === 'casino' ? `SELECT ISNULL(E.EVPedEvaluacion,0) Rating,COUNT(DISTINCT P.PEDNumero) Orders FROM SSP06OPPedidosPlanta P LEFT JOIN SSP06OPEvalPedidoCasino E ON E.GECODEMP=P.GECODEMP AND E.PEDNumero=P.PEDNumero WHERE P.GECODEMP=@empCod AND ${scoped} GROUP BY ISNULL(E.EVPedEvaluacion,0) ORDER BY Rating; SELECT P.PedRutSolicita Rut,RTRIM(ISNULL(S.PernombreCom,P.PEDSolicita)) Name,COUNT(*) Orders FROM SSP06OPPedidosPlanta P LEFT JOIN SSP06VWSolicitanteHistorico S ON S.GECODEMP=P.GECODEMP AND S.PerRut=P.PedRutSolicita WHERE P.GECODEMP=@empCod AND ${scoped} GROUP BY P.PedRutSolicita,S.PernombreCom,P.PEDSolicita ORDER BY Orders DESC;` : ''}
  `);
  const summary = result.recordsets[0]?.[0] || {};
  const counter = (row) => ({ id: num(row.Id), name: clean(row.Name), orders: num(row.Orders), quantity: num(row.Quantity), amount: num(row.Amount) });
  return { profile, kpis: { orders: num(summary.Orders), quantity: num(summary.Quantity), amount: num(summary.Amount) }, trend: (result.recordsets[1] || []).map((r) => ({ period: clean(r.Period), orders: num(r.Orders) })), types: (result.recordsets[2] || []).map(counter), products: (result.recordsets[3] || []).map(counter), recentOrders: (result.recordsets[4] || []).map((r) => ({ number: num(r.PEDNumero), createdAt: r.PEDFechaCrea, status: num(r.PedEstadoIngreso), statusLabel: statusLabel(r.PedEstadoIngreso), requester: clean(r.Requester), amount: num(r.Amount) })), ratings: profile === 'casino' ? (result.recordsets[5] || []).map((r) => ({ rating: num(r.Rating), orders: num(r.Orders) })) : [], users: profile === 'casino' ? (result.recordsets[6] || []).map((r) => ({ rut: num(r.Rut), name: clean(r.Name), orders: num(r.Orders) })) : [] };
};

module.exports = { dashboard };
