const { SecurityError } = require('./seguridad.service');

const optionalInteger = (value, label, allowed) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || (allowed ? !allowed.includes(parsed) : parsed < 1)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valido.`);
  }
  return parsed;
};

const optionalDate = (value, label) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valida.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valida.`);
  }
  return text;
};

const normalizeGeneralDownloadQuery = (query = {}) => {
  const from = optionalDate(query.from, 'La fecha desde');
  const to = optionalDate(query.to, 'La fecha hasta');
  if (from && to && from > to) throw new SecurityError(400, 'VALIDATION_ERROR', 'La fecha desde no puede superar la fecha hasta.');
  const page = optionalInteger(query.page || 1, 'La pagina');
  const pageSize = optionalInteger(query.pageSize || 25, 'El tamano de pagina');
  if (pageSize > 1000) throw new SecurityError(400, 'VALIDATION_ERROR', 'El tamano de pagina no puede superar 1000.');
  return {
    from, to, page, pageSize, exportAll: query.export === '1' || query.export === 1 || query.export === true,
    casinoId: optionalInteger(query.casinoId, 'El casino'),
    categoryId: optionalInteger(query.categoryId, 'El tipo de producto'),
    productId: optionalInteger(query.productId, 'El producto'),
    motiveId: optionalInteger(query.motiveId, 'El motivo'),
    personRut: optionalInteger(query.personRut, 'El RUT'),
    divisionId: String(query.divisionId || '').trim().slice(0, 10) || null,
    subdivisionId: String(query.subdivisionId || '').trim().slice(0, 10) || null,
    costCenterId: String(query.costCenterId || '').trim().slice(0, 10) || null,
    paymentControl: optionalInteger(query.paymentControl, 'El control de pago', [0, 1, 2]),
    evaluation: optionalInteger(query.evaluation, 'La evaluacion', [0, 1, 2, 3]),
    status: optionalInteger(query.status, 'El estado', [0, 1, 2, 3, 5]),
    q: String(query.q || '').trim().slice(0, 100)
  };
};

module.exports = { normalizeGeneralDownloadQuery };
