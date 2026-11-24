const { SecurityError } = require('./seguridad.service');

const REPORTS = {
  'tipo-producto': { permission: 1 },
  'centro-costo': { permission: 2 },
  persona: { permission: 3 },
  motivo: { permission: 4 }
};

const optionalInteger = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valido.`);
  return parsed;
};

const optionalDate = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valida.`);
  const year = Number(text.slice(0, 4));
  if (year < 2000 || year > 2100) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valida.`);
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valida.`);
  }
  return text;
};

const normalizeReport = (value) => {
  const report = String(value || '').toLowerCase();
  if (!REPORTS[report]) throw new SecurityError(404, 'REPORT_NOT_FOUND', 'La consulta no existe.');
  return report;
};

const normalizeQuery = (query = {}) => {
  const from = optionalDate(query.from, 'La fecha desde');
  const to = optionalDate(query.to, 'La fecha hasta');
  if (from && to && from > to) throw new SecurityError(400, 'VALIDATION_ERROR', 'La fecha desde no puede ser posterior a la fecha hasta.');
  return {
    from,
    to,
    casinoId: optionalInteger(query.casinoId, 'El casino'),
    categoryId: optionalInteger(query.categoryId, 'El tipo de producto'),
    motiveId: optionalInteger(query.motiveId, 'El motivo'),
    personRut: optionalInteger(query.personRut, 'El RUT'),
    divisionId: String(query.divisionId || '').trim().slice(0, 10) || null,
    q: String(query.q || '').trim().slice(0, 100)
  };
};

const permissionForReport = (value) => ({ sistema: 55, modulo: 5, programa: REPORTS[normalizeReport(value)].permission });

module.exports = { normalizeReport, normalizeQuery, permissionForReport };
