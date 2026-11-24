const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { calculateDv } = require('./casinoCarga.rules');
const { upsertRequester, session } = require('./casinoCarga.service');

const clean = (value) => String(value ?? '').trim();
const required = (value, label, max) => { const parsed = clean(value); if (!parsed) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} es obligatorio.`); if (parsed.length > max) throw new SecurityError(400, 'VALIDATION_ERROR', `${label} admite hasta ${max} caracteres.`); return parsed; };
const normalize = (body = {}) => {
  const rut = Number(body.rut); if (!Number.isInteger(rut) || rut < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El RUT no es válido.');
  const email = required(body.email, 'El correo', 50).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SecurityError(400, 'VALIDATION_ERROR', 'El correo no es válido.');
  return {
    externalCode: required(body.externalCode || String(rut), 'El código externo', 30), rut, dv: calculateDv(rut), login: String(rut),
    names: required(body.names, 'Los nombres', 40), paternalSurname: required(body.paternalSurname, 'El apellido paterno', 40),
    maternalSurname: clean(body.maternalSurname).slice(0, 40), email,
    divisionCode: required(body.divisionCode, 'La división', 10), divisionName: required(body.divisionName, 'La descripción de división', 80),
    subdivisionCode: required(body.subdivisionCode, 'La subdivisión', 10), subdivisionName: required(body.subdivisionName, 'La descripción de subdivisión', 80),
    costCenterCode: required(body.costCenterCode, 'El centro de costo', 15), costCenterName: required(body.costCenterName, 'La descripción del centro de costo', 80),
    active: body.active !== false && body.active !== 0 && body.active !== '0'
  };
};

const list = async (query, context) => {
  const { empCod } = session(context); const page = Math.max(1, Number(query.page) || 1); const pageSize = Math.min(1000, Math.max(1, Number(query.pageSize) || 25));
  const q = clean(query.q); const active = query.active === '' || query.active === undefined ? null : Number(query.active);
  const request = (await getPool()).request().input('empCod', sql.Int, empCod).input('offset', sql.Int, (page - 1) * pageSize).input('pageSize', sql.Int, pageSize);
  const where = [];
  if (q) { request.input('q', sql.VarChar(102), `%${q}%`); where.push('(S.SOLCodigoExterno LIKE @q OR S.SOLNombres LIKE @q OR S.SOLApellidoPaterno LIKE @q OR S.SOLEmail LIKE @q OR CONVERT(varchar(20),S.SOLRut) LIKE @q)'); }
  if ([0, 1].includes(active)) { request.input('active', sql.Bit, active); where.push('S.SOLActivo=@active'); }
  const filter = where.length ? `AND ${where.join(' AND ')}` : '';
  const result = await request.query(`
    SELECT COUNT(*) total,SUM(CASE WHEN S.SOLActivo=1 THEN 1 ELSE 0 END) activeCount FROM SSP06MASolicitante S WHERE S.GECODEMP=@empCod ${filter};
    SELECT S.SOLId id,RTRIM(S.SOLCodigoExterno) externalCode,S.SOLRut rut,RTRIM(U.UsuDV) dv,RTRIM(S.SOLLogin) login,
      RTRIM(S.SOLNombres) names,RTRIM(S.SOLApellidoPaterno) paternalSurname,RTRIM(S.SOLApellidoMaterno) maternalSurname,
      RTRIM(S.SOLEmail) email,RTRIM(D.DivCodigoExterno) divisionCode,RTRIM(D.DivDescripcion) divisionName,
      RTRIM(SD.SdiCodigoExterno) subdivisionCode,RTRIM(SD.SdiDescripcion) subdivisionName,RTRIM(C.CecCodigoExterno) costCenterCode,
      RTRIM(C.CecDescripcion) costCenterName,CONVERT(bit,S.SOLActivo) active,
      (SELECT COUNT(*) FROM SSP06OPPedidosPlanta P WHERE P.GECODEMP=S.GECODEMP AND P.PedRutSolicita=S.SOLRut) usageCount
    FROM SSP06MASolicitante S
    INNER JOIN USUARIOS U ON RTRIM(U.UsuLogin)=RTRIM(S.SOLLogin)
    INNER JOIN FPDivision D ON D.GECODEMP=S.GECODEMP AND D.DivId=S.DivId
    INNER JOIN FPDivisionSub SD ON SD.GECODEMP=S.GECODEMP AND SD.DivId=S.DivId AND SD.SdiId=S.SdiId
    INNER JOIN FPCenCos C ON C.GECODEMP=S.GECODEMP AND C.CecId=S.CecId
    WHERE S.GECODEMP=@empCod ${filter}
    ORDER BY S.SOLApellidoPaterno,S.SOLNombres OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
  `);
  const total = Number(result.recordsets[0][0].total || 0); const activeCount = Number(result.recordsets[0][0].activeCount || 0);
  return { data: result.recordsets[1], summary: { total, active: activeCount, inactive: total - activeCount }, pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } };
};

const save = async (idValue, body, context) => {
  const identity = session(context); const item = normalize(body); const pool = await getPool(); const transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    if (idValue !== null) {
      const id = Number(idValue); if (!Number.isInteger(id) || id < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El identificador no es válido.');
      const current = await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('id', sql.BigInt, id).query('SELECT SOLCodigoExterno FROM SSP06MASolicitante WHERE GECODEMP=@empCod AND SOLId=@id');
      if (!current.recordset[0]) throw new SecurityError(404, 'REQUESTER_NOT_FOUND', 'El solicitante no existe.');
      await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('id', sql.BigInt, id).query('DELETE SSP06MASolicitante WHERE GECODEMP=@empCod AND SOLId=@id');
    }
    await upsertRequester(transaction, item, identity.empCod, identity.login);
    const result = await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('external', sql.VarChar(30), item.externalCode).query('SELECT SOLId id FROM SSP06MASolicitante WHERE GECODEMP=@empCod AND SOLCodigoExterno=@external');
    await transaction.commit(); return { id: Number(result.recordset[0].id) };
  } catch (error) { await transaction.rollback(); if ([2601, 2627].includes(Number(error.number))) throw new SecurityError(409, 'DUPLICATE_REQUESTER', 'Ya existe un solicitante con ese código, RUT o correo.'); throw error; }
};

const remove = async (idValue, context) => {
  const { empCod } = session(context); const id = Number(idValue); if (!Number.isInteger(id) || id < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El identificador no es válido.');
  const pool = await getPool(); const transaction = new sql.Transaction(pool); await transaction.begin();
  try {
    const current = await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('id', sql.BigInt, id).query('SELECT SOLRut rut,RTRIM(SOLLogin) login FROM SSP06MASolicitante WHERE GECODEMP=@empCod AND SOLId=@id');
    if (!current.recordset[0]) throw new SecurityError(404, 'REQUESTER_NOT_FOUND', 'El solicitante no existe.');
    const usage = await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('rut', sql.Int, current.recordset[0].rut).query('SELECT COUNT(*) total FROM SSP06OPPedidosPlanta WHERE GECODEMP=@empCod AND PedRutSolicita=@rut');
    if (Number(usage.recordset[0].total)) throw new SecurityError(409, 'REQUESTER_IN_USE', 'El solicitante tiene pedidos y no se puede eliminar; puede dejarlo inactivo.');
    await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('id', sql.BigInt, id).input('login', sql.VarChar(10), current.recordset[0].login).query(`
      DELETE SSP06MASolicitante WHERE GECODEMP=@empCod AND SOLId=@id;
      DELETE URolesPorUser WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND RTRIM(ROLCod)='CAS_USER';
    `);
    await transaction.commit(); return { id };
  } catch (error) { await transaction.rollback(); throw error; }
};

module.exports = { list, create: (body, context) => save(null, body, context), update: (id, body, context) => save(id, body, context), remove };
