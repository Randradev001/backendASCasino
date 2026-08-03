const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { PLANTS, normalizeDashboardQuery, statusLabel, buildBusinessAnalysis } = require('./casinoBi.rules');

const clean = (value) => String(value || '').trim();
const numeric = (value) => Number(value || 0);

const plantCase = `CASE
  WHEN RTRIM(D.DivId) IN ('D053','D054','D055') OR UPPER(RTRIM(ISNULL(FD.DivDescripcion,''))) LIKE '%ROSARIO%' THEN 'rosario'
  WHEN UPPER(RTRIM(ISNULL(FD.DivDescripcion,''))) LIKE '%SAN VICENTE%' THEN 'san-vicente'
  WHEN UPPER(RTRIM(ISNULL(FD.DivDescripcion,''))) LIKE '%LO MIRANDA%' THEN 'lo-miranda'
  ELSE 'unmapped'
END`;

const bindFilters = (request, filters, context) => {
  request.input('empCod', sql.Int, context.empCod);
  if (filters.from) request.input('from', sql.Date, filters.from);
  if (filters.to) request.input('to', sql.Date, filters.to);
  if (filters.plant !== 'all') request.input('plant', sql.VarChar(20), filters.plant);
  return request;
};

const filterSql = (filters) => [
  'P.GECODEMP=@empCod',
  filters.from ? 'P.PEDFechaCrea>=@from' : null,
  filters.to ? 'P.PEDFechaCrea<DATEADD(day,1,@to)' : null,
  filters.plant !== 'all' ? `${plantCase}=@plant` : null
].filter(Boolean).join(' AND ');

const baseCte = (filters) => `
  WITH Lines AS (
    SELECT P.PEDNumero, P.PEDFechaCrea, P.pedfechaEntrega, P.PedEstadoIngreso,
           P.CASICod, P.DESTICod, P.Mot6Cod, P.PEDSolicita,
           D.PRODCodigo, D.PED1Cantidad, D.PED1Precio, RTRIM(D.DivId) AS DivId,
           RTRIM(ISNULL(FD.DivDescripcion,'')) AS DivDescripcion,
           ${plantCase} AS PlantKey
    FROM SSP06OPPedidosPlanta P
    INNER JOIN SSP06OPPedidosPlantaDet D
      ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
    LEFT JOIN FPDivision FD
      ON FD.GECODEMP=D.GECODEMP AND RTRIM(FD.DivId)=RTRIM(D.DivId)
    WHERE ${filterSql(filters)}
  )`;

const mapPlant = (row) => ({
  id: clean(row.PlantKey),
  name: clean(row.PlantName),
  mapped: clean(row.PlantKey) !== 'unmapped',
  orders: numeric(row.Orders),
  quantity: numeric(row.Quantity),
  amount: numeric(row.Amount),
  delivered: numeric(row.Delivered),
  cancelled: numeric(row.Cancelled)
});

const dashboard = async (query, context) => {
  if (!Number.isInteger(Number(context?.empCod))) {
    throw new SecurityError(401, 'AUTH_REQUIRED', 'La empresa debe provenir de la sesion autenticada.');
  }

  const filters = normalizeDashboardQuery(query);
  const pool = await getPool();
  const request = bindFilters(pool.request(), filters, context);
  const cte = baseCte(filters);
  const result = await request.query(`
    ${cte}
    SELECT COUNT(DISTINCT PEDNumero) AS Orders,
           COUNT(DISTINCT CASE WHEN PedEstadoIngreso=3 THEN PEDNumero END) AS Delivered,
           COUNT(DISTINCT CASE WHEN PedEstadoIngreso IN (0,1,2) THEN PEDNumero END) AS Pending,
           COUNT(DISTINCT CASE WHEN PedEstadoIngreso=5 THEN PEDNumero END) AS Cancelled,
           ISNULL(SUM(CONVERT(decimal(18,2),PED1Cantidad)),0) AS Quantity,
           ISNULL(SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio),0) AS Amount,
           MIN(PEDFechaCrea) AS DataFrom, MAX(PEDFechaCrea) AS DataTo
    FROM Lines;

    ${cte}
    SELECT PlantKey,
           CASE PlantKey WHEN 'rosario' THEN 'Faenadora Rosario'
                         WHEN 'san-vicente' THEN 'Faenadora San Vicente'
                         WHEN 'lo-miranda' THEN 'Faenadora Lo Miranda'
                         ELSE COALESCE(NULLIF(MAX(DivDescripcion),''),'Division sin homologar') END AS PlantName,
           COUNT(DISTINCT PEDNumero) AS Orders,
           SUM(CONVERT(decimal(18,2),PED1Cantidad)) AS Quantity,
           SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio) AS Amount,
           COUNT(DISTINCT CASE WHEN PedEstadoIngreso=3 THEN PEDNumero END) AS Delivered,
           COUNT(DISTINCT CASE WHEN PedEstadoIngreso=5 THEN PEDNumero END) AS Cancelled
    FROM Lines GROUP BY PlantKey ORDER BY Amount DESC;

    ${cte}
    SELECT CONVERT(char(7),PEDFechaCrea,120) AS Period,
           COUNT(DISTINCT PEDNumero) AS Orders,
           SUM(CONVERT(decimal(18,2),PED1Cantidad)) AS Quantity,
           SUM(CONVERT(decimal(18,2),PED1Cantidad)*PED1Precio) AS Amount
    FROM Lines GROUP BY CONVERT(char(7),PEDFechaCrea,120) ORDER BY Period;

    ${cte}
    SELECT PedEstadoIngreso AS Status, COUNT(DISTINCT PEDNumero) AS Orders
    FROM Lines GROUP BY PedEstadoIngreso ORDER BY PedEstadoIngreso;

    ${cte}
    SELECT TOP (8) L.PRODCodigo, RTRIM(ISNULL(PR.ProdNombre,'Producto sin nombre')) AS ProductName,
           COUNT(DISTINCT L.PEDNumero) AS Orders,
           SUM(CONVERT(decimal(18,2),L.PED1Cantidad)) AS Quantity,
           SUM(CONVERT(decimal(18,2),L.PED1Cantidad)*L.PED1Precio) AS Amount
    FROM Lines L
    LEFT JOIN SSP06MAProducto PR ON PR.GECODEMP=@empCod AND PR.PRODCodigo=L.PRODCodigo
    GROUP BY L.PRODCodigo, PR.ProdNombre ORDER BY Amount DESC;

    ${cte}
    SELECT L.Mot6Cod, RTRIM(ISNULL(M.Mot6Descrip,'Sin motivo')) AS Motive,
           COUNT(DISTINCT L.PEDNumero) AS Orders,
           SUM(CONVERT(decimal(18,2),L.PED1Cantidad)*L.PED1Precio) AS Amount
    FROM Lines L
    LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=@empCod AND M.Mot6Cod=L.Mot6Cod
    GROUP BY L.Mot6Cod, M.Mot6Descrip ORDER BY Orders DESC;

    ${cte}
    SELECT TOP (8) L.PEDNumero, MAX(L.PEDFechaCrea) AS CreatedAt, MAX(L.pedfechaEntrega) AS DeliveryAt,
           MAX(L.PedEstadoIngreso) AS Status, MAX(L.PlantKey) AS PlantKey,
           RTRIM(ISNULL(MAX(C.CASINom),'Casino sin nombre')) AS Casino,
           RTRIM(ISNULL(MAX(DE.DESTINom),'Destino sin nombre')) AS Destination,
           MAX(RTRIM(L.PEDSolicita)) AS RequestedBy,
           SUM(CONVERT(decimal(18,2),L.PED1Cantidad)) AS Quantity,
           SUM(CONVERT(decimal(18,2),L.PED1Cantidad)*L.PED1Precio) AS Amount
    FROM Lines L
    LEFT JOIN SSP06MACasinosPlanta C ON C.GECODEMP=@empCod AND C.CASICod=L.CASICod
    LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=@empCod AND DE.DESTICod=L.DESTICod
    GROUP BY L.PEDNumero ORDER BY CreatedAt DESC, L.PEDNumero DESC;
  `);

  const summary = result.recordsets[0]?.[0] || {};
  const rowsByPlant = new Map((result.recordsets[1] || []).map((row) => [clean(row.PlantKey), mapPlant(row)]));
  const plants = PLANTS.map((plant) => rowsByPlant.get(plant.id) || {
    id: plant.id,
    name: plant.name,
    mapped: plant.codes.length > 0,
    orders: 0,
    quantity: 0,
    amount: 0,
    delivered: 0,
    cancelled: 0
  });
  const unmappedPlants = (result.recordsets[1] || []).filter((row) => clean(row.PlantKey) === 'unmapped').map(mapPlant);
  const orders = numeric(summary.Orders);
  const amount = numeric(summary.Amount);

  const response = {
    metadata: {
      generatedAt: new Date().toISOString(),
      dataFrom: summary.DataFrom || null,
      dataTo: summary.DataTo || null,
      filters,
      company: Number(context.empCod),
      source: 'SSP06OPPedidosPlanta / SSP06OPPedidosPlantaDet'
    },
    kpis: {
      orders,
      delivered: numeric(summary.Delivered),
      pending: numeric(summary.Pending),
      cancelled: numeric(summary.Cancelled),
      quantity: numeric(summary.Quantity),
      amount,
      averageTicket: orders ? amount / orders : 0,
      fulfillmentRate: orders ? (numeric(summary.Delivered) / orders) * 100 : 0
    },
    plants,
    unmappedPlants,
    trend: (result.recordsets[2] || []).map((row) => ({
      period: clean(row.Period), orders: numeric(row.Orders), quantity: numeric(row.Quantity), amount: numeric(row.Amount)
    })),
    statuses: (result.recordsets[3] || []).map((row) => ({ status: Number(row.Status), label: statusLabel(row.Status), orders: numeric(row.Orders) })),
    topProducts: (result.recordsets[4] || []).map((row) => ({
      code: numeric(row.PRODCodigo), name: clean(row.ProductName), orders: numeric(row.Orders), quantity: numeric(row.Quantity), amount: numeric(row.Amount)
    })),
    motives: (result.recordsets[5] || []).map((row) => ({
      code: numeric(row.Mot6Cod), name: clean(row.Motive), orders: numeric(row.Orders), amount: numeric(row.Amount)
    })),
    recentOrders: (result.recordsets[6] || []).map((row) => ({
      number: numeric(row.PEDNumero), createdAt: row.CreatedAt, deliveryAt: row.DeliveryAt,
      status: Number(row.Status), statusLabel: statusLabel(row.Status), plant: clean(row.PlantKey),
      casino: clean(row.Casino), destination: clean(row.Destination), requestedBy: clean(row.RequestedBy),
      quantity: numeric(row.Quantity), amount: numeric(row.Amount)
    }))
  };

  return { ...response, ...buildBusinessAnalysis(response) };
};

module.exports = { dashboard };
