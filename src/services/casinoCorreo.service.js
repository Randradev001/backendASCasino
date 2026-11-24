const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const provider = require('./casinoCorreo.provider');
const { normalizeMailQuery, parseMailId } = require('./casinoCorreo.rules');

const clean = (value) => String(value || '').trim();
const session = (context) => { const empCod = Number(context?.empCod); const login = clean(context?.login).toUpperCase(); if (!Number.isInteger(empCod) || empCod < 1 || !login) throw new SecurityError(401, 'UNAUTHENTICATED', 'La sesion no es valida.'); return { empCod, login }; };
const map = (row) => ({ id: Number(row.CorreoId), orderNumber: Number(row.PEDNumero || 0) || null, eventType: clean(row.TipoEvento), recipient: clean(row.Destinatario), subject: clean(row.Asunto), status: clean(row.Estado), attempts: Number(row.Intentos || 0), availableAt: row.DisponibleDesde, sentAt: row.EnviadoEn, providerId: clean(row.ProveedorId) || null, lastError: clean(row.UltimoError) || null, createdAt: row.CreadoEn, createdBy: clean(row.CreadoPor) });

const list = async (query, context) => {
  const current = session(context); const f = normalizeMailQuery(query); const pool = await getPool();
  const request = pool.request().input('empCod', sql.Int, current.empCod).input('from', sql.Date, f.from).input('to', sql.Date, f.to)
    .input('status', sql.VarChar(12), f.status).input('eventType', sql.VarChar(40), f.eventType).input('q', sql.VarChar(102), f.q ? `%${f.q}%` : null)
    .input('offset', sql.Int, f.offset).input('pageSize', sql.Int, f.pageSize);
  const where = `WHERE GECODEMP=@empCod AND (@from IS NULL OR CreadoEn>=@from) AND (@to IS NULL OR CreadoEn<DATEADD(day,1,@to))
    AND (@status IS NULL OR Estado=@status) AND (@eventType IS NULL OR TipoEvento=@eventType)
    AND (@q IS NULL OR Destinatario LIKE @q OR Asunto LIKE @q OR CONVERT(varchar(20),PEDNumero) LIKE @q)`;
  const result = await request.query(`
    SELECT CorreoId,PEDNumero,TipoEvento,Destinatario,Asunto,Estado,Intentos,DisponibleDesde,EnviadoEn,ProveedorId,UltimoError,CreadoEn,CreadoPor
    FROM SSP06OPCorreoOutbox ${where} ORDER BY CreadoEn DESC,CorreoId DESC${f.exportAll ? ';' : ' OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;'}
    SELECT COUNT(*) Total,SUM(CASE WHEN Estado='PENDIENTE' THEN 1 ELSE 0 END) Pending,SUM(CASE WHEN Estado='ENVIADO' THEN 1 ELSE 0 END) Sent,
      SUM(CASE WHEN Estado='ERROR' THEN 1 ELSE 0 END) Failed,SUM(CASE WHEN Estado='PROCESANDO' THEN 1 ELSE 0 END) Processing FROM SSP06OPCorreoOutbox ${where};
    SELECT DISTINCT TipoEvento id,TipoEvento name FROM SSP06OPCorreoOutbox WHERE GECODEMP=@empCod ORDER BY TipoEvento;`);
  const summary = result.recordsets[1]?.[0] || {};
  return { rows: (result.recordsets[0] || []).map(map), total: Number(summary.Total || 0), page: f.page, pageSize: f.pageSize,
    summary: { total: Number(summary.Total || 0), pending: Number(summary.Pending || 0), sent: Number(summary.Sent || 0), failed: Number(summary.Failed || 0), processing: Number(summary.Processing || 0) },
    eventTypes: result.recordsets[2] || [], provider: { configured: provider.isConfigured(), workerEnabled: process.env.CASINO_EMAIL_WORKER_ENABLED === 'true' } };
};

const detail = async (idValue, context) => {
  const current = session(context); const id = parseMailId(idValue); const result = await (await getPool()).request().input('empCod', sql.Int, current.empCod).input('id', sql.BigInt, id).query(`
    SELECT * FROM SSP06OPCorreoOutbox WHERE GECODEMP=@empCod AND CorreoId=@id;
    SELECT Intento,Fecha,Exitoso,ProveedorId,Error FROM SSP06OPCorreoIntento WHERE GECODEMP=@empCod AND CorreoId=@id ORDER BY Intento DESC;`);
  if (!result.recordsets[0]?.[0]) throw new SecurityError(404, 'MAIL_NOT_FOUND', 'El correo no existe.');
  return { ...map(result.recordsets[0][0]), data: JSON.parse(result.recordsets[0][0].Datos), history: (result.recordsets[1] || []).map((x) => ({ attempt: Number(x.Intento), at: x.Fecha, success: Boolean(x.Exitoso), providerId: clean(x.ProveedorId) || null, error: clean(x.Error) || null })) };
};

const retry = async (idValue, context) => {
  const current = session(context); const id = parseMailId(idValue); const result = await (await getPool()).request().input('empCod', sql.Int, current.empCod).input('id', sql.BigInt, id).query(`
    DECLARE @recipient varchar(254);
    SELECT @recipient=CASE WHEN O.TipoEvento='ORDER_SENT' THEN RTRIM(C.CASIEmail) ELSE RTRIM(S.SOLEmail) END
    FROM SSP06OPCorreoOutbox O
    LEFT JOIN SSP06OPPedidosPlanta P ON P.GECODEMP=O.GECODEMP AND P.PEDNumero=O.PEDNumero
    LEFT JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod
    LEFT JOIN SSP06MASolicitante S ON S.GECODEMP=P.GECODEMP AND S.SOLRut=P.PedRutSolicita
    WHERE O.GECODEMP=@empCod AND O.CorreoId=@id;
    UPDATE SSP06OPCorreoOutbox SET Destinatario=COALESCE(NULLIF(LTRIM(RTRIM(@recipient)),''),Destinatario),
      Estado=CASE WHEN NULLIF(LTRIM(RTRIM(COALESCE(@recipient,Destinatario))), '') IS NULL THEN 'ERROR' ELSE 'PENDIENTE' END,
      DisponibleDesde=SYSUTCDATETIME(),BloqueadoHasta=NULL,
      UltimoError=CASE WHEN NULLIF(LTRIM(RTRIM(COALESCE(@recipient,Destinatario))), '') IS NULL THEN 'Destinatario no configurado.' ELSE NULL END
    WHERE GECODEMP=@empCod AND CorreoId=@id AND Estado IN ('ERROR','CANCELADO');
    DECLARE @changed int=@@ROWCOUNT; SELECT @changed Changed,Estado Status FROM SSP06OPCorreoOutbox WHERE GECODEMP=@empCod AND CorreoId=@id;`);
  if (!Number(result.recordset[0]?.Changed)) throw new SecurityError(409, 'MAIL_NOT_RETRYABLE', 'Solo se pueden reintentar correos con error o cancelados.');
  return { id, status: clean(result.recordset[0]?.Status) };
};

const render = (mail) => `<div style="font-family:Arial,sans-serif;color:#243447"><h2 style="color:#00549F">${mail.Asunto}</h2><p>El pedido <strong>#${mail.PEDNumero}</strong> tuvo una actualización en ADP Casino.</p><p>Ingrese a ADP para revisar el detalle y su estado actual.</p><hr><small>Mensaje automático. No responda este correo.</small></div>`;
const processBatch = async (limit = 10) => {
  if (!provider.isConfigured()) return { processed: 0, sent: 0, failed: 0, skipped: true };
  const pool = await getPool(); const claimed = await pool.request().input('limit', sql.Int, Math.min(Math.max(Number(limit) || 10, 1), 50)).query(`
    UPDATE SSP06OPCorreoOutbox SET Estado='PENDIENTE',BloqueadoHasta=NULL WHERE Estado='PROCESANDO' AND BloqueadoHasta<SYSUTCDATETIME();
    ;WITH C AS (SELECT TOP (@limit) * FROM SSP06OPCorreoOutbox WITH (UPDLOCK,READPAST,ROWLOCK) WHERE Estado='PENDIENTE' AND DisponibleDesde<=SYSUTCDATETIME() ORDER BY CreadoEn)
    UPDATE C SET Estado='PROCESANDO',BloqueadoHasta=DATEADD(minute,5,SYSUTCDATETIME()),Intentos=Intentos+1 OUTPUT inserted.*;`);
  let sent = 0; let failed = 0;
  for (const mail of claimed.recordset) {
    try {
      const response = await provider.send({ to: clean(mail.Destinatario), subject: clean(mail.Asunto), html: render(mail) });
      await pool.request().input('empCod', sql.Int, mail.GECODEMP).input('id', sql.BigInt, mail.CorreoId).input('attempt', sql.SmallInt, mail.Intentos).input('providerId', sql.VarChar(120), response.id).query(`
        UPDATE SSP06OPCorreoOutbox SET Estado='ENVIADO',EnviadoEn=SYSUTCDATETIME(),BloqueadoHasta=NULL,ProveedorId=@providerId,UltimoError=NULL WHERE GECODEMP=@empCod AND CorreoId=@id;
        INSERT SSP06OPCorreoIntento VALUES(@empCod,@id,@attempt,SYSUTCDATETIME(),1,@providerId,NULL);`); sent += 1;
    } catch (error) {
      const message = clean(error.message).slice(0, 500); const delay = Math.min(60, 2 ** Math.min(Number(mail.Intentos), 5));
      await pool.request().input('empCod', sql.Int, mail.GECODEMP).input('id', sql.BigInt, mail.CorreoId).input('attempt', sql.SmallInt, mail.Intentos).input('error', sql.VarChar(500), message).input('delay', sql.Int, delay).query(`
        UPDATE SSP06OPCorreoOutbox SET Estado=CASE WHEN Intentos>=5 THEN 'ERROR' ELSE 'PENDIENTE' END,DisponibleDesde=DATEADD(minute,@delay,SYSUTCDATETIME()),BloqueadoHasta=NULL,UltimoError=@error WHERE GECODEMP=@empCod AND CorreoId=@id;
        INSERT SSP06OPCorreoIntento VALUES(@empCod,@id,@attempt,SYSUTCDATETIME(),0,NULL,@error);`); failed += 1;
    }
  }
  return { processed: claimed.recordset.length, sent, failed, skipped: false };
};

module.exports = { list, detail, retry, processBatch };
