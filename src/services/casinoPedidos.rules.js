const { SecurityError } = require('./seguridad.service');

const requiredInteger = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valido.`);
  }
  return number;
};

const optionalRut = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return requiredInteger(value, 'El RUT del solicitante');
};

const validDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));

const normalizeLines = (value) => {
  if (!Array.isArray(value) || !value.length) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Agregue al menos un producto al pedido.');
  }
  if (value.length > 100) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'El pedido supera el maximo de 100 productos distintos.');
  }

  const seen = new Set();
  return value.map((line) => {
    const productCode = requiredInteger(line?.productCode, 'El producto');
    const quantity = requiredInteger(line?.quantity, 'La cantidad');
    if (quantity > 32767) {
      throw new SecurityError(400, 'VALIDATION_ERROR', 'La cantidad maxima por producto es 32.767.');
    }
    if (seen.has(productCode)) {
      throw new SecurityError(400, 'VALIDATION_ERROR', 'No se permiten productos repetidos.');
    }
    seen.add(productCode);
    return { productCode, quantity };
  });
};

const normalizeOrderPayload = (body = {}) => {
  const deliveryDate = String(body.deliveryDate || '').trim();
  const deliveryTime = String(body.deliveryTime || '').trim();
  const description = String(body.description || '').trim();
  if (!validDate(deliveryDate)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Ingrese una fecha de entrega valida.');
  }
  if (!validTime(deliveryTime)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Ingrese una hora de entrega valida.');
  }
  if (description.length > 400) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'La descripcion admite hasta 400 caracteres.');
  }

  return {
    requesterRut: optionalRut(body.requesterRut),
    casinoId: requiredInteger(body.casinoId, 'El casino'),
    destinationId: requiredInteger(body.destinationId, 'El destino'),
    motiveId: requiredInteger(body.motiveId, 'El motivo'),
    deliveryDate,
    deliveryTime,
    deliveryMinutes: Number(deliveryTime.slice(0, 2)) * 60 + Number(deliveryTime.slice(3, 5)),
    description,
    lines: normalizeLines(body.lines)
  };
};

const resolveRequesterRut = ({ authenticatedRut, requestedRut, canManageOthers }) => {
  const ownRut = requiredInteger(authenticatedRut, 'El RUT asociado al usuario');
  if (!requestedRut || requestedRut === ownRut) return ownRut;
  if (!canManageOthers) {
    throw new SecurityError(403, 'REQUESTER_FORBIDDEN', 'No tiene permisos para solicitar a nombre de otra persona.');
  }
  return requestedRut;
};

const getMissingRequesterLocationFields = (location = {}) => [
  !String(location.divisionId || '').trim() ? { key: 'division', label: 'División' } : null,
  !String(location.subdivisionId || '').trim() ? { key: 'subdivision', label: 'Subdivisión' } : null,
  !String(location.costCenterId || '').trim() ? { key: 'costCenter', label: 'Centro de costo' } : null
].filter(Boolean);

const formatSpanishList = (values) => {
  if (values.length < 2) return values[0] || '';
  return `${values.slice(0, -1).join(', ')} y ${values.at(-1)}`;
};

const buildRequesterLocationError = (requester = {}) => {
  const missingFields = getMissingRequesterLocationFields(requester.location);
  const requesterName = String(requester.name || 'El solicitante').trim();
  return {
    missingFields,
    message: `No es posible imputar el pedido a ${requesterName}. Faltan estos datos en su ficha de Personas: ${formatSpanishList(missingFields.map((field) => field.label.toLowerCase()))}. Seleccione otro solicitante o solicite completar la ficha.`
  };
};

module.exports = {
  normalizeOrderPayload,
  resolveRequesterRut,
  validDate,
  validTime,
  getMissingRequesterLocationFields,
  buildRequesterLocationError
};
