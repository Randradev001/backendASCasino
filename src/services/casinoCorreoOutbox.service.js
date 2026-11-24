const { sql } = require('../conectorMysql/conectorSqlServer');

const requestFor = (executor) => (executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request());
const EVENT_SUBJECTS = {
  ORDER_SENT: 'Nuevo pedido Casino', ORDER_APPROVED: 'Pedido Casino aprobado', ORDER_REJECTED: 'Pedido Casino rechazado',
  ORDER_DELIVERED: 'Pedido Casino entregado', PAYMENT_BLOCKED: 'Pago de pedido Casino bloqueado', PAYMENT_RELEASED: 'Pago de pedido Casino liberado'
};

const enqueueOrderEvent = async (executor, { empCod, orderNumber, eventType, login }) => {
  if (!EVENT_SUBJECTS[eventType]) throw new Error(`Tipo de correo Casino no soportado: ${eventType}`);
  const recipientExpression = eventType === 'ORDER_SENT' ? 'RTRIM(C.CASIEmail)' : 'RTRIM(S.SOLEmail)';
  const join = eventType === 'ORDER_SENT'
    ? 'JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod'
    : 'JOIN SSP06MASolicitante S ON S.GECODEMP=P.GECODEMP AND S.SOLRut=P.PedRutSolicita';
  await requestFor(executor).input('empCod', sql.Int, empCod).input('orderNumber', sql.Decimal(10, 0), orderNumber)
    .input('eventType', sql.VarChar(40), eventType).input('subject', sql.VarChar(200), `${EVENT_SUBJECTS[eventType]} #${orderNumber}`)
    .input('login', sql.VarChar(10), login).query(`
      DECLARE @recipient varchar(254),@sequence int,@key varchar(120);
      SELECT @recipient=${recipientExpression} FROM SSP06OPPedidosPlanta P ${join}
      WHERE P.GECODEMP=@empCod AND P.PEDNumero=@orderNumber;
      SELECT @sequence=COUNT(*)+1 FROM SSP06OPCorreoOutbox WITH (UPDLOCK,HOLDLOCK)
      WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber AND TipoEvento=@eventType;
      SET @key=CONCAT(@eventType,'-',CONVERT(varchar(20),@orderNumber),'-',@sequence);
      INSERT SSP06OPCorreoOutbox(GECODEMP,Idempotencia,PEDNumero,TipoEvento,Destinatario,Asunto,Datos,Estado,Intentos,DisponibleDesde,UltimoError,CreadoEn,CreadoPor)
      VALUES(@empCod,@key,@orderNumber,@eventType,COALESCE(@recipient,''),@subject,
        CONCAT('{"orderNumber":',CONVERT(varchar(20),@orderNumber),'}'),
        CASE WHEN NULLIF(LTRIM(RTRIM(@recipient)),'') IS NULL THEN 'ERROR' ELSE 'PENDIENTE' END,0,SYSUTCDATETIME(),
        CASE WHEN NULLIF(LTRIM(RTRIM(@recipient)),'') IS NULL THEN 'Destinatario no configurado.' ELSE NULL END,
        SYSUTCDATETIME(),@login);
    `);
};

module.exports = { EVENT_SUBJECTS, enqueueOrderEvent };
