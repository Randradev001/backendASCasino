const { SecurityError } = require('./seguridad.service');
const { validDate, validTime } = require('./casinoPedidos.rules');

const optionalInteger = (value, label) => {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valido.`);
  return result;
};

const normalizeRequestsQuery = (query = {}) => {
  const status = query.status === 'active' ? 'active' : optionalInteger(query.status, 'El estado');
  if (status !== null && ![1, 2, 3, 5].includes(status)) {
    if (status !== 'active') throw new SecurityError(400, 'VALIDATION_ERROR', 'El estado no corresponde al flujo del Casino.');
  }
  const page = Math.max(1, optionalInteger(query.page, 'La pagina') || 1);
  const requestedSize = optionalInteger(query.pageSize, 'El tamaño de pagina') || 10;
  const pageSize = [10, 25, 50].includes(requestedSize) ? requestedSize : 10;
  return {
    status,
    search: String(query.search || '').trim().slice(0, 80),
    page,
    pageSize,
    offset: (page - 1) * pageSize
  };
};

const normalizeApproval = (body = {}) => {
  const deliveryDate = String(body.deliveryDate || '').trim();
  const deliveryTime = String(body.deliveryTime || '').trim();
  if (!validDate(deliveryDate)) throw new SecurityError(400, 'VALIDATION_ERROR', 'Confirme una fecha de entrega valida.');
  if (!validTime(deliveryTime)) throw new SecurityError(400, 'VALIDATION_ERROR', 'Confirme una hora de entrega valida.');
  return {
    deliveryDate,
    deliveryTime,
    deliveryMinutes: Number(deliveryTime.slice(0, 2)) * 60 + Number(deliveryTime.slice(3, 5))
  };
};

const normalizeRejection = (body = {}) => {
  const comment = String(body.comment || '').trim();
  if (comment.length < 3) throw new SecurityError(400, 'VALIDATION_ERROR', 'Ingrese el motivo del rechazo.');
  if (comment.length > 500) throw new SecurityError(400, 'VALIDATION_ERROR', 'El comentario admite hasta 500 caracteres.');
  return { comment };
};

const classifyDeliveryTiming = (differenceMinutes) => {
  const minutes = Number(differenceMinutes);
  if (!Number.isInteger(minutes)) throw new SecurityError(500, 'INVALID_DELIVERY_TIMING', 'No fue posible calcular el cumplimiento de entrega.');
  if (minutes < 0) return { code: 'ANTICIPADO', label: 'Anticipado', minutes: Math.abs(minutes) };
  if (minutes > 0) return { code: 'ATRASADO', label: 'Tarde', minutes };
  return { code: 'ATIEMPO', label: 'A tiempo', minutes: 0 };
};

module.exports = { normalizeRequestsQuery, normalizeApproval, normalizeRejection, classifyDeliveryTiming };
