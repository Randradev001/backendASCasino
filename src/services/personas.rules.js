const { SecurityError } = require('./seguridad.service');

const positiveInteger = (value, fallback, label) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} debe ser un entero mayor que cero.`);
  }
  return parsed;
};

const normalizeListQuery = (query = {}) => {
  const search = String(query.search || '').trim();
  if (search.length > 130) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'La busqueda admite hasta 130 caracteres.');
  }

  const page = positiveInteger(query.page, 1, 'page');
  const pageSize = positiveInteger(query.pageSize, 25, 'pageSize');
  if (pageSize > 100) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'pageSize no puede ser mayor que 100.');
  }

  const estado = query.estado === undefined || query.estado === null || query.estado === ''
    ? null
    : Number(query.estado);
  if (estado !== null && ![1, 2].includes(estado)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'estado debe ser 1 (Activo) o 2 (Finiquitado).');
  }

  return { search, page, pageSize, estado, offset: (page - 1) * pageSize };
};

const normalizeRut = (value) => {
  const text = String(value || '').trim().toUpperCase().replace(/\./g, '').replace(/\s/g, '');
  const completeRut = text.match(/^(\d{1,9})-[0-9K]$/);
  const normalized = completeRut ? completeRut[1] : text;
  if (!/^\d{1,9}$/.test(normalized)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'El RUT de la persona no es valido.');
  }
  const rut = Number(normalized);
  if (!Number.isInteger(rut) || rut < 1 || rut > 999999999) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'El RUT de la persona no es valido.');
  }
  return rut;
};

const validLegacyDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1753) return null;
  return date;
};

const calculateAge = (birthValue, referenceValue = new Date()) => {
  const birth = validLegacyDate(birthValue);
  const reference = validLegacyDate(referenceValue);
  if (!birth || !reference || birth > reference) return null;

  let years = reference.getFullYear() - birth.getFullYear();
  const beforeBirthday = reference.getMonth() < birth.getMonth()
    || (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate());
  if (beforeBirthday) years -= 1;
  return years;
};

const calculateServiceDuration = (fromValue, toValue, referenceValue = new Date()) => {
  const from = validLegacyDate(fromValue);
  const requestedEnd = validLegacyDate(toValue);
  const reference = validLegacyDate(referenceValue);
  const to = requestedEnd && reference && requestedEnd <= reference ? requestedEnd : reference;
  if (!from || !to || from > to) return null;

  let years = to.getFullYear() - from.getFullYear();
  let months;
  if (to.getMonth() < from.getMonth()) {
    years -= 1;
    months = 12 - (from.getMonth() + 1) + (to.getMonth() + 1);
    if (to.getDate() < from.getDate()) months -= 1;
  } else {
    months = (to.getMonth() + 1) - (from.getMonth() + 1);
    if (to.getDate() < from.getDate()) months -= 1;
  }

  return { years, months };
};

const calculateAbsenteeism = (failures, leaveDays, duration) => {
  if (!duration) return 0;
  const days = duration.years * 365 + duration.months * 30;
  if (days <= 0) return 0;
  return Math.round(((Number(failures || 0) + Number(leaveDays || 0)) / days) * 100) / 100 * 100;
};

module.exports = {
  normalizeListQuery,
  normalizeRut,
  validLegacyDate,
  calculateAge,
  calculateServiceDuration,
  calculateAbsenteeism
};
