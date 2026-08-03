const { SecurityError } = require('./seguridad.service');

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const optionalInteger = (value, label) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valido.`);
  return result;
};

const normalizeHistoryQuery = (query = {}) => {
  const from = query.from ? String(query.from).trim() : null;
  const to = query.to ? String(query.to).trim() : null;
  if ((from && !validDate(from)) || (to && !validDate(to))) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Las fechas deben usar el formato AAAA-MM-DD.');
  }
  if (from && to && from > to) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'La fecha desde no puede ser posterior a la fecha hasta.');
  }

  const page = Math.max(1, optionalInteger(query.page, 'La pagina') || 1);
  const requestedSize = optionalInteger(query.pageSize, 'El tamaño de pagina') || 10;
  const pageSize = [10, 25, 50].includes(requestedSize) ? requestedSize : 10;
  const search = String(query.search || '').trim().slice(0, 80);

  return {
    from,
    to,
    status: optionalInteger(query.status, 'El estado'),
    casinoId: optionalInteger(query.casinoId, 'El casino'),
    destinationId: optionalInteger(query.destinationId, 'El destino'),
    motiveId: optionalInteger(query.motiveId, 'El motivo'),
    categoryId: optionalInteger(query.categoryId, 'El tipo de producto'),
    productId: optionalInteger(query.productId, 'El producto'),
    search,
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const buildHistoryInsight = ({ orders, delivered, typeCounters = [], productCounters = [], trend = [] }) => {
  if (!orders) return 'No existen pedidos para los filtros seleccionados. Pruebe ampliando el periodo o quitando filtros.';
  const fulfillment = (Number(delivered || 0) / Number(orders)) * 100;
  const leadType = typeCounters[0]?.name || 'Sin tipo dominante';
  const leadProduct = productCounters[0]?.name || 'Sin producto dominante';
  const current = Number(trend.at(-1)?.orders || 0);
  const previous = Number(trend.at(-2)?.orders || 0);
  const comparison = previous
    ? `El ultimo periodo ${current >= previous ? 'aumenta' : 'disminuye'} ${Math.abs(((current - previous) / previous) * 100).toFixed(0)}% frente al anterior.`
    : 'Aun no hay dos periodos comparables.';
  return `${fulfillment.toFixed(0)}% de los pedidos esta entregado. ${leadType} lidera por tipo y ${leadProduct} por unidades. ${comparison}`;
};

module.exports = { normalizeHistoryQuery, buildHistoryInsight };
