const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { enqueueOrderEvent } = require('./casinoCorreoOutbox.service');
const { normalizeEvaluation, normalizeCasinoObservation, normalizePaymentControl } = require('./casinoEvaluaciones.rules');

const clean = (value) => String(value || '').trim();
const sessionFrom = (context) => {
  const empCod = Number(context?.empCod); const login = clean(context?.login).toUpperCase();
  if (!Number.isInteger(empCod) || empCod < 1 || !login) throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa y el usuario deben provenir de la sesion.');
  return { empCod, login };
};
const orderFrom = (value) => {
  const orderNumber = Number(value);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El numero de pedido no es valido.');
  return orderNumber;
};

const evaluateOwnOrder = async (numberValue, body, context) => {
  const session = sessionFrom(context); const orderNumber = orderFrom(numberValue); const payload = normalizeEvaluation(body);
  const pool = await getPool(); const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const request = new sql.Request(transaction).input('empCod', sql.Int, session.empCod).input('login', sql.VarChar(10), session.login)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber).input('evaluation', sql.SmallInt, payload.evaluation)
      .input('comment', sql.VarChar(200), payload.comment).input('paymentControl', sql.SmallInt, payload.evaluation === 1 ? 2 : 1);
    const result = await request.query(`
      DECLARE @rut int,@status smallint,@previous smallint;
      SELECT @rut=U.UsuRut FROM USUARIOS U WHERE RTRIM(U.UsuLogin)=@login;
      SELECT @status=PedEstadoIngreso,@previous=PEDControlPago FROM SSP06OPPedidosPlanta WITH (UPDLOCK,HOLDLOCK)
      WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber AND PedRutSolicita=@rut;
      IF @status IS NULL THROW 51001,'ORDER_NOT_OWNED',1;
      IF @status<>3 THROW 51002,'ORDER_NOT_DELIVERED',1;
      IF EXISTS (SELECT 1 FROM SSP06OPEvalPedidoCasino WHERE GECODEMP=@empCod AND EVPedCod=1 AND PEDNumero=@orderNumber)
        UPDATE SSP06OPEvalPedidoCasino SET EVPedEvaluacion=@evaluation,EVPEDFecha=GETDATE(),EVPEDTipo=1,EvPedObsUsuario=@comment
        WHERE GECODEMP=@empCod AND EVPedCod=1 AND PEDNumero=@orderNumber;
      ELSE
        INSERT SSP06OPEvalPedidoCasino(GECODEMP,EVPedCod,PEDNumero,PEDCodigo,EVPedObservacionCasino,EVPedEvaluacion,EVPEDFecha,EVPEDTipo,EVPEDOBSCasino,EvPedObsUsuario)
        VALUES(@empCod,1,@orderNumber,0,'',@evaluation,GETDATE(),1,'',@comment);
      UPDATE SSP06OPPedidosPlanta SET PEDControlPago=@paymentControl WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
      INSERT SSP06OPPedidosPlantaPagoHistorial(GECODEMP,PEDNumero,EstadoAnterior,EstadoNuevo,Motivo,Origen,UsuLogin,FechaRegistro)
      VALUES(@empCod,@orderNumber,@previous,@paymentControl,CASE WHEN @evaluation=1 THEN 'Bloqueo automatico por evaluacion Mala' ELSE 'Liberacion automatica por evaluacion' END,'EVALUACION',@login,SYSUTCDATETIME());
      SELECT @rut UserRut;
    `);
    await enqueueOrderEvent(transaction, { empCod: session.empCod, orderNumber, eventType: payload.evaluation === 1 ? 'PAYMENT_BLOCKED' : 'PAYMENT_RELEASED', login: session.login });
    await transaction.commit();
    return { number: orderNumber, evaluation: payload.evaluation, comment: payload.comment, paymentControl: payload.evaluation === 1 ? 2 : 1, paymentLabel: payload.evaluation === 1 ? 'Pago bloqueado' : 'Pago liberado', evaluatedAt: new Date().toISOString(), userRut: Number(result.recordset[0]?.UserRut || 0) };
  } catch (error) {
    await transaction.rollback();
    if (error.number === 51001 || error.message === 'ORDER_NOT_OWNED') throw new SecurityError(404, 'ORDER_NOT_OWNED', 'El pedido no pertenece al solicitante autenticado.');
    if (error.number === 51002 || error.message === 'ORDER_NOT_DELIVERED') throw new SecurityError(409, 'ORDER_NOT_DELIVERED', 'Solo puede evaluar un pedido entregado.');
    throw error;
  }
};

const updateByCasino = async (numberValue, context, payload, mode) => {
  const session = sessionFrom(context); const orderNumber = orderFrom(numberValue); const pool = await getPool(); const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const request = new sql.Request(transaction).input('empCod', sql.Int, session.empCod).input('login', sql.VarChar(10), session.login)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber).input('comment', sql.VarChar(200), payload.comment);
    if (mode === 'payment') request.input('paymentControl', sql.SmallInt, payload.paymentControl);
    await request.query(mode === 'observation' ? `
      DECLARE @casinoId decimal(10,0),@status smallint;
      SELECT TOP 1 @casinoId=C.CASICod FROM USUARIOS U JOIN SEGUSUEMP UE ON UE.GECODEMP=@empCod AND RTRIM(UE.UsuLogin)=RTRIM(U.UsuLogin) AND UE.UsuEstado=1
      JOIN SSP06MACasinosPlanta C ON C.GECODEMP=UE.GECODEMP AND C.CASIRut=U.UsuRut WHERE RTRIM(U.UsuLogin)=@login;
      SELECT @status=PedEstadoIngreso FROM SSP06OPPedidosPlanta WHERE GECODEMP=@empCod AND CASICod=@casinoId AND PEDNumero=@orderNumber;
      IF @status IS NULL THROW 51003,'ORDER_NOT_SCOPED',1;
      IF EXISTS (SELECT 1 FROM SSP06OPEvalPedidoCasino WHERE GECODEMP=@empCod AND EVPedCod=1 AND PEDNumero=@orderNumber)
        UPDATE SSP06OPEvalPedidoCasino SET EVPEDOBSCasino=@comment,EVPEDFecha=GETDATE() WHERE GECODEMP=@empCod AND EVPedCod=1 AND PEDNumero=@orderNumber;
      ELSE INSERT SSP06OPEvalPedidoCasino(GECODEMP,EVPedCod,PEDNumero,PEDCodigo,EVPedObservacionCasino,EVPedEvaluacion,EVPEDFecha,EVPEDTipo,EVPEDOBSCasino,EvPedObsUsuario)
        VALUES(@empCod,1,@orderNumber,0,'',0,GETDATE(),2,@comment,'');
    ` : `
      DECLARE @casinoId decimal(10,0),@status smallint,@previous smallint;
      SELECT TOP 1 @casinoId=C.CASICod FROM USUARIOS U JOIN SEGUSUEMP UE ON UE.GECODEMP=@empCod AND RTRIM(UE.UsuLogin)=RTRIM(U.UsuLogin) AND UE.UsuEstado=1
      JOIN SSP06MACasinosPlanta C ON C.GECODEMP=UE.GECODEMP AND C.CASIRut=U.UsuRut WHERE RTRIM(U.UsuLogin)=@login;
      SELECT @status=PedEstadoIngreso,@previous=PEDControlPago FROM SSP06OPPedidosPlanta WITH (UPDLOCK,HOLDLOCK)
      WHERE GECODEMP=@empCod AND CASICod=@casinoId AND PEDNumero=@orderNumber;
      IF @status IS NULL THROW 51003,'ORDER_NOT_SCOPED',1;
      IF @status<>3 THROW 51002,'ORDER_NOT_DELIVERED',1;
      UPDATE SSP06OPPedidosPlanta SET PEDControlPago=@paymentControl WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
      INSERT SSP06OPPedidosPlantaPagoHistorial(GECODEMP,PEDNumero,EstadoAnterior,EstadoNuevo,Motivo,Origen,UsuLogin,FechaRegistro)
      VALUES(@empCod,@orderNumber,@previous,@paymentControl,@comment,'CASINO',@login,SYSUTCDATETIME());
    `);
    if (mode === 'payment') await enqueueOrderEvent(transaction, { empCod: session.empCod, orderNumber, eventType: payload.paymentControl === 2 ? 'PAYMENT_BLOCKED' : 'PAYMENT_RELEASED', login: session.login });
    await transaction.commit();
    return mode === 'observation' ? { number: orderNumber, casinoComment: payload.comment } : { number: orderNumber, paymentControl: payload.paymentControl, paymentLabel: payload.paymentControl === 1 ? 'Pago liberado' : 'Pago bloqueado' };
  } catch (error) {
    await transaction.rollback();
    if (error.number === 51003 || error.message === 'ORDER_NOT_SCOPED') throw new SecurityError(404, 'ORDER_NOT_SCOPED', 'El pedido no pertenece al Casino autenticado.');
    if (error.number === 51002 || error.message === 'ORDER_NOT_DELIVERED') throw new SecurityError(409, 'ORDER_NOT_DELIVERED', 'El control de pago solo se modifica después de la entrega.');
    throw error;
  }
};

module.exports = {
  evaluateOwnOrder,
  addCasinoObservation: (number, body, context) => updateByCasino(number, context, normalizeCasinoObservation(body), 'observation'),
  setPaymentControl: (number, body, context) => updateByCasino(number, context, normalizePaymentControl(body), 'payment')
};
