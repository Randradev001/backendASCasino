const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { normalizeGeneralDownloadQuery } = require('./casinoDescarga.rules');

const clean = (value) => (typeof value === 'string' ? value.trim() : value);
const normalizeRow = (row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, clean(value)]));

const get = async (query, context) => {
  const filters = normalizeGeneralDownloadQuery(query);
  const empCod = Number(context?.empCod);
  if (!Number.isInteger(empCod) || empCod < 1) throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa debe provenir de la sesion.');
  const request = (await getPool()).request()
    .input('empCod', sql.Int, empCod).input('from', sql.Date, filters.from).input('to', sql.Date, filters.to)
    .input('casinoId', sql.Decimal(10, 0), filters.casinoId).input('categoryId', sql.Decimal(10, 0), filters.categoryId)
    .input('productId', sql.Decimal(10, 0), filters.productId).input('motiveId', sql.SmallInt, filters.motiveId)
    .input('personRut', sql.Int, filters.personRut).input('divisionId', sql.Char(10), filters.divisionId)
    .input('subdivisionId', sql.Char(10), filters.subdivisionId).input('costCenterId', sql.Char(10), filters.costCenterId)
    .input('paymentControl', sql.SmallInt, filters.paymentControl).input('evaluation', sql.SmallInt, filters.evaluation)
    .input('status', sql.SmallInt, filters.status).input('q', sql.VarChar(102), filters.q ? `%${filters.q}%` : null)
    .input('offset', sql.Int, (filters.page - 1) * filters.pageSize).input('pageSize', sql.Int, filters.pageSize);
  const base = `
    FROM SSP06OPPedidosPlanta P
    JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
    JOIN SSP06MAProducto PR ON PR.GECODEMP=D.GECODEMP AND PR.PRODCodigo=D.PRODCodigo
    JOIN SSP06MATPProducto T ON T.GECODEMP=PR.GECODEMP AND T.TPPRCod=PR.TPPRCod
    JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod
    JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=P.GECODEMP AND DE.DESTICod=P.DESTICod
    JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
    JOIN FPPersonas F ON F.GECODEMP=P.GECODEMP AND F.PerRut=P.PedRutSolicita
    JOIN FPDivision V ON V.GECODEMP=D.GECODEMP AND V.DivId=D.DivId
    JOIN FPDivisionSub S ON S.GECODEMP=D.GECODEMP AND S.DivId=D.DivId AND S.SdiId=D.SdiId
    JOIN FPCenCos CC ON CC.GECODEMP=D.GECODEMP AND CC.CecId=D.CecId
    OUTER APPLY (SELECT TOP 1 E.EVPedEvaluacion evaluation FROM SSP06OPEvalPedidoCasino E
      WHERE E.GECODEMP=P.GECODEMP AND E.PEDNumero=P.PEDNumero ORDER BY E.EVPEDFecha DESC,E.EVPedCod DESC) EV
    WHERE P.GECODEMP=@empCod
      AND (@from IS NULL OR D.PED1FechaEnt>=@from) AND (@to IS NULL OR D.PED1FechaEnt<DATEADD(day,1,@to))
      AND (@casinoId IS NULL OR P.CASICod=@casinoId) AND (@categoryId IS NULL OR PR.TPPRCod=@categoryId)
      AND (@productId IS NULL OR D.PRODCodigo=@productId) AND (@motiveId IS NULL OR P.Mot6Cod=@motiveId)
      AND (@personRut IS NULL OR P.PedRutSolicita=@personRut) AND (@divisionId IS NULL OR D.DivId=@divisionId)
      AND (@subdivisionId IS NULL OR D.SdiId=@subdivisionId) AND (@costCenterId IS NULL OR D.CecId=@costCenterId)
      AND (@paymentControl IS NULL OR P.PEDControlPago=@paymentControl)
      AND (@evaluation IS NULL OR COALESCE(EV.evaluation,0)=@evaluation) AND (@status IS NULL OR P.PedEstadoIngreso=@status)
      AND (@q IS NULL OR CONVERT(varchar(20),P.PEDNumero) LIKE @q OR C.CASINom LIKE @q OR F.PernombreCom LIKE @q
        OR PR.PRODNombre LIKE @q OR T.TPPRNombre LIKE @q OR M.Mot6Descrip LIKE @q OR CC.CecDescripcion LIKE @q)`;
  const result = await request.query(`
    SELECT P.PEDNumero orderNumber,P.CASICod casinoId,RTRIM(C.CASINom) casino,D.PED1FechaEnt deliveryDate,P.PedHHEntrega deliveryTime,
      RTRIM(P.PEDDescripcion) description,P.DESTICod destinationId,RTRIM(DE.DESTINom) destination,P.Mot6Cod motiveId,RTRIM(M.Mot6Descrip) motive,
      P.PedRutSolicita personRut,RTRIM(F.PerDV) personDv,RTRIM(F.PernombreCom) person,PR.TPPRCod categoryId,RTRIM(T.TPPRNombre) category,
      D.PRODCodigo productId,RTRIM(PR.PRODNombre) product,D.PED1Cantidad quantity,D.PED1Precio unitPrice,
      CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio total,RTRIM(D.DivId) divisionId,RTRIM(V.DivDescripcion) division,
      RTRIM(D.SdiId) subdivisionId,RTRIM(S.SdiDescripcion) subdivision,RTRIM(D.CecId) costCenterId,RTRIM(CC.CecDescripcion) costCenter,
      P.PedEstadoIngreso status,P.PEDControlPago paymentControl,COALESCE(EV.evaluation,0) evaluation
    ${base} ORDER BY D.PED1FechaEnt DESC,P.PEDNumero DESC,D.PRODCodigo${filters.exportAll ? ';' : ' OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;'}
    SELECT COUNT(*) totalRows,COUNT(DISTINCT P.PEDNumero) orders,SUM(CONVERT(bigint,D.PED1Cantidad)) units,
      COALESCE(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio),0) amount ${base};
    SELECT CASICod id,RTRIM(CASINom) name FROM SSP06MACasinosPlanta WHERE GECODEMP=@empCod ORDER BY name;
    SELECT TPPRCod id,RTRIM(TPPRNombre) name FROM SSP06MATPProducto WHERE GECODEMP=@empCod ORDER BY TPPROrden,name;
    SELECT PRODCodigo id,RTRIM(PRODNombre) name,TPPRCod categoryId,CASICod casinoId FROM SSP06MAProducto WHERE GECODEMP=@empCod ORDER BY name;
    SELECT Mot6Cod id,RTRIM(Mot6Descrip) name FROM SSP06MAMotivoPedidos WHERE GECODEMP=@empCod ORDER BY name;
    SELECT RTRIM(DivId) id,RTRIM(DivDescripcion) name FROM FPDivision WHERE GECODEMP=@empCod ORDER BY name;
    SELECT RTRIM(SdiId) id,RTRIM(SdiDescripcion) name,RTRIM(DivId) divisionId FROM FPDivisionSub WHERE GECODEMP=@empCod ORDER BY name;
    SELECT RTRIM(CecId) id,RTRIM(CecDescripcion) name FROM FPCenCos WHERE GECODEMP=@empCod ORDER BY name;`);
  const summary = result.recordsets[1]?.[0] || {};
  return {
    rows: (result.recordsets[0] || []).map(normalizeRow), page: filters.page, pageSize: filters.pageSize,
    total: Number(summary.totalRows || 0),
    summary: { lines: Number(summary.totalRows || 0), orders: Number(summary.orders || 0), units: Number(summary.units || 0), amount: Number(summary.amount || 0) },
    catalogs: { casinos: result.recordsets[2] || [], categories: result.recordsets[3] || [], products: result.recordsets[4] || [], motives: result.recordsets[5] || [], divisions: result.recordsets[6] || [], subdivisions: result.recordsets[7] || [], costCenters: result.recordsets[8] || [] }
  };
};

module.exports = { get };
