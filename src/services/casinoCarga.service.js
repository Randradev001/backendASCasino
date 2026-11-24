const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { readWorkbook } = require('./xlsxReader.service');
const { normalizeWorkbook, initialPasswordForRut } = require('./casinoCarga.rules');
const { hashPassword } = require('./password.service');

const clean = (value) => String(value ?? '').trim();
const session = (context) => {
  const empCod = Number(context?.empCod); const login = clean(context?.login);
  if (!Number.isInteger(empCod) || empCod < 1 || !login) throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa y el usuario deben provenir de la sesión.');
  return { empCod, login };
};

const analyze = async (buffer, context) => {
  const { empCod } = session(context);
  let sheets;
  try { sheets = await readWorkbook(buffer); } catch { throw new SecurityError(400, 'INVALID_XLSX', 'El archivo no es un XLSX válido.'); }
  const result = normalizeWorkbook(sheets);
  const importedEmails = new Set(result.data.requesters.map((item) => item.email));
  const unresolved = [...new Set(result.data.casinos.map((item) => item.responsibleEmail).filter((email) => !importedEmails.has(email)))];
  if (unresolved.length) {
    const pool = await getPool();
    const request = pool.request().input('empCod', sql.Int, empCod);
    const parameters = unresolved.map((email, index) => { request.input(`email${index}`, sql.VarChar(50), email); return `@email${index}`; });
    const existing = await request.query(`SELECT LOWER(RTRIM(U.UsuCorreo)) email FROM USUARIOS U INNER JOIN SEGUSUEMP UE ON UE.UsuLogin=U.UsuLogin AND UE.GECODEMP=@empCod WHERE LOWER(RTRIM(U.UsuCorreo)) IN (${parameters.join(',')})`);
    const found = new Set(existing.recordset.map((row) => clean(row.email).toLowerCase()));
    for (const casino of result.data.casinos.filter((item) => !importedEmails.has(item.responsibleEmail) && !found.has(item.responsibleEmail))) {
      result.errors.push({ sheet: 'Casinos', row: casino.row, message: `El responsable ${casino.responsibleEmail} no existe como solicitante o usuario de la empresa.` });
    }
  }
  result.valid = result.errors.length === 0;
  return result;
};

const nextId = async (transaction, table, column, empCod) => {
  const result = await new sql.Request(transaction).input('empCod', sql.Int, empCod)
    .query(`SELECT COALESCE(MAX(${column}),0)+1 id FROM ${table} WITH (UPDLOCK,HOLDLOCK) WHERE GECODEMP=@empCod`);
  return Number(result.recordset[0].id);
};

const nextTextId = async (transaction, table, column, prefix, empCod) => {
  const result = await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('prefix', sql.VarChar(1), prefix)
    .query(`SELECT COALESCE(MAX(TRY_CONVERT(int,SUBSTRING(${column},2,9))),0)+1 id FROM ${table} WITH (UPDLOCK,HOLDLOCK) WHERE GECODEMP=@empCod AND ${column} LIKE @prefix+'%'`);
  return `${prefix}${String(Number(result.recordset[0].id)).padStart(9, '0')}`;
};

const upsertOrganization = async (transaction, item, empCod) => {
  const find = async (table, id, external, value) => (await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('external', sql.VarChar(30), value)
    .query(`SELECT ${id} id FROM ${table} WHERE GECODEMP=@empCod AND ${external}=@external`)).recordset[0]?.id;
  const divId = clean(await find('FPDivision', 'DivId', 'DivCodigoExterno', item.divisionCode)) || await nextTextId(transaction, 'FPDivision', 'DivId', 'D', empCod);
  const sdiId = clean(await find('FPDivisionSub', 'SdiId', 'SdiCodigoExterno', item.subdivisionCode)) || await nextTextId(transaction, 'FPDivisionSub', 'SdiId', 'S', empCod);
  const cecId = clean(await find('FPCenCos', 'CecId', 'CecCodigoExterno', item.costCenterCode)) || await nextTextId(transaction, 'FPCenCos', 'CecId', 'C', empCod);
  await new sql.Request(transaction).input('empCod', sql.Int, empCod)
    .input('divId', sql.Char(10), divId).input('divExternal', sql.VarChar(30), item.divisionCode).input('divName', sql.Char(80), item.divisionName)
    .input('sdiId', sql.Char(10), sdiId).input('sdiExternal', sql.VarChar(30), item.subdivisionCode).input('sdiName', sql.Char(80), item.subdivisionName)
    .input('cecId', sql.Char(10), cecId).input('cecExternal', sql.VarChar(30), item.costCenterCode).input('cecName', sql.Char(80), item.costCenterName).query(`
      UPDATE FPDivision SET DivDescripcion=@divName WHERE GECODEMP=@empCod AND DivCodigoExterno=@divExternal;
      IF @@ROWCOUNT=0 INSERT FPDivision(GECODEMP,DivId,DivCodigoExterno,DivDescripcion) VALUES(@empCod,@divId,@divExternal,@divName);
      UPDATE FPDivisionSub SET DivId=@divId,SdiDescripcion=@sdiName WHERE GECODEMP=@empCod AND SdiCodigoExterno=@sdiExternal;
      IF @@ROWCOUNT=0 INSERT FPDivisionSub(GECODEMP,DivId,SdiId,SdiCodigoExterno,SdiDescripcion) VALUES(@empCod,@divId,@sdiId,@sdiExternal,@sdiName);
      UPDATE FPCenCos SET CecDescripcion=@cecName WHERE GECODEMP=@empCod AND CecCodigoExterno=@cecExternal;
      IF @@ROWCOUNT=0 INSERT FPCenCos(GECODEMP,CecId,CecCodigoExterno,CecDescripcion) VALUES(@empCod,@cecId,@cecExternal,@cecName);
    `);
  return { divId, sdiId, cecId };
};

const upsertRequester = async (transaction, item, empCod, actor) => {
  const location = await upsertOrganization(transaction, item, empCod);
  const fullName = [item.names, item.paternalSurname, item.maternalSurname].filter(Boolean).join(' ');
  const user = await new sql.Request(transaction).input('rut', sql.Int, item.rut).query('SELECT TOP(1) RTRIM(UsuLogin) login FROM USUARIOS WHERE UsuRut=@rut');
  const login = user.recordset[0]?.login || item.login;
  if (!user.recordset[0]) {
    await new sql.Request(transaction).input('login', sql.VarChar(10), login).input('rut', sql.Int, item.rut).input('dv', sql.Char(1), item.dv)
      .input('name', sql.Char(35), fullName.slice(0, 35)).input('email', sql.Char(50), item.email).input('actor', sql.Char(10), actor)
      .query(`INSERT USUARIOS(UsuLogin,UsuClave,UsuRut,UsuDV,Usunom,UsuCargo,UsuExpira,usucrea,UsuNseg,UsuCorreo) VALUES(@login,NULL,@rut,@dv,@name,'',NULL,@actor,0,@email)`);
  } else {
    await new sql.Request(transaction).input('login', sql.VarChar(10), login).input('email', sql.Char(50), item.email).input('name', sql.Char(35), fullName.slice(0, 35))
      .query('UPDATE USUARIOS SET UsuCorreo=@email,Usunom=@name WHERE RTRIM(UsuLogin)=@login');
  }
  const credential = await new sql.Request(transaction).input('login', sql.VarChar(10), login)
    .query('SELECT 1 found FROM SEGUSUCRED WHERE RTRIM(UsuLogin)=@login');
  if (!credential.recordset[0]) {
    const modern = await hashPassword(initialPasswordForRut(item.rut));
    await new sql.Request(transaction).input('login', sql.VarChar(10), login)
      .input('salt', sql.VarChar(64), modern.salt).input('hash', sql.VarChar(256), modern.hash).query(`
        INSERT SEGUSUCRED(UsuLogin,PasswordSalt,PasswordHash,MigradoDesdeGX,FechaCambio)
        VALUES(@login,@salt,@hash,0,SYSUTCDATETIME());
      `);
  }
  await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('login', sql.VarChar(10), login).input('active', sql.SmallInt, item.active ? 1 : 0).input('actor', sql.VarChar(10), actor).query(`
    UPDATE SEGUSUEMP SET UsuEstado=@active WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login;
    IF @@ROWCOUNT=0 INSERT SEGUSUEMP(GECODEMP,UsuLogin,UsuEstado,UsuPerfil,UsuTipo,EsPrincipal,UsuCrea) VALUES(@empCod,@login,@active,'',0,1,@actor);
    IF NOT EXISTS(SELECT 1 FROM ASIGSIST WHERE GECODEMP=@empCod AND RTRIM(AsgSisLogin)=@login AND SistCod=55)
      INSERT ASIGSIST(GECODEMP,AsgSisLogin,SistCod) VALUES(@empCod,@login,55);
    IF NOT EXISTS(SELECT 1 FROM URolesPorUser WHERE GECODEMP=@empCod AND RTRIM(UsuLogin)=@login AND RTRIM(ROLCod)='CAS_USER')
      INSERT URolesPorUser(GECODEMP,UsuLogin,ROLCod,RXUFecCrea) VALUES(@empCod,@login,'CAS_USER',SYSUTCDATETIME());
  `);
  await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('externalCode', sql.VarChar(30), item.externalCode)
    .input('rut', sql.Int, item.rut).input('login', sql.Char(10), login).input('names', sql.VarChar(40), item.names)
    .input('paternal', sql.VarChar(40), item.paternalSurname).input('maternal', sql.VarChar(40), item.maternalSurname)
    .input('email', sql.VarChar(50), item.email).input('divId', sql.Char(10), location.divId).input('sdiId', sql.Char(10), location.sdiId)
    .input('cecId', sql.Char(10), location.cecId).input('active', sql.Bit, item.active).input('actor', sql.Char(10), actor).query(`
      UPDATE SSP06MASolicitante SET SOLRut=@rut,SOLLogin=@login,SOLNombres=@names,SOLApellidoPaterno=@paternal,SOLApellidoMaterno=@maternal,
        SOLEmail=@email,DivId=@divId,SdiId=@sdiId,CecId=@cecId,SOLActivo=@active,SOLFechaModifica=SYSUTCDATETIME(),SOLUsuarioModifica=@actor
      WHERE GECODEMP=@empCod AND SOLCodigoExterno=@externalCode;
      IF @@ROWCOUNT=0 INSERT SSP06MASolicitante(GECODEMP,SOLCodigoExterno,SOLRut,SOLLogin,SOLNombres,SOLApellidoPaterno,SOLApellidoMaterno,SOLEmail,DivId,SdiId,CecId,SOLActivo,SOLUsuarioModifica)
        VALUES(@empCod,@externalCode,@rut,@login,@names,@paternal,@maternal,@email,@divId,@sdiId,@cecId,@active,@actor);
    `);
};

const upsertSimple = async (transaction, config, item, empCod) => {
  const existing = await new sql.Request(transaction).input('empCod', sql.Int, empCod).input('external', sql.VarChar(30), item.externalCode)
    .query(`SELECT ${config.id} id FROM ${config.table} WHERE GECODEMP=@empCod AND ${config.external}=@external`);
  const id = existing.recordset[0]?.id ?? await nextId(transaction, config.table, config.id, empCod);
  const request = new sql.Request(transaction).input('empCod', sql.Int, empCod).input('id', config.type, id)
    .input('external', sql.VarChar(30), item.externalCode).input('name', sql.Char(40), item.name).input('active', sql.Bit, item.active);
  if (config.kind === 'category') request.input('order', sql.SmallInt, id);
  await request.query(existing.recordset[0] ? config.update : config.insert);
  return Number(id);
};

const configs = {
  category: { kind: 'category', table: 'SSP06MATPProducto', id: 'TPPRCod', external: 'TPPRCodigoExterno', type: sql.Decimal(10, 0),
    insert: 'INSERT SSP06MATPProducto(GECODEMP,TPPRCod,TPPRCodigoExterno,TPPRNombre,TPPROrden,TPPRAcceso,TPPRActivo) VALUES(@empCod,@id,@external,@name,@order,0,@active)',
    update: 'UPDATE SSP06MATPProducto SET TPPRNombre=@name,TPPRActivo=@active WHERE GECODEMP=@empCod AND TPPRCod=@id' },
  destination: { table: 'SSP06MADestinosPlanta', id: 'DESTICod', external: 'DESTICodigoExterno', type: sql.Decimal(10, 0),
    insert: 'INSERT SSP06MADestinosPlanta(GECODEMP,DESTICod,DESTICodigoExterno,DESTINom,DESTIActivo) VALUES(@empCod,@id,@external,@name,@active)',
    update: 'UPDATE SSP06MADestinosPlanta SET DESTINom=@name,DESTIActivo=@active WHERE GECODEMP=@empCod AND DESTICod=@id' },
  motive: { table: 'SSP06MAMotivoPedidos', id: 'Mot6Cod', external: 'Mot6CodigoExterno', type: sql.SmallInt,
    insert: 'INSERT SSP06MAMotivoPedidos(GECODEMP,Mot6Cod,Mot6CodigoExterno,Mot6Descrip,Mot6Activo) VALUES(@empCod,@id,@external,@name,@active)',
    update: 'UPDATE SSP06MAMotivoPedidos SET Mot6Descrip=@name,Mot6Activo=@active WHERE GECODEMP=@empCod AND Mot6Cod=@id' }
};

const apply = async (buffer, filename, context) => {
  const identity = session(context); const analysis = await analyze(buffer, context);
  if (!analysis.valid) throw new SecurityError(400, 'LOAD_VALIDATION_FAILED', 'La planilla contiene errores y no fue importada.', analysis.errors);
  const pool = await getPool(); const transaction = new sql.Transaction(pool); await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    for (const item of analysis.data.requesters) await upsertRequester(transaction, item, identity.empCod, identity.login);
    const categoryIds = new Map(); for (const item of analysis.data.categories) categoryIds.set(item.externalCode.toLowerCase(), await upsertSimple(transaction, configs.category, item, identity.empCod));
    const casinoIds = new Map();
    for (const item of analysis.data.casinos) {
      const responsible = await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('email', sql.VarChar(50), item.responsibleEmail)
        .query(`SELECT TOP(1) U.UsuRut rut,RTRIM(U.UsuDV) dv FROM USUARIOS U INNER JOIN SEGUSUEMP UE ON UE.UsuLogin=U.UsuLogin AND UE.GECODEMP=@empCod WHERE LOWER(RTRIM(U.UsuCorreo))=LOWER(@email)`);
      const person = responsible.recordset[0]; if (!person) throw new SecurityError(400, 'CASINO_RESPONSIBLE_NOT_FOUND', `No existe el responsable ${item.responsibleEmail}.`);
      const existing = await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('external', sql.VarChar(30), item.externalCode)
        .query('SELECT CASICod id FROM SSP06MACasinosPlanta WHERE GECODEMP=@empCod AND CASICodigoExterno=@external');
      const id = existing.recordset[0]?.id ?? await nextId(transaction, 'SSP06MACasinosPlanta', 'CASICod', identity.empCod);
      const request = new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('id', sql.Decimal(10, 0), id).input('external', sql.VarChar(30), item.externalCode)
        .input('name', sql.Char(40), item.name).input('rut', sql.Int, person.rut).input('dv', sql.Char(1), person.dv).input('email', sql.Char(50), item.email)
        .input('active', sql.Bit, item.active);
      await request.query(existing.recordset[0]
        ? 'UPDATE SSP06MACasinosPlanta SET CASINom=@name,CASIRut=@rut,CASIDV=@dv,CASIEmail=@email,CASIActivo=@active WHERE GECODEMP=@empCod AND CASICod=@id'
        : 'INSERT SSP06MACasinosPlanta(GECODEMP,CASICod,CASICodigoExterno,CASINom,CASIDV,CASIRut,CASIEmail,CASIActivo) VALUES(@empCod,@id,@external,@name,@dv,@rut,@email,@active)');
      casinoIds.set(item.externalCode.toLowerCase(), Number(id));
    }
    for (const item of analysis.data.destinations) await upsertSimple(transaction, configs.destination, item, identity.empCod);
    for (const item of analysis.data.motives) await upsertSimple(transaction, configs.motive, item, identity.empCod);
    for (const item of analysis.data.products) {
      const existing = await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('external', sql.VarChar(30), item.externalCode)
        .query('SELECT PRODCodigo id FROM SSP06MAProducto WHERE GECODEMP=@empCod AND PRODCodigoExterno=@external');
      const id = existing.recordset[0]?.id ?? await nextId(transaction, 'SSP06MAProducto', 'PRODCodigo', identity.empCod);
      const request = new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('id', sql.Decimal(10, 0), id)
        .input('external', sql.VarChar(30), item.externalCode).input('name', sql.VarChar(60), item.name).input('price', sql.Decimal(10, 0), item.price)
        .input('categoryId', sql.Decimal(10, 0), categoryIds.get(item.categoryExternalCode.toLowerCase()))
        .input('casinoId', sql.Decimal(10, 0), casinoIds.get(item.casinoExternalCode.toLowerCase())).input('active', sql.Bit, item.active);
      await request.query(existing.recordset[0]
        ? 'UPDATE SSP06MAProducto SET ProdNombre=@name,PRODPrecio=@price,TPPRCod=@categoryId,CASICod=@casinoId,PRODActivo=@active WHERE GECODEMP=@empCod AND PRODCodigo=@id'
        : 'INSERT SSP06MAProducto(GECODEMP,PRODCodigo,PRODCodigoExterno,TPPRCod,ProdNombre,PRODPrecio,CASICod,PRODActivo) VALUES(@empCod,@id,@external,@categoryId,@name,@price,@casinoId,@active)');
    }
    await new sql.Request(transaction).input('empCod', sql.Int, identity.empCod).input('filename', sql.VarChar(255), clean(filename).slice(0, 255))
      .input('summary', sql.NVarChar(sql.MAX), JSON.stringify(analysis.summary)).input('actor', sql.Char(10), identity.login)
      .query('INSERT SSP06OPCargaCasino(GECODEMP,CARArchivo,CARResumen,CARUsuario) VALUES(@empCod,@filename,@summary,@actor)');
    await transaction.commit(); return { imported: true, summary: analysis.summary };
  } catch (error) { await transaction.rollback(); throw error; }
};

module.exports = { analyze, apply, upsertRequester, session };
