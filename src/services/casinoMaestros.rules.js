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
      name: text(body.name, 'El nombre', 40),
      rut: integer(body.rut, 'El RUT', { min: 1, max: 2147483647 }),
      dv: text(body.dv, 'El digito verificador', 1).toUpperCase(),
      email
    };
  }
  if (catalog === 'destinos' || catalog === 'motivos') return { name: text(body.name, 'El nombre', 40) };
  if (catalog === 'tipos-producto') {
    return {
      name: text(body.name, 'El nombre', 40),
      order: integer(body.order, 'El orden', { max: 32767 }),
      access: integer(body.access, 'El tipo de acceso', { max: 1 })
    };
  }
  return {
    name: text(body.name, 'El nombre', 40),
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

module.exports = { CATALOGS, normalizeCatalog, normalizeListQuery, normalizePayload, permissionForCatalog, integer };
