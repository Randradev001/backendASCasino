const { SecurityError } = require('./seguridad.service');
const STATES = ['PENDIENTE', 'PROCESANDO', 'ENVIADO', 'ERROR', 'CANCELADO'];
const date = (value, label) => {
  if (!value) return null;
  const text = String(value); const parsed = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valida.`);
  return text;
};
const normalizeMailQuery = (query = {}) => {
  const from = date(query.from, 'La fecha desde'); const to = date(query.to, 'La fecha hasta');
  if (from && to && from > to) throw new SecurityError(400, 'VALIDATION_ERROR', 'La fecha desde no puede superar la fecha hasta.');
  const page = Math.max(1, Number(query.page) || 1); const pageSize = Number(query.pageSize) || 25;
  if (!Number.isInteger(page) || ![10, 25, 50, 100].includes(pageSize)) throw new SecurityError(400, 'VALIDATION_ERROR', 'La paginacion no es valida.');
  const status = String(query.status || '').toUpperCase();
  if (status && !STATES.includes(status)) throw new SecurityError(400, 'VALIDATION_ERROR', 'El estado no es valido.');
  return { from, to, status: status || null, eventType: String(query.eventType || '').trim().slice(0, 40) || null, q: String(query.q || '').trim().slice(0, 100), page, pageSize, offset: (page - 1) * pageSize, exportAll: query.export === '1' };
};
const parseMailId = (value) => {
  const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El correo no es valido.'); return id;
};
module.exports = { STATES, normalizeMailQuery, parseMailId };
