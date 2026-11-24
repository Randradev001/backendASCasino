const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { normalizeReport, normalizeQuery } = require('./casinoConsultas.rules');

const clean = (value) => String(value ?? '').trim();
const number = (value) => Number(value || 0);
const periodKey = (value) => `period_${String(value).replace('-', '_')}`;
const periodsBetween = (from, to) => {
  if (!from || !to) return [];
  const periods = [];
  const current = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const last = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  while (current <= last) {
    const value = current.toISOString().slice(0, 7);
    periods.push({ value, key: periodKey(value) });
    current.setUTCMonth(current.getUTCMonth() + 1);
  }
  return periods;
};

const reportConfig = {
  'tipo-producto': {
    key: 'CONCAT(P.CASICod,\'-\',PR.TPPRCod)', label: "RTRIM(C.CASINom)+' · '+RTRIM(T.TPPRNombre)",
    select: 'P.CASICod casinoId,RTRIM(C.CASINom) casino,PR.TPPRCod categoryId,RTRIM(T.TPPRNombre) category',
    group: 'P.CASICod,C.CASINom,PR.TPPRCod,T.TPPRNombre'
  },
  'centro-costo': {
    key: 'RTRIM(D.DivId)', label: 'RTRIM(V.DivDescripcion)',
    select: 'RTRIM(D.DivId) divisionId,RTRIM(V.DivDescripcion) division', group: 'D.DivId,V.DivDescripcion'
  },
  persona: {
    key: 'CONVERT(varchar(20),P.PedRutSolicita)', label: 'RTRIM(F.PernombreCom)',
    select: 'P.PedRutSolicita personRut,RTRIM(F.PerDV) personDv,RTRIM(F.PernombreCom) person',
    group: 'P.PedRutSolicita,F.PerDV,F.PernombreCom'
  },
  motivo: {
    key: 'CONCAT(P.CASICod,\'-\',P.Mot6Cod)', label: "RTRIM(C.CASINom)+' · '+RTRIM(M.Mot6Descrip)",
    select: 'P.CASICod casinoId,RTRIM(C.CASINom) casino,P.Mot6Cod motiveId,RTRIM(M.Mot6Descrip) motive',
    group: 'P.CASICod,C.CASINom,P.Mot6Cod,M.Mot6Descrip'
  }
};

const get = async (reportValue, query, context) => {
  const report = normalizeReport(reportValue); const filters = normalizeQuery(query); const empCod = Number(context?.empCod);
  if (!Number.isInteger(empCod) || empCod < 1) throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa debe provenir de la sesion.');
  const config = reportConfig[report];
  const request = (await getPool()).request().input('empCod', sql.Int, empCod).input('from', sql.Date, filters.from).input('to', sql.Date, filters.to)
    .input('casinoId', sql.Decimal(10, 0), filters.casinoId).input('categoryId', sql.Decimal(10, 0), filters.categoryId)
    .input('motiveId', sql.SmallInt, filters.motiveId).input('personRut', sql.Int, filters.personRut)
    .input('divisionId', sql.Char(10), filters.divisionId).input('q', sql.VarChar(102), filters.q ? `%${filters.q}%` : null);
  const result = await request.query(`
    SELECT ${config.key} id,${config.label} label,${config.select},CONVERT(char(7),D.PED1FechaEnt,126) period,
      SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio) amount,
      COUNT(DISTINCT P.PEDNumero) orders,SUM(CONVERT(bigint,D.PED1Cantidad)) units
    FROM SSP06OPPedidosPlanta P
    JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
    JOIN SSP06MAProducto PR ON PR.GECODEMP=D.GECODEMP AND PR.PRODCodigo=D.PRODCodigo
    JOIN SSP06MATPProducto T ON T.GECODEMP=PR.GECODEMP AND T.TPPRCod=PR.TPPRCod
    JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod
    JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
    JOIN SSP06VWSolicitanteHistorico F ON F.GECODEMP=P.GECODEMP AND F.PerRut=P.PedRutSolicita
    JOIN FPDivision V ON V.GECODEMP=D.GECODEMP AND V.DivId=D.DivId
    WHERE P.GECODEMP=@empCod AND P.PedEstadoIngreso=3
      AND (@from IS NULL OR D.PED1FechaEnt>=@from)
      AND (@to IS NULL OR D.PED1FechaEnt<DATEADD(day,1,@to))
      AND (@casinoId IS NULL OR P.CASICod=@casinoId)
      AND (@categoryId IS NULL OR PR.TPPRCod=@categoryId)
      AND (@motiveId IS NULL OR P.Mot6Cod=@motiveId)
      AND (@personRut IS NULL OR P.PedRutSolicita=@personRut)
      AND (@divisionId IS NULL OR D.DivId=@divisionId)
      AND (@q IS NULL OR ${config.label} LIKE @q)
    GROUP BY ${config.group},CONVERT(char(7),D.PED1FechaEnt,126)
    ORDER BY label,period;
    SELECT P.CASICod id,RTRIM(C.CASINom) name FROM SSP06OPPedidosPlanta P JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod WHERE P.GECODEMP=@empCod GROUP BY P.CASICod,C.CASINom ORDER BY name;
    SELECT TPPRCod id,RTRIM(TPPRNombre) name FROM SSP06MATPProducto WHERE GECODEMP=@empCod ORDER BY TPPROrden,name;
    SELECT Mot6Cod id,RTRIM(Mot6Descrip) name FROM SSP06MAMotivoPedidos WHERE GECODEMP=@empCod ORDER BY name;
    SELECT RTRIM(DivId) id,RTRIM(DivDescripcion) name FROM FPDivision WHERE GECODEMP=@empCod ORDER BY name;`);
  const grouped = new Map();
  const observedPeriods = new Set();
  for (const source of result.recordsets[0] || []) {
    const id = clean(source.id);
    const period = clean(source.period);
    observedPeriods.add(period);
    if (!grouped.has(id)) {
      const row = Object.fromEntries(Object.entries(source)
        .filter(([key]) => !['period', 'amount', 'orders', 'units'].includes(key))
        .map(([key, value]) => [key, typeof value === 'string' ? clean(value) : number(value)]));
      grouped.set(id, { ...row, total: 0, orders: 0, units: 0 });
    }
    const row = grouped.get(id);
    row[periodKey(period)] = number(source.amount);
    row.total += number(source.amount);
    row.orders += number(source.orders);
    row.units += number(source.units);
  }
  const rows = [...grouped.values()];
  const requestedPeriods = periodsBetween(filters.from, filters.to);
  const periods = (requestedPeriods.length ? requestedPeriods : [...observedPeriods].sort().map((value) => ({ value, key: periodKey(value) })));
  for (const row of rows) for (const period of periods) row[period.key] ??= 0;
  const totals = Object.fromEntries(periods.map((period) => [period.key, rows.reduce((sum, row) => sum + number(row[period.key]), 0)]));
  totals.total = rows.reduce((sum, row) => sum + number(row.total), 0);
  return { report, from: filters.from, to: filters.to, periods, rows, totals, summary: { groups: rows.length, orders: rows.reduce((sum, row) => sum + number(row.orders), 0), units: rows.reduce((sum, row) => sum + number(row.units), 0), amount: totals.total }, catalogs: { casinos: result.recordsets[1] || [], categories: result.recordsets[2] || [], motives: result.recordsets[3] || [], divisions: result.recordsets[4] || [] } };
};

module.exports = { get, periodsBetween };
