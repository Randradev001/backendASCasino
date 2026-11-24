const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { normalizeCatalog, normalizeListQuery, normalizePayload, integer } = require('./casinoMaestros.rules');

const clean = (value) => String(value ?? '').trim();
const numeric = (value) => Number(value || 0);

const CONFIG = {
  casinos: {
    table: 'SSP06MACasinosPlanta', id: 'CASICod', idType: sql.Decimal(10, 0),
    source: `SELECT M.CASICod id,RTRIM(M.CASICodigoExterno) externalCode,RTRIM(M.CASINom) name,M.CASIRut rut,RTRIM(M.CASIDV) dv,
      RTRIM(M.CASIEmail) email,CONVERT(bit,M.CASIActivo) active,
      (SELECT COUNT(*) FROM SSP06OPPedidosPlanta P WHERE P.GECODEMP=M.GECODEMP AND P.CASICod=M.CASICod)
      +(SELECT COUNT(*) FROM SSP06MAProducto P WHERE P.GECODEMP=M.GECODEMP AND P.CASICod=M.CASICod) usageCount
      FROM SSP06MACasinosPlanta M WHERE M.GECODEMP=@empCod`,
    search: `(name LIKE @q OR externalCode LIKE @q OR CONVERT(varchar(20),rut) LIKE @q OR email LIKE @q)`, orderBy: 'name,id'
  },
  destinos: {
    table: 'SSP06MADestinosPlanta', id: 'DESTICod', idType: sql.Decimal(10, 0),
    source: `SELECT M.DESTICod id,RTRIM(M.DESTICodigoExterno) externalCode,RTRIM(M.DESTINom) name,CONVERT(bit,M.DESTIActivo) active,
      (SELECT COUNT(*) FROM SSP06OPPedidosPlanta P WHERE P.GECODEMP=M.GECODEMP AND P.DESTICod=M.DESTICod) usageCount
      FROM SSP06MADestinosPlanta M WHERE M.GECODEMP=@empCod`, search: '(name LIKE @q OR externalCode LIKE @q)', orderBy: 'name,id'
  },
  motivos: {
    table: 'SSP06MAMotivoPedidos', id: 'Mot6Cod', idType: sql.SmallInt,
    source: `SELECT M.Mot6Cod id,RTRIM(M.Mot6CodigoExterno) externalCode,RTRIM(M.Mot6Descrip) name,CONVERT(bit,M.Mot6Activo) active,
      (SELECT COUNT(*) FROM SSP06OPPedidosPlanta P WHERE P.GECODEMP=M.GECODEMP AND P.Mot6Cod=M.Mot6Cod) usageCount
      FROM SSP06MAMotivoPedidos M WHERE M.GECODEMP=@empCod`, search: '(name LIKE @q OR externalCode LIKE @q)', orderBy: 'name,id'
  },
  'tipos-producto': {
    table: 'SSP06MATPProducto', id: 'TPPRCod', idType: sql.Decimal(10, 0),
    source: `SELECT M.TPPRCod id,RTRIM(M.TPPRCodigoExterno) externalCode,RTRIM(M.TPPRNombre) name,M.TPPROrden [order],COALESCE(M.TPPRAcceso,0) access,CONVERT(bit,M.TPPRActivo) active,
      (SELECT COUNT(*) FROM SSP06MAProducto P WHERE P.GECODEMP=M.GECODEMP AND P.TPPRCod=M.TPPRCod) usageCount
      FROM SSP06MATPProducto M WHERE M.GECODEMP=@empCod`, search: '(name LIKE @q OR externalCode LIKE @q)', orderBy: '[order],name,id'
  },
  productos: {
    table: 'SSP06MAProducto', id: 'PRODCodigo', idType: sql.Decimal(10, 0),
    source: `SELECT M.PRODCodigo id,RTRIM(M.PRODCodigoExterno) externalCode,RTRIM(M.ProdNombre) name,M.PRODPrecio price,M.CASICod casinoId,CONVERT(bit,M.PRODActivo) active,
      RTRIM(C.CASINom) casino,M.TPPRCod categoryId,RTRIM(T.TPPRNombre) category,COALESCE(T.TPPRAcceso,0) access,
      (SELECT COUNT(*) FROM SSP06OPPedidosPlantaDet D WHERE D.GECODEMP=M.GECODEMP AND D.PRODCodigo=M.PRODCodigo) usageCount
      FROM SSP06MAProducto M
      INNER JOIN SSP06MACasinosPlanta C ON C.GECODEMP=M.GECODEMP AND C.CASICod=M.CASICod
      INNER JOIN SSP06MATPProducto T ON T.GECODEMP=M.GECODEMP AND T.TPPRCod=M.TPPRCod
      WHERE M.GECODEMP=@empCod`, search: `(name LIKE @q OR externalCode LIKE @q OR casino LIKE @q OR category LIKE @q)`, orderBy: 'casino,category,name,id'
  }
};

const sessionCompany = (context) => {
  const empCod = Number(context?.empCod);
  if (!Number.isInteger(empCod) || empCod < 1) throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa debe provenir de la sesion.');
  return empCod;
};

const bindFilters = (request, filters, empCod) => {
  request.input('empCod', sql.Int, empCod).input('offset', sql.Int, filters.offset).input('pageSize', sql.Int, filters.pageSize);
  if (filters.q) request.input('q', sql.VarChar(102), `%${filters.q}%`);
  if (filters.access !== null) request.input('access', sql.SmallInt, filters.access);
  if (filters.casinoId !== null) request.input('casinoId', sql.Decimal(10, 0), filters.casinoId);
  if (filters.categoryId !== null) request.input('categoryId', sql.Decimal(10, 0), filters.categoryId);
  return request;
};

const list = async (catalogValue, query, context) => {
  const catalog = normalizeCatalog(catalogValue);
  const config = CONFIG[catalog];
  const filters = normalizeListQuery(query);
  const empCod = sessionCompany(context);
  const conditions = [
    filters.q ? config.search : null,
    filters.access !== null && ['tipos-producto', 'productos'].includes(catalog) ? 'access=@access' : null,
    filters.casinoId !== null && catalog === 'productos' ? 'casinoId=@casinoId' : null,
    filters.categoryId !== null && catalog === 'productos' ? 'categoryId=@categoryId' : null
  ].filter(Boolean);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const request = bindFilters((await getPool()).request(), filters, empCod);
  const result = await request.query(`
    WITH MasterRows AS (${config.source}), Filtered AS (SELECT * FROM MasterRows ${where})
    SELECT COUNT(*) total,SUM(CASE WHEN usageCount>0 THEN 1 ELSE 0 END) inUse,
      SUM(CASE WHEN access=1 THEN 1 ELSE 0 END) restricted
    FROM Filtered;
    WITH MasterRows AS (${config.source}), Filtered AS (SELECT * FROM MasterRows ${where})
    SELECT * FROM Filtered ORDER BY ${config.orderBy}
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `.replaceAll('access=1', catalog === 'casinos' || catalog === 'destinos' || catalog === 'motivos' ? '1=0' : 'access=1'));
  const summary = result.recordsets[0]?.[0] || {};
  const data = (result.recordsets[1] || []).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'string' ? clean(value) : value])));
  const total = numeric(summary.total);
  return {
    data,
    summary: { total, inUse: numeric(summary.inUse), available: total - numeric(summary.inUse), restricted: numeric(summary.restricted) },
    pagination: { page: filters.page, pageSize: filters.pageSize, total, pages: Math.max(1, Math.ceil(total / filters.pageSize)) }
  };
};

const validateReferences = async (request, catalog, payload, empCod) => {
  if (catalog !== 'productos') return;
  const result = await request.input('casinoId', sql.Decimal(10, 0), payload.casinoId)
    .input('categoryId', sql.Decimal(10, 0), payload.categoryId)
    .query(`SELECT CASICod FROM SSP06MACasinosPlanta WHERE GECODEMP=@empCod AND CASICod=@casinoId;
      SELECT TPPRCod FROM SSP06MATPProducto WHERE GECODEMP=@empCod AND TPPRCod=@categoryId;`);
  if (!result.recordsets[0]?.length) throw new SecurityError(400, 'INVALID_CASINO', 'El casino seleccionado no existe.');
  if (!result.recordsets[1]?.length) throw new SecurityError(400, 'INVALID_CATEGORY', 'El tipo de producto seleccionado no existe.');
};

const writeValues = (request, catalog, payload) => {
  request.input('externalCode', sql.VarChar(30), payload.externalCode).input('active', sql.Bit, payload.active);
  if (catalog === 'casinos') return request.input('name', sql.Char(40), payload.name).input('rut', sql.Int, payload.rut)
    .input('dv', sql.Char(1), payload.dv).input('email', sql.Char(50), payload.email);
  if (catalog === 'destinos' || catalog === 'motivos') return request.input('name', sql.Char(40), payload.name);
  if (catalog === 'tipos-producto') return request.input('name', sql.Char(40), payload.name)
    .input('order', sql.SmallInt, payload.order).input('access', sql.SmallInt, payload.access);
  return request.input('name', sql.VarChar(60), payload.name).input('price', sql.Decimal(10, 0), payload.price)
    .input('casinoId', sql.Decimal(10, 0), payload.casinoId).input('categoryId', sql.Decimal(10, 0), payload.categoryId);
};

const insertSql = (catalog, config) => ({
  casinos: `INSERT INTO ${config.table}(GECODEMP,${config.id},CASICodigoExterno,CASINom,CASIDV,CASIRut,CASIEmail,CASIActivo) VALUES(@empCod,@id,@externalCode,@name,@dv,@rut,@email,@active)`,
  destinos: `INSERT INTO ${config.table}(GECODEMP,${config.id},DESTICodigoExterno,DESTINom,DESTIActivo) VALUES(@empCod,@id,@externalCode,@name,@active)`,
  motivos: `INSERT INTO ${config.table}(GECODEMP,${config.id},Mot6CodigoExterno,Mot6Descrip,Mot6Activo) VALUES(@empCod,@id,@externalCode,@name,@active)`,
  'tipos-producto': `INSERT INTO ${config.table}(GECODEMP,${config.id},TPPRCodigoExterno,TPPRNombre,TPPROrden,TPPRAcceso,TPPRActivo) VALUES(@empCod,@id,@externalCode,@name,@order,@access,@active)`,
  productos: `INSERT INTO ${config.table}(GECODEMP,${config.id},PRODCodigoExterno,TPPRCod,ProdNombre,PRODPrecio,CASICod,PRODActivo) VALUES(@empCod,@id,@externalCode,@categoryId,@name,@price,@casinoId,@active)`
}[catalog]);

const updateSql = (catalog, config) => ({
  casinos: `UPDATE ${config.table} SET CASICodigoExterno=@externalCode,CASINom=@name,CASIDV=@dv,CASIRut=@rut,CASIEmail=@email,CASIActivo=@active WHERE GECODEMP=@empCod AND ${config.id}=@id`,
  destinos: `UPDATE ${config.table} SET DESTICodigoExterno=@externalCode,DESTINom=@name,DESTIActivo=@active WHERE GECODEMP=@empCod AND ${config.id}=@id`,
  motivos: `UPDATE ${config.table} SET Mot6CodigoExterno=@externalCode,Mot6Descrip=@name,Mot6Activo=@active WHERE GECODEMP=@empCod AND ${config.id}=@id`,
  'tipos-producto': `UPDATE ${config.table} SET TPPRCodigoExterno=@externalCode,TPPRNombre=@name,TPPROrden=@order,TPPRAcceso=@access,TPPRActivo=@active WHERE GECODEMP=@empCod AND ${config.id}=@id`,
  productos: `UPDATE ${config.table} SET PRODCodigoExterno=@externalCode,TPPRCod=@categoryId,ProdNombre=@name,PRODPrecio=@price,CASICod=@casinoId,PRODActivo=@active WHERE GECODEMP=@empCod AND ${config.id}=@id`
}[catalog]);

const create = async (catalogValue, body, context) => {
  const catalog = normalizeCatalog(catalogValue); const config = CONFIG[catalog]; const payload = normalizePayload(catalog, body); const empCod = sessionCompany(context);
  const pool = await getPool(); const transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const request = new sql.Request(transaction).input('empCod', sql.Int, empCod);
    await validateReferences(request, catalog, payload, empCod);
    const next = await new sql.Request(transaction).input('empCod', sql.Int, empCod)
      .query(`SELECT COALESCE(MAX(${config.id}),0)+1 id FROM ${config.table} WITH (UPDLOCK,HOLDLOCK) WHERE GECODEMP=@empCod`);
    const id = numeric(next.recordset[0].id);
    const insert = writeValues(new sql.Request(transaction).input('empCod', sql.Int, empCod).input('id', config.idType, id), catalog, payload);
    await insert.query(insertSql(catalog, config)); await transaction.commit(); return { id };
  } catch (error) { await transaction.rollback(); throw error; }
};

const update = async (catalogValue, idValue, body, context) => {
  const catalog = normalizeCatalog(catalogValue); const config = CONFIG[catalog]; const payload = normalizePayload(catalog, body); const empCod = sessionCompany(context);
  const id = integer(idValue, 'El codigo', { min: 1 }); const pool = await getPool(); const transaction = new sql.Transaction(pool); await transaction.begin();
  try {
    await validateReferences(new sql.Request(transaction).input('empCod', sql.Int, empCod), catalog, payload, empCod);
    const request = writeValues(new sql.Request(transaction).input('empCod', sql.Int, empCod).input('id', config.idType, id), catalog, payload);
    const result = await request.query(updateSql(catalog, config));
    if (!result.rowsAffected[0]) throw new SecurityError(404, 'MASTER_ROW_NOT_FOUND', 'El registro ya no existe.');
    await transaction.commit(); return { id };
  } catch (error) { await transaction.rollback(); throw error; }
};

const remove = async (catalogValue, idValue, context) => {
  const catalog = normalizeCatalog(catalogValue); const config = CONFIG[catalog]; const empCod = sessionCompany(context); const id = integer(idValue, 'El codigo', { min: 1 });
  try {
    const result = await (await getPool()).request().input('empCod', sql.Int, empCod).input('id', config.idType, id)
      .query(`DELETE FROM ${config.table} WHERE GECODEMP=@empCod AND ${config.id}=@id`);
    if (!result.rowsAffected[0]) throw new SecurityError(404, 'MASTER_ROW_NOT_FOUND', 'El registro ya no existe.');
    return { id };
  } catch (error) {
    if (Number(error.number) === 547) throw new SecurityError(409, 'MASTER_ROW_IN_USE', 'El registro está en uso y no se puede eliminar.');
    throw error;
  }
};

const options = async (context) => {
  const empCod = sessionCompany(context);
  const result = await (await getPool()).request().input('empCod', sql.Int, empCod).query(`
    SELECT CASICod id,RTRIM(CASINom) name FROM SSP06MACasinosPlanta WHERE GECODEMP=@empCod AND CASIActivo=1 ORDER BY CASINom;
    SELECT TPPRCod id,RTRIM(TPPRNombre) name,COALESCE(TPPRAcceso,0) access FROM SSP06MATPProducto WHERE GECODEMP=@empCod AND TPPRActivo=1 ORDER BY TPPROrden,TPPRNombre;`);
  return { casinos: result.recordsets[0] || [], categories: result.recordsets[1] || [] };
};

module.exports = { list, create, update, remove, options };
