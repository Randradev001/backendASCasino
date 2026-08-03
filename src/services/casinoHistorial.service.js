const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { statusLabel } = require('./casinoBi.rules');
const { normalizeHistoryQuery, buildHistoryInsight } = require('./casinoHistorial.rules');

const clean = (value) => String(value || '').trim();
const numeric = (value) => Number(value || 0);

const assertCompany = (context) => {
  const empCod = Number(context?.empCod);
  if (!Number.isInteger(empCod) || empCod < 1) {
    throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa debe provenir de la sesion.');
  }
  return empCod;
};

const bindHistory = (request, filters, empCod) => {
  request.input('empCod', sql.Int, empCod).input('offset', sql.Int, filters.offset).input('pageSize', sql.Int, filters.pageSize);
  if (filters.from) request.input('from', sql.Date, filters.from);
  if (filters.to) request.input('to', sql.Date, filters.to);
  if (filters.status !== null) request.input('status', sql.SmallInt, filters.status);
  if (filters.casinoId !== null) request.input('casinoId', sql.Decimal(10, 0), filters.casinoId);
  if (filters.destinationId !== null) request.input('destinationId', sql.Decimal(10, 0), filters.destinationId);
  if (filters.motiveId !== null) request.input('motiveId', sql.SmallInt, filters.motiveId);
  if (filters.categoryId !== null) request.input('categoryId', sql.Decimal(10, 0), filters.categoryId);
  if (filters.productId !== null) request.input('productId', sql.Decimal(10, 0), filters.productId);
  if (filters.search) request.input('search', sql.VarChar(84), `%${filters.search}%`);
  return request;
};

const historyWhere = (filters) => [
  'P.GECODEMP=@empCod',
  filters.from ? 'P.PEDFechaCrea>=@from' : null,
  filters.to ? 'P.PEDFechaCrea<DATEADD(day,1,@to)' : null,
  filters.status !== null ? 'P.PedEstadoIngreso=@status' : null,
  filters.casinoId !== null ? 'P.CASICod=@casinoId' : null,
  filters.destinationId !== null ? 'P.DESTICod=@destinationId' : null,
  filters.motiveId !== null ? 'P.Mot6Cod=@motiveId' : null,
  filters.categoryId !== null ? 'PR.TPPRCod=@categoryId' : null,
  filters.productId !== null ? 'D.PRODCodigo=@productId' : null,
  filters.search ? `(CONVERT(varchar(20),P.PEDNumero) LIKE @search OR RTRIM(P.PEDSolicita) LIKE @search
    OR RTRIM(ISNULL(PE.PernombreCom,'')) LIKE @search)` : null
].filter(Boolean).join(' AND ');

const historyCte = (filters) => `
  WITH FilteredLines AS (
    SELECT P.PEDNumero,P.PEDDescripcion,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,
           P.PedEstadoIngreso,P.CASICod,P.DESTICod,P.Mot6Cod,RTRIM(P.PEDSolicita) PEDSolicita,
           P.PedRutSolicita,D.PRODCodigo,D.PED1Cantidad,D.PED1Precio,
           PR.TPPRCod,RTRIM(ISNULL(PR.ProdNombre,'Producto sin nombre')) ProductName,
           RTRIM(ISNULL(T.TPPRNombre,'Sin tipo')) TypeName,
           RTRIM(ISNULL(PE.PernombreCom,'')) RequesterName
    FROM SSP06OPPedidosPlanta P
    INNER JOIN SSP06OPPedidosPlantaDet D
      ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
    LEFT JOIN SSP06MAProducto PR
      ON PR.GECODEMP=D.GECODEMP AND PR.PRODCodigo=D.PRODCodigo
    LEFT JOIN SSP06MATPProducto T
      ON T.GECODEMP=PR.GECODEMP AND T.TPPRCod=PR.TPPRCod
    LEFT JOIN FPPersonas PE
      ON PE.GECODEMP=P.GECODEMP AND PE.PerRut=P.PedRutSolicita
    WHERE ${historyWhere(filters)}
  )`;

const getHistory = async (query, context) => {
  const empCod = assertCompany(context);
  const filters = normalizeHistoryQuery(query);
  const pool = await getPool();
  const cte = historyCte(filters);
  const [result, catalogs] = await Promise.all([
    bindHistory(pool.request(), filters, empCod).query(`
      ${cte}
      SELECT COUNT(DISTINCT PEDNumero) Orders,
             COUNT(DISTINCT CASE WHEN PedEstadoIngreso=3 THEN PEDNumero END) Delivered,
             COUNT(DISTINCT CASE WHEN PedEstadoIngreso IN (0,1,2) THEN PEDNumero END) Pending,
             COUNT(DISTINCT CASE WHEN PedEstadoIngreso=5 THEN PEDNumero END) Cancelled,
             ISNULL(SUM(CONVERT(decimal(18,2),PED1Cantidad)),0) Quantity,
             ISNULL(SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio),0) Amount
      FROM FilteredLines;

      ${cte}
      SELECT TPPRCod TypeId,MAX(TypeName) TypeName,COUNT(DISTINCT PEDNumero) Orders,
             SUM(CONVERT(decimal(18,2),PED1Cantidad)) Quantity,
             SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio) Amount
      FROM FilteredLines GROUP BY TPPRCod ORDER BY Quantity DESC,TypeName;

      ${cte}
      SELECT TOP (8) PRODCodigo ProductId,MAX(ProductName) ProductName,COUNT(DISTINCT PEDNumero) Orders,
             SUM(CONVERT(decimal(18,2),PED1Cantidad)) Quantity,
             SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio) Amount
      FROM FilteredLines GROUP BY PRODCodigo ORDER BY Quantity DESC,ProductName;

      ${cte}
      SELECT CONVERT(char(7),PEDFechaCrea,120) Period,COUNT(DISTINCT PEDNumero) Orders,
             SUM(CONVERT(decimal(18,2),PED1Cantidad)) Quantity,
             SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio) Amount
      FROM FilteredLines GROUP BY CONVERT(char(7),PEDFechaCrea,120) ORDER BY Period;

      ${cte}
      SELECT COUNT(DISTINCT PEDNumero) Total FROM FilteredLines;

      ${cte}
      SELECT F.PEDNumero,MAX(F.PEDFechaCrea) CreatedAt,MAX(F.pedfechaEntrega) DeliveryAt,
             MAX(F.PedHHEntrega) DeliveryTime,MAX(F.PedEstadoIngreso) Status,
             MAX(F.CASICod) CasinoId,RTRIM(ISNULL(MAX(C.CASINom),'Casino sin nombre')) Casino,
             MAX(F.DESTICod) DestinationId,RTRIM(ISNULL(MAX(DE.DESTINom),'Destino sin nombre')) Destination,
             MAX(F.Mot6Cod) MotiveId,RTRIM(ISNULL(MAX(M.Mot6Descrip),'Sin motivo')) Motive,
             MAX(F.PedRutSolicita) RequesterRut,MAX(F.RequesterName) RequesterName,MAX(F.PEDSolicita) RequestedBy,
             COUNT(DISTINCT F.PRODCodigo) Products,SUM(CONVERT(decimal(18,2),F.PED1Cantidad)) Quantity,
             SUM(CONVERT(decimal(18,2),F.PED1Cantidad)*F.PED1Precio) Amount
      FROM FilteredLines F
      LEFT JOIN SSP06MACasinosPlanta C ON C.GECODEMP=@empCod AND C.CASICod=F.CASICod
      LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=@empCod AND DE.DESTICod=F.DESTICod
      LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=@empCod AND M.Mot6Cod=F.Mot6Cod
      GROUP BY F.PEDNumero
      ORDER BY CreatedAt DESC,F.PEDNumero DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `),
    pool.request().input('empCod', sql.Int, empCod).query(`
      SELECT CASICod,RTRIM(CASINom) Name FROM SSP06MACasinosPlanta WHERE GECODEMP=@empCod ORDER BY CASINom;
      SELECT DESTICod,RTRIM(DESTINom) Name FROM SSP06MADestinosPlanta WHERE GECODEMP=@empCod ORDER BY DESTINom;
      SELECT Mot6Cod,RTRIM(Mot6Descrip) Name FROM SSP06MAMotivoPedidos WHERE GECODEMP=@empCod ORDER BY Mot6Descrip;
      SELECT TPPRCod,RTRIM(TPPRNombre) Name FROM SSP06MATPProducto WHERE GECODEMP=@empCod ORDER BY TPPROrden,TPPRNombre;
      SELECT PRODCodigo,TPPRCod,RTRIM(ProdNombre) Name FROM SSP06MAProducto WHERE GECODEMP=@empCod ORDER BY ProdNombre;
    `)
  ]);

  const summary = result.recordsets[0]?.[0] || {};
  const typeCounters = (result.recordsets[1] || []).map((row) => ({
    id: numeric(row.TypeId), name: clean(row.TypeName), orders: numeric(row.Orders), quantity: numeric(row.Quantity), amount: numeric(row.Amount)
  }));
  const productCounters = (result.recordsets[2] || []).map((row) => ({
    id: numeric(row.ProductId), name: clean(row.ProductName), orders: numeric(row.Orders), quantity: numeric(row.Quantity), amount: numeric(row.Amount)
  }));
  const trend = (result.recordsets[3] || []).map((row) => ({
    period: clean(row.Period), orders: numeric(row.Orders), quantity: numeric(row.Quantity), amount: numeric(row.Amount)
  }));
  const total = numeric(result.recordsets[4]?.[0]?.Total);
  const kpis = {
    orders: numeric(summary.Orders), delivered: numeric(summary.Delivered), pending: numeric(summary.Pending),
    cancelled: numeric(summary.Cancelled), quantity: numeric(summary.Quantity), amount: numeric(summary.Amount)
  };

  return {
    metadata: { generatedAt: new Date().toISOString(), company: empCod, filters },
    kpis,
    typeCounters,
    productCounters,
    trend,
    insight: buildHistoryInsight({ ...kpis, typeCounters, productCounters, trend }),
    orders: (result.recordsets[5] || []).map((row) => ({
      number: numeric(row.PEDNumero), createdAt: row.CreatedAt, deliveryAt: row.DeliveryAt, deliveryTime: row.DeliveryTime,
      status: Number(row.Status), statusLabel: statusLabel(row.Status), casinoId: numeric(row.CasinoId), casino: clean(row.Casino),
      destinationId: numeric(row.DestinationId), destination: clean(row.Destination), motiveId: numeric(row.MotiveId), motive: clean(row.Motive),
      requesterRut: numeric(row.RequesterRut), requesterName: clean(row.RequesterName), requestedBy: clean(row.RequestedBy),
      products: numeric(row.Products), quantity: numeric(row.Quantity), amount: numeric(row.Amount)
    })),
    pagination: { page: filters.page, pageSize: filters.pageSize, total, pages: Math.ceil(total / filters.pageSize) },
    catalogs: {
      casinos: (catalogs.recordsets[0] || []).map((row) => ({ id: numeric(row.CASICod), name: clean(row.Name) })),
      destinations: (catalogs.recordsets[1] || []).map((row) => ({ id: numeric(row.DESTICod), name: clean(row.Name) })),
      motives: (catalogs.recordsets[2] || []).map((row) => ({ id: numeric(row.Mot6Cod), name: clean(row.Name) })),
      categories: (catalogs.recordsets[3] || []).map((row) => ({ id: numeric(row.TPPRCod), name: clean(row.Name) })),
      products: (catalogs.recordsets[4] || []).map((row) => ({ id: numeric(row.PRODCodigo), categoryId: numeric(row.TPPRCod), name: clean(row.Name) })),
      statuses: [0, 1, 2, 3, 5].map((id) => ({ id, name: statusLabel(id) }))
    }
  };
};

const getOrderDetail = async (numberValue, context) => {
  const empCod = assertCompany(context);
  const orderNumber = Number(numberValue);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El numero de pedido no es valido.');
  const pool = await getPool();
  const result = await pool.request().input('empCod', sql.Int, empCod).input('orderNumber', sql.Decimal(10, 0), orderNumber).query(`
    SELECT P.PEDNumero,P.PEDDescripcion,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
           P.PedRutSolicita,RTRIM(P.PEDSolicita) PEDSolicita,RTRIM(ISNULL(PE.PernombreCom,'')) RequesterName,
           RTRIM(ISNULL(C.CASINom,'Casino sin nombre')) Casino,RTRIM(ISNULL(DE.DESTINom,'Destino sin nombre')) Destination,
           RTRIM(ISNULL(M.Mot6Descrip,'Sin motivo')) Motive
    FROM SSP06OPPedidosPlanta P
    LEFT JOIN FPPersonas PE ON PE.GECODEMP=P.GECODEMP AND PE.PerRut=P.PedRutSolicita
    LEFT JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod
    LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=P.GECODEMP AND DE.DESTICod=P.DESTICod
    LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
    WHERE P.GECODEMP=@empCod AND P.PEDNumero=@orderNumber;

    SELECT D.PRODCodigo,RTRIM(ISNULL(PR.ProdNombre,'Producto sin nombre')) ProductName,
           RTRIM(ISNULL(T.TPPRNombre,'Sin tipo')) TypeName,D.PED1Cantidad,D.PED1Precio,D.PED1FechaEnt,
           RTRIM(D.DivId) DivisionId,RTRIM(ISNULL(FD.DivDescripcion,'')) Division,
           RTRIM(D.SdiId) SubdivisionId,RTRIM(ISNULL(FS.SdiDescripcion,'')) Subdivision,
           RTRIM(D.CecId) CostCenterId,RTRIM(ISNULL(FC.CecDescripcion,'')) CostCenter
    FROM SSP06OPPedidosPlantaDet D
    LEFT JOIN SSP06MAProducto PR ON PR.GECODEMP=D.GECODEMP AND PR.PRODCodigo=D.PRODCodigo
    LEFT JOIN SSP06MATPProducto T ON T.GECODEMP=PR.GECODEMP AND T.TPPRCod=PR.TPPRCod
    LEFT JOIN FPDivision FD ON FD.GECODEMP=D.GECODEMP AND FD.DivId=D.DivId
    LEFT JOIN FPDivisionSub FS ON FS.GECODEMP=D.GECODEMP AND FS.DivId=D.DivId AND FS.SdiId=D.SdiId
    LEFT JOIN FPCenCos FC ON FC.GECODEMP=D.GECODEMP AND FC.CecId=D.CecId
    WHERE D.GECODEMP=@empCod AND D.PEDNumero=@orderNumber
    ORDER BY T.TPPROrden,PR.ProdNombre;
  `);
  const header = result.recordsets[0]?.[0];
  if (!header) throw new SecurityError(404, 'ORDER_NOT_FOUND', 'El pedido no existe en la empresa autenticada.');
  const lines = (result.recordsets[1] || []).map((row) => ({
    productId: numeric(row.PRODCodigo), productName: clean(row.ProductName), typeName: clean(row.TypeName),
    quantity: numeric(row.PED1Cantidad), price: numeric(row.PED1Precio), amount: numeric(row.PED1Cantidad) * numeric(row.PED1Precio),
    deliveryAt: row.PED1FechaEnt,
    location: { divisionId: clean(row.DivisionId), division: clean(row.Division), subdivisionId: clean(row.SubdivisionId), subdivision: clean(row.Subdivision), costCenterId: clean(row.CostCenterId), costCenter: clean(row.CostCenter) }
  }));
  return {
    number: numeric(header.PEDNumero), description: clean(header.PEDDescripcion), createdAt: header.PEDFechaCrea,
    deliveryAt: header.pedfechaEntrega, deliveryTime: header.PedHHEntrega, status: Number(header.PedEstadoIngreso),
    statusLabel: statusLabel(header.PedEstadoIngreso), requesterRut: numeric(header.PedRutSolicita), requesterName: clean(header.RequesterName),
    requestedBy: clean(header.PEDSolicita), casino: clean(header.Casino), destination: clean(header.Destination), motive: clean(header.Motive),
    lines, quantity: lines.reduce((sum, line) => sum + line.quantity, 0), amount: lines.reduce((sum, line) => sum + line.amount, 0)
  };
};

module.exports = { getHistory, getOrderDetail };
