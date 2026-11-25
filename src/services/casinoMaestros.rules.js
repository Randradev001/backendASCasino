const { SecurityError } = require('./seguridad.service');

const CATALOGS = {
  casinos: { permission: 1 },
  destinos: { permission: 2 },
  motivos: { permission: 3 },
  'tipos-producto': { permission: 10 },
  productos: { permission: 11 }
};

const integer = (value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} no es valido.`);
  }
  return parsed;
};

const text = (value, label, maxLength, required = true) => {
  const parsed = String(value ?? '').trim();
  if (required && !parsed) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} es obligatorio.`);
  if (parsed.length > maxLength) {
    throw new SecurityError(400, 'VALIDATION_ERROR', `${label} admite hasta ${maxLength} caracteres.`);
  }
  return parsed;
};

const normalizeCatalog = (value) => {
  const catalog = String(value || '').trim().toLowerCase();
  if (!CATALOGS[catalog]) throw new SecurityError(404, 'MASTER_NOT_FOUND', 'El maestro solicitado no existe.');
  return catalog;
};

const normalizeListQuery = (query = {}) => {
  const page = integer(query.page || 1, 'La pagina', { min: 1 });
  const pageSize = integer(query.pageSize || 25, 'El tamaño de pagina', { min: 1, max: 1000 });
  const access = query.access === undefined || query.access === '' || query.access === 'all'
    ? null : integer(query.access, 'El acceso', { max: 1 });
  const casinoId = query.casinoId === undefined || query.casinoId === ''
    ? null : integer(query.casinoId, 'El casino', { min: 1 });
  const categoryId = query.categoryId === undefined || query.categoryId === ''
    ? null : integer(query.categoryId, 'El tipo de producto', { min: 1 });
  return {
    q: text(query.q, 'La busqueda', 100, false),
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    access,
    casinoId,
    categoryId
  };
};

const normalizePayload = (catalogValue, body = {}) => {
  const catalog = normalizeCatalog(catalogValue);
  if (catalog === 'casinos') {
    const email = text(body.email, 'El correo', 50, false);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new SecurityError(400, 'VALIDATION_ERROR', 'El correo no es valido.');
    }
    return {
      externalCode: text(body.externalCode, 'El código externo', 30),
      active: body.active === false || body.active === 0 || body.active === '0' ? 0 : 1,
      name: text(body.name, 'El nombre', 40),
      rut: integer(body.rut, 'El RUT', { min: 1, max: 2147483647 }),
      dv: text(body.dv, 'El digito verificador', 1).toUpperCase(),
      email
    };
  }
  if (catalog === 'destinos' || catalog === 'motivos') return { externalCode: text(body.externalCode, 'El código externo', 30), name: text(body.name, 'El nombre', 40), active: body.active === false || body.active === 0 || body.active === '0' ? 0 : 1 };
  if (catalog === 'tipos-producto') {
    return {
      externalCode: text(body.externalCode, 'El código externo', 30),
      active: body.active === false || body.active === 0 || body.active === '0' ? 0 : 1,
      name: text(body.name, 'El nombre', 40),
      order: integer(body.order, 'El orden', { max: 32767 }),
      access: integer(body.access, 'El tipo de acceso', { max: 1 })
    };
  }
  return {
    externalCode: text(body.externalCode, 'El código externo', 30),
    active: body.active === false || body.active === 0 || body.active === '0' ? 0 : 1,
    name: text(body.name, 'El nombre', 60),
    price: integer(body.price, 'El precio', { max: 9999999999 }),
    casinoId: integer(body.casinoId, 'El casino', { min: 1 }),
    categoryId: integer(body.categoryId, 'El tipo de producto', { min: 1 })
  };
};

const permissionForCatalog = (catalogValue) => ({
  sistema: 55,
  modulo: 10,
  programa: CATALOGS[normalizeCatalog(catalogValue)].permission
});

const IMAGE_TYPES = {
  'image/jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'
};

const normalizeImage = (file) => {
  if (!file) return null;
  const buffer = file.buffer;
  const mimeType = String(file.mimetype || '').toLowerCase();
  if (!Buffer.isBuffer(buffer) || !IMAGE_TYPES[mimeType]?.(buffer)) {
    throw new SecurityError(400, 'INVALID_PRODUCT_IMAGE', 'La imagen debe ser un archivo JPEG, PNG o WebP válido.');
  }
  if (buffer.length > 2 * 1024 * 1024) {
    throw new SecurityError(400, 'PRODUCT_IMAGE_TOO_LARGE', 'La imagen admite un máximo de 2 MB.');
  }
  return { buffer, mimeType };
};

module.exports = { CATALOGS, normalizeCatalog, normalizeListQuery, normalizePayload, normalizeImage, permissionForCatalog, integer };
