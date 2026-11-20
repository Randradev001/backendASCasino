const { SecurityError } = require('./seguridad.service');

const normalizeEvaluation = (body = {}) => {
  const evaluation = Number(body.evaluation);
  const comment = String(body.comment || '').trim();
  if (![1, 2, 3].includes(evaluation)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Seleccione Malo, Regular o Bueno.');
  }
  if (evaluation <= 2 && comment.length < 3) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Explique brevemente una evaluacion Mala o Regular.');
  }
  if (comment.length > 200) throw new SecurityError(400, 'VALIDATION_ERROR', 'La observacion admite hasta 200 caracteres.');
  return { evaluation, comment };
};

const normalizeCasinoObservation = (body = {}) => {
  const comment = String(body.comment || '').trim();
  if (comment.length < 3) throw new SecurityError(400, 'VALIDATION_ERROR', 'Ingrese una observacion del Casino.');
  if (comment.length > 200) throw new SecurityError(400, 'VALIDATION_ERROR', 'La observacion admite hasta 200 caracteres.');
  return { comment };
};

const normalizePaymentControl = (body = {}) => {
  const paymentControl = Number(body.paymentControl);
  const comment = String(body.comment || '').trim();
  if (![1, 2].includes(paymentControl)) throw new SecurityError(400, 'VALIDATION_ERROR', 'Seleccione Liberar o Bloquear pago.');
  if (paymentControl === 2 && comment.length < 3) throw new SecurityError(400, 'VALIDATION_ERROR', 'Indique el motivo del bloqueo.');
  if (comment.length > 200) throw new SecurityError(400, 'VALIDATION_ERROR', 'El motivo admite hasta 200 caracteres.');
  return { paymentControl, comment };
};

module.exports = { normalizeEvaluation, normalizeCasinoObservation, normalizePaymentControl };
