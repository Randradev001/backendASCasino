const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const {
  normalizeListQuery,
  normalizeRut,
  validLegacyDate,
  calculateAge,
  calculateServiceDuration,
  calculateAbsenteeism
} = require('./personas.rules');

const clean = (value) => (typeof value === 'string' ? value.trim() : value);
const cleanDate = (value) => validLegacyDate(value);

const assertContext = (context) => {
  const empCod = Number(context?.empCod);
  if (!Number.isInteger(empCod) || empCod < 1) {
    throw new SecurityError(401, 'UNAUTHENTICATED', 'No existe una empresa autenticada.');
  }
  return empCod;
};

const bindList = (request, params, empCod) => request
  .input('empCod', sql.Int, empCod)
  .input('search', sql.VarChar(132), params.search ? `%${params.search}%` : null)
  .input('estado', sql.SmallInt, params.estado)
  .input('offset', sql.Int, params.offset)
  .input('pageSize', sql.Int, params.pageSize);

const list = async (query, context) => {
  const empCod = assertContext(context);
  const params = normalizeListQuery(query);
  const pool = await getPool();
  const where = `
    P.GECODEMP=@empCod
    AND (@estado IS NULL OR P.PerEstadoLab=@estado)
    AND (@search IS NULL OR RTRIM(P.PernombreCom) LIKE @search OR CONVERT(varchar(10),P.PerRut) LIKE @search)
  `;

  const [countResult, rowsResult] = await Promise.all([
    bindList(pool.request(), params, empCod).query(`SELECT COUNT(*) total FROM dbo.FPPersonas P WHERE ${where}`),
    bindList(pool.request(), params, empCod).query(`
      SELECT P.PerRut, P.PerDV, RTRIM(P.PernombreCom) nombreCompleto,
             P.PerEstadoLab, RTRIM(P.PerEmail) email, RTRIM(P.PerAnexo) anexo,
             RTRIM(P.DivId) divisionId, RTRIM(P.SdiId) subdivisionId, RTRIM(P.CecId) centroCostoId,
             RTRIM(D.DivDescripcion) division, RTRIM(DS.SdiDescripcion) subdivision,
             RTRIM(C.CecDescripcion) centroCosto, RTRIM(F.FunDescripcion) funcion,
             RTRIM(J.PernombreCom) jefe, P.PerGF tieneFoto
      FROM dbo.FPPersonas P
      LEFT JOIN dbo.FPDivision D ON D.GECODEMP=P.GECODEMP AND D.DivId=P.DivId
      LEFT JOIN dbo.FPDivisionSub DS ON DS.GECODEMP=P.GECODEMP AND DS.DivId=P.DivId AND DS.SdiId=P.SdiId
      LEFT JOIN dbo.FPCenCos C ON C.GECODEMP=P.GECODEMP AND C.CecId=P.CecId
      LEFT JOIN dbo.FPFuncion F ON F.GECODEMP=P.GECODEMP AND F.FunId=P.FunId
      LEFT JOIN dbo.FPPersonas J ON J.GECODEMP=P.GECODEMP AND J.PerRut=P.PerJefe
      WHERE ${where}
      ORDER BY P.PerEstadoLab, P.PernombreCom, P.PerRut
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `)
  ]);

  const total = Number(countResult.recordset[0]?.total || 0);
  return {
    data: rowsResult.recordset.map((row) => ({
      rut: Number(row.PerRut),
      dv: clean(row.PerDV),
      rutCompleto: `${Number(row.PerRut)}-${clean(row.PerDV)}`,
      nombreCompleto: clean(row.nombreCompleto),
      estado: Number(row.PerEstadoLab),
      estadoNombre: Number(row.PerEstadoLab) === 1 ? 'Activo' : 'Finiquitado',
      email: clean(row.email),
      anexo: clean(row.anexo),
      divisionId: clean(row.divisionId),
      division: clean(row.division),
      subdivisionId: clean(row.subdivisionId),
      subdivision: clean(row.subdivision),
      centroCostoId: clean(row.centroCostoId),
      centroCosto: clean(row.centroCosto),
      funcion: clean(row.funcion),
      jefe: clean(row.jefe),
      tieneFoto: Number(row.tieneFoto) === 1
    })),
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      pages: Math.ceil(total / params.pageSize)
    }
  };
};

const getByRut = async (rutValue, context) => {
  const empCod = assertContext(context);
  const rut = normalizeRut(rutValue);
  const pool = await getPool();
  const result = await pool.request().input('empCod', sql.Int, empCod).input('rut', sql.Int, rut).query(`
    SELECT P.PerRut, P.PerDV, P.Pernombre, P.PerPaterno, P.PerMaterno,
           P.PernombreCom, P.PerTratamiento, P.PerSexo, P.PerFechanac,
           P.PerNacionalidad, P.PerEstadoCivil, P.PerHijos, P.PerDireccion,
           P.PerCalleynumero, P.PerComuna, P.PerProvincia, P.PerRegion,
           P.PerPais, P.PerTelefono, P.PerAnexo, P.PerEmail,
           P.PerPosicionDesc, P.PerDesde, P.PerHasta, P.PerEstadoLab,
           P.PerTURCod, P.Perfallas, P.Perlicencias, P.PerNCartas,
           P.PerDescConv, P.PerDescAFP, P.PerDescISAPRE, P.PerDescFonSolid,
           CASE WHEN P.PerFoto IS NOT NULL AND DATALENGTH(P.PerFoto)>0 THEN 1 ELSE 0 END tieneFoto,
           RTRIM(G.GPDescripcion) GPDescripcion, RTRIM(A.APDescripcion) APDescripcion,
           RTRIM(D.DivDescripcion) DivDescripcion, RTRIM(DS.SdiDescripcion) SdiDescripcion,
           RTRIM(O.UOrDescripcion) UOrDescripcion, RTRIM(C.CecDescripcion) CecDescripcion,
           RTRIM(C2.CecDescripcion) PerCecDescripcion, RTRIM(F.FunDescripcion) FunDescripcion,
           RTRIM(S.SinDesc) SinDesc, RTRIM(J.PernombreCom) PerJefeNombre,
           RTRIM(T.TURDesc) TURDesc
    FROM dbo.FPPersonas P
    LEFT JOIN dbo.FPGrupos G ON G.GECODEMP=P.GECODEMP AND G.GPId=P.GPId
    LEFT JOIN dbo.FPArea A ON A.GECODEMP=P.GECODEMP AND A.APId=P.APId
    LEFT JOIN dbo.FPDivision D ON D.GECODEMP=P.GECODEMP AND D.DivId=P.DivId
    LEFT JOIN dbo.FPDivisionSub DS ON DS.GECODEMP=P.GECODEMP AND DS.DivId=P.DivId AND DS.SdiId=P.SdiId
    LEFT JOIN dbo.FPOrganiza O ON O.GECODEMP=P.GECODEMP AND O.UOrId=P.UOrId
    LEFT JOIN dbo.FPCenCos C ON C.GECODEMP=P.GECODEMP AND C.CecId=P.CecId
    LEFT JOIN dbo.FPCenCos C2 ON C2.GECODEMP=P.GECODEMP AND C2.CecId=P.PerCeCID
    LEFT JOIN dbo.FPFuncion F ON F.GECODEMP=P.GECODEMP AND F.FunId=P.FunId
    LEFT JOIN dbo.FPSindicato S ON S.GECODEMP=P.GECODEMP AND S.SindId=P.SindId
    LEFT JOIN dbo.FPPersonas J ON J.GECODEMP=P.GECODEMP AND J.PerRut=P.PerJefe
    LEFT JOIN dbo.CHTurnos T ON T.GECODEMP=P.GECODEMP AND T.TURCod=P.PerTURCod
    WHERE P.GECODEMP=@empCod AND P.PerRut=@rut;
  `);

  const row = result.recordset[0];
  if (!row) throw new SecurityError(404, 'PERSON_NOT_FOUND', 'La persona no existe en la empresa autenticada.');

  const today = new Date();
  const birthDate = cleanDate(row.PerFechanac);
  const from = cleanDate(row.PerDesde);
  const until = cleanDate(row.PerHasta);
  const service = calculateServiceDuration(from, until, today);

  return {
    rut: Number(row.PerRut),
    dv: clean(row.PerDV),
    rutCompleto: `${Number(row.PerRut)}-${clean(row.PerDV)}`,
    nombre: clean(row.Pernombre),
    apellidoPaterno: clean(row.PerPaterno),
    apellidoMaterno: clean(row.PerMaterno),
    nombreCompleto: clean(row.PernombreCom),
    tratamiento: clean(row.PerTratamiento),
    sexo: clean(row.PerSexo),
    fechaNacimiento: birthDate,
    edad: calculateAge(birthDate, today),
    nacionalidad: clean(row.PerNacionalidad),
    estadoCivil: clean(row.PerEstadoCivil),
    hijos: Number(row.PerHijos || 0),
    contacto: {
      direccion: clean(row.PerCalleynumero) || clean(row.PerDireccion),
      comuna: clean(row.PerComuna),
      provincia: clean(row.PerProvincia),
      region: clean(row.PerRegion),
      pais: clean(row.PerPais),
      telefono: clean(row.PerTelefono),
      anexo: clean(row.PerAnexo),
      email: clean(row.PerEmail)
    },
    contrato: {
      grupo: clean(row.GPDescripcion),
      area: clean(row.APDescripcion),
      division: clean(row.DivDescripcion),
      subdivision: clean(row.SdiDescripcion),
      organizacion: clean(row.UOrDescripcion),
      centroCosto: clean(row.CecDescripcion),
      ultimoCentroCosto: clean(row.PerCecDescripcion),
      funcion: clean(row.FunDescripcion),
      posicion: clean(row.PerPosicionDesc),
      jefe: clean(row.PerJefeNombre),
      fechaDesde: from,
      fechaHasta: until,
      antiguedad: service,
      estado: Number(row.PerEstadoLab),
      estadoNombre: Number(row.PerEstadoLab) === 1 ? 'Activo' : 'Finiquitado',
      turno: clean(row.TURDesc) || clean(row.PerTURCod),
      sindicato: clean(row.SinDesc)
    },
    indicadores: {
      fallas: Number(row.Perfallas || 0),
      licencias: Number(row.Perlicencias || 0),
      cartas: Number(row.PerNCartas || 0),
      ausentismo: calculateAbsenteeism(row.Perfallas, row.Perlicencias, service)
    },
    previsional: {
      convenio: clean(row.PerDescConv),
      afp: clean(row.PerDescAFP),
      isapre: clean(row.PerDescISAPRE),
      fondoSolidario: clean(row.PerDescFonSolid)
    },
    tieneFoto: Number(row.tieneFoto) === 1
  };
};

const getPhoto = async (rutValue, context) => {
  const empCod = assertContext(context);
  const rut = normalizeRut(rutValue);
  const pool = await getPool();
  const result = await pool.request().input('empCod', sql.Int, empCod).input('rut', sql.Int, rut).query(`
    SELECT PerFoto FROM dbo.FPPersonas WHERE GECODEMP=@empCod AND PerRut=@rut;
  `);
  const photo = result.recordset[0]?.PerFoto;
  if (!Buffer.isBuffer(photo) || !photo.length) {
    throw new SecurityError(404, 'PHOTO_NOT_FOUND', 'La persona no tiene fotografia.');
  }
  return photo;
};

module.exports = { list, getByRut, getPhoto };
