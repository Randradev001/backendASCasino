const { SecurityError } = require('./seguridad.service');

const clean = (value) => String(value ?? '').trim();
const key = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\*/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const calculateDv = (rutValue) => {
  let rut = Number(rutValue); let multiplier = 2; let sum = 0;
  while (rut > 0) { sum += (rut % 10) * multiplier; rut = Math.floor(rut / 10); multiplier = multiplier === 7 ? 2 : multiplier + 1; }
  const result = 11 - (sum % 11);
  return result === 11 ? '0' : result === 10 ? 'K' : String(result);
};

const active = (value, fallback = true) => {
  const parsed = key(value);
  if (!parsed) return fallback;
  if (['si', '1', 'true', 'activo'].includes(parsed)) return true;
  if (['no', '0', 'false', 'inactivo'].includes(parsed)) return false;
  throw new Error('Debe indicar Sí o No.');
};

const sheet = (sheets, expected) => {
  const found = Object.entries(sheets).find(([name]) => key(name) === key(expected));
  if (!found) throw new SecurityError(400, 'LOAD_SHEET_MISSING', `Falta la pestaña ${expected}.`);
  return found[1];
};

const rowsFor = (sheets, expected, requiredHeaders) => {
  const rows = sheet(sheets, expected);
  const headerIndex = rows.findIndex((row) => requiredHeaders.every((header) => row.some((value) => key(value) === key(header))));
  if (headerIndex < 0) throw new SecurityError(400, 'LOAD_HEADERS_INVALID', `No se encontraron las columnas esperadas en ${expected}.`);
  const headers = rows[headerIndex].map(key);
  const data = rows.slice(headerIndex + 1).filter((row) => row.some((value) => clean(value)));
  return data.map((row, index) => ({ row: headerIndex + index + 2, value: Object.fromEntries(headers.map((header, column) => [header, row[column]])) }));
};

const pick = (row, ...names) => names.map(key).find((name) => row[name] !== undefined) ? row[names.map(key).find((name) => row[name] !== undefined)] : '';
const required = (value, label, max = 200) => {
  const parsed = clean(value);
  if (!parsed) throw new Error(`${label} es obligatorio.`);
  if (parsed.length > max) throw new Error(`${label} admite hasta ${max} caracteres.`);
  return parsed;
};
const optional = (value, max = 200) => {
  const parsed = clean(value);
  if (parsed.length > max) throw new Error(`El valor admite hasta ${max} caracteres.`);
  return parsed;
};
const email = (value, label) => {
  const parsed = required(value, label, 50).toLowerCase();
  if (!emailPattern.test(parsed)) throw new Error(`${label} no es válido.`);
  return parsed;
};
const positiveInteger = (value, label) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2147483647) throw new Error(`${label} no es válido.`);
  return parsed;
};
const initialPasswordForRut = (rutValue) => String(positiveInteger(rutValue, 'RUT')).padStart(4, '0').slice(-4);
const nonNegative = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999999999) throw new Error(`${label} no es válido.`);
  return Math.round(parsed);
};

const parseSection = (source, mapper, errors) => source.flatMap(({ row, value }) => {
  try { return [{ ...mapper(value), row }]; } catch (error) { errors.push({ row, message: error.message }); return []; }
});

const duplicates = (items, section, errors) => {
  const seen = new Map();
  for (const item of items) {
    const normalized = key(item.externalCode);
    if (seen.has(normalized)) errors.push({ sheet: section, row: item.row, message: `Código externo duplicado con la fila ${seen.get(normalized)}.` });
    else seen.set(normalized, item.row);
  }
};

const normalizeWorkbook = (sheets) => {
  const errors = [];
  const sectionErrors = (name) => { const target = []; errors.push({ sheet: name, details: target }); return target; };
  const typeErrors = sectionErrors('Tipo producto');
  const requesterErrors = sectionErrors('Solicitantes');
  const productErrors = sectionErrors('Productos');
  const casinoErrors = sectionErrors('Casinos');
  const destinationErrors = sectionErrors('Destinos');
  const motiveErrors = sectionErrors('Motivos');

  const categories = parseSection(rowsFor(sheets, 'Tipo producto', ['Codigo', 'Familia de producto']), (row) => ({
    externalCode: required(pick(row, 'Codigo'), 'Código', 30), name: required(pick(row, 'Familia de producto'), 'Familia', 40), active: true
  }), typeErrors);
  const requesters = parseSection(rowsFor(sheets, 'Solicitantes', ['CodigoSolicitante', 'Nombres', 'Email']), (row) => {
    const rut = positiveInteger(pick(row, 'CodigoSolicitante'), 'Código de solicitante');
    return {
      externalCode: String(rut), rut, dv: calculateDv(rut), login: String(rut),
      names: required(pick(row, 'Nombres'), 'Nombres', 40), paternalSurname: required(pick(row, 'ApellidoPaterno'), 'Apellido paterno', 40),
      maternalSurname: optional(pick(row, 'ApellidoMaterno'), 40), email: email(pick(row, 'Email'), 'Email'),
      divisionCode: required(pick(row, 'CodigoDivision'), 'Código de división', 10), divisionName: required(pick(row, 'DescripcionDivision'), 'División', 80),
      subdivisionCode: required(pick(row, 'CodigoSubdivision'), 'Código de subdivisión', 10), subdivisionName: required(pick(row, 'DescripcionSubdivision'), 'Subdivisión', 80),
      costCenterCode: required(pick(row, 'CodigoCentroCosto'), 'Código de centro de costo', 15), costCenterName: required(pick(row, 'DescripcionCentroCosto'), 'Centro de costo', 80),
      active: active(pick(row, 'Activo'), true)
    };
  }, requesterErrors);
  const products = parseSection(rowsFor(sheets, 'Productos', ['CodigoProducto', 'NombreProducto', 'Precio']), (row) => ({
    externalCode: required(pick(row, 'CodigoProducto'), 'Código de producto', 30), name: required(pick(row, 'NombreProducto'), 'Producto', 60),
    categoryExternalCode: required(pick(row, 'CodigoTipoProducto'), 'Código de tipo', 30), categoryName: required(pick(row, 'DescripcionTipoProducto'), 'Tipo', 40),
    casinoExternalCode: required(pick(row, 'CodigoCasino'), 'Código de casino', 30), casinoName: required(pick(row, 'NombreCasino'), 'Casino', 40),
    price: nonNegative(pick(row, 'Precio'), 'Precio'), active: active(pick(row, 'Activo'), true)
  }), productErrors);
  const casinos = parseSection(rowsFor(sheets, 'Casinos', ['CodigoCasino', 'NombreCasino', 'emailResponsable']), (row) => ({
    externalCode: required(pick(row, 'CodigoCasino'), 'Código de casino', 30), name: required(pick(row, 'NombreCasino'), 'Casino', 40),
    responsibleEmail: email(pick(row, 'emailResponsable'), 'Email responsable'), email: optional(pick(row, 'EmailCasino'), 50).toLowerCase(), active: active(pick(row, 'Activo'), true)
  }), casinoErrors);
  const destinations = parseSection(rowsFor(sheets, 'Destinos', ['CodigoDestino', 'NombreDestino']), (row) => ({
    externalCode: required(pick(row, 'CodigoDestino'), 'Código de destino', 30), name: required(pick(row, 'NombreDestino'), 'Destino', 40), active: active(pick(row, 'Activo'), true)
  }), destinationErrors);
  const motives = parseSection(rowsFor(sheets, 'Motivos', ['CodigoMotivo', 'NombreMotivo']), (row) => ({
    externalCode: required(pick(row, 'CodigoMotivo'), 'Código de motivo', 30), name: required(pick(row, 'NombreMotivo'), 'Motivo', 40),
    description: optional(pick(row, 'Descripcion'), 200), active: active(pick(row, 'Activo'), true)
  }), motiveErrors);

  for (const [items, name, target] of [[categories, 'Tipo producto', typeErrors], [requesters, 'Solicitantes', requesterErrors], [products, 'Productos', productErrors], [casinos, 'Casinos', casinoErrors], [destinations, 'Destinos', destinationErrors], [motives, 'Motivos', motiveErrors]]) duplicates(items, name, target);
  const categoryCodes = new Set(categories.map((item) => key(item.externalCode)));
  const casinoCodes = new Set(casinos.map((item) => key(item.externalCode)));
  for (const product of products) {
    if (!categoryCodes.has(key(product.categoryExternalCode))) productErrors.push({ row: product.row, message: `El tipo ${product.categoryExternalCode} no existe en la planilla.` });
    if (!casinoCodes.has(key(product.casinoExternalCode))) productErrors.push({ row: product.row, message: `El casino ${product.casinoExternalCode} no existe en la planilla.` });
  }
  const flattenedErrors = errors.flatMap((section) => section.details.map((detail) => ({ sheet: section.sheet, ...detail })));
  return {
    valid: flattenedErrors.length === 0,
    data: { categories, requesters, products, casinos, destinations, motives },
    summary: Object.fromEntries(Object.entries({ categories, requesters, products, casinos, destinations, motives }).map(([name, items]) => [name, items.length])),
    errors: flattenedErrors
  };
};

module.exports = { normalizeWorkbook, calculateDv, initialPasswordForRut, key };
