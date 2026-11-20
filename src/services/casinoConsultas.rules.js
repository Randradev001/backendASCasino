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

const normalizeReport = (value) => {
  const report = String(value || '').toLowerCase();
  if (!REPORTS[report]) throw new SecurityError(404, 'REPORT_NOT_FOUND', 'La consulta no existe.');
  return report;
};

const normalizeQuery = (query = {}) => {
  const year = Number(query.year || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new SecurityError(400, 'VALIDATION_ERROR', 'El año no es valido.');
  return {
    year,
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
