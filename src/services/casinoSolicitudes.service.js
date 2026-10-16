const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { statusLabel } = require('./casinoBi.rules');
const {
  normalizeRequestsQuery,
  normalizeApproval,
  normalizeRejection,
  classifyDeliveryTiming
} = require('./casinoSolicitudes.rules');

const clean = (value) => String(value || '').trim();
const numeric = (value) => Number(value || 0);

const assertSession = (context) => {
  const empCod = Number(context?.empCod);
  const login = clean(context?.login).toUpperCase();
  if (!Number.isInteger(empCod) || empCod < 1 || !login) {
    throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa y el usuario deben provenir de la sesion.');
  }
  return { empCod, login };
};

const requestFor = (executor) => (executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request());

const loadCasinoContext = async (executor, session) => {
  const result = await requestFor(executor)
    .input('empCod', sql.Int, session.empCod)
    .input('login', sql.VarChar(10), session.login)
    .query(`
      SELECT TOP (1) C.CASICod,RTRIM(C.CASINom) CASINom,U.UsuRut
      FROM USUARIOS U
      INNER JOIN SEGUSUEMP UE
        ON UE.GECODEMP=@empCod AND RTRIM(UE.UsuLogin)=RTRIM(U.UsuLogin) AND UE.UsuEstado=1
      INNER JOIN SSP06MACasinosPlanta C
        ON C.GECODEMP=UE.GECODEMP AND C.CASIRut=U.UsuRut
      WHERE RTRIM(U.UsuLogin)=@login;
    `);
  const row = result.recordset[0];
  if (!row) {
    throw new SecurityError(409, 'CASINO_NOT_LINKED', 'El usuario no esta asociado al RUT de un casino de la empresa autenticada.');
  }
  return { id: numeric(row.CASICod), name: clean(row.CASINom), rut: numeric(row.UsuRut) };
};

const parseOrderNumber = (value) => {
  const orderNumber = Number(value);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'El numero de pedido no es valido.');
  }
  return orderNumber;
};

const mapOrder = (row) => ({
  number: numeric(row.PEDNumero),
  createdAt: row.PEDFechaCrea,
  deliveryAt: row.pedfechaEntrega,
  deliveryTime: row.PedHHEntrega,
  status: numeric(row.PedEstadoIngreso),
  statusLabel: statusLabel(row.PedEstadoIngreso),
  requesterRut: numeric(row.PedRutSolicita),
  requesterName: clean(row.RequesterName),
  requestedBy: clean(row.PEDSolicita),
  destination: clean(row.Destination),
  motive: clean(row.Motive),
  description: clean(row.PEDDescripcion),
  products: numeric(row.Products),
  quantity: numeric(row.Quantity),
  amount: numeric(row.Amount),
  canDecide: numeric(row.PedEstadoIngreso) === 1,
  canDeliver: numeric(row.PedEstadoIngreso) === 2
});

const bindList = (request, session, casino, filters) => {
  request.input('empCod', sql.Int, session.empCod)
    .input('casinoId', sql.Decimal(10, 0), casino.id)
    .input('offset', sql.Int, filters.offset)
    .input('pageSize', sql.Int, filters.pageSize);
  if (Number.isInteger(filters.status)) request.input('status', sql.SmallInt, filters.status);
  if (filters.search) request.input('search', sql.VarChar(84), `%${filters.search}%`);
  return request;
};

const getRequests = async (query, context) => {
  const session = assertSession(context);
  const filters = normalizeRequestsQuery(query);
  const pool = await getPool();
  const casino = await loadCasinoContext(pool, session);
  const where = [
    'P.GECODEMP=@empCod',
    'P.CASICod=@casinoId',
    'P.PedEstadoIngreso<>0',
    filters.status === 'active' ? 'P.PedEstadoIngreso IN (1,2)' : null,
    Number.isInteger(filters.status) ? 'P.PedEstadoIngreso=@status' : null,
    filters.search ? `(CONVERT(varchar(20),P.PEDNumero) LIKE @search OR CONVERT(varchar(20),P.PedRutSolicita) LIKE @search
      OR RTRIM(ISNULL(PE.PernombreCom,'')) LIKE @search OR RTRIM(ISNULL(DE.DESTINom,'')) LIKE @search)` : null
  ].filter(Boolean).join(' AND ');

  const result = await bindList(pool.request(), session, casino, filters).query(`
    WITH Orders AS (
      SELECT P.PEDNumero,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
             P.PedRutSolicita,P.PEDSolicita,P.PEDDescripcion,
             MAX(RTRIM(ISNULL(PE.PernombreCom,''))) RequesterName,
             MAX(RTRIM(ISNULL(DE.DESTINom,'Destino sin nombre'))) Destination,
             MAX(RTRIM(ISNULL(M.Mot6Descrip,'Sin motivo'))) Motive,
             COUNT(D.PRODCodigo) Products,
             ISNULL(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)),0) Quantity,
             ISNULL(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio),0) Amount
      FROM SSP06OPPedidosPlanta P
      INNER JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
      LEFT JOIN FPPersonas PE ON PE.GECODEMP=P.GECODEMP AND PE.PerRut=P.PedRutSolicita
      LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=P.GECODEMP AND DE.DESTICod=P.DESTICod
      LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
      WHERE ${where}
      GROUP BY P.PEDNumero,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
               P.PedRutSolicita,P.PEDSolicita,P.PEDDescripcion
    )
    SELECT COUNT(*) Total,COUNT(CASE WHEN PedEstadoIngreso=1 THEN 1 END) Pending FROM Orders;
    WITH Orders AS (
      SELECT P.PEDNumero,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
             P.PedRutSolicita,P.PEDSolicita,P.PEDDescripcion,
             MAX(RTRIM(ISNULL(PE.PernombreCom,''))) RequesterName,
             MAX(RTRIM(ISNULL(DE.DESTINom,'Destino sin nombre'))) Destination,
             MAX(RTRIM(ISNULL(M.Mot6Descrip,'Sin motivo'))) Motive,
             COUNT(D.PRODCodigo) Products,
             ISNULL(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)),0) Quantity,
             ISNULL(SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio),0) Amount
      FROM SSP06OPPedidosPlanta P
      INNER JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
      LEFT JOIN FPPersonas PE ON PE.GECODEMP=P.GECODEMP AND PE.PerRut=P.PedRutSolicita
      LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=P.GECODEMP AND DE.DESTICod=P.DESTICod
      LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
      WHERE ${where}
      GROUP BY P.PEDNumero,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
               P.PedRutSolicita,P.PEDSolicita,P.PEDDescripcion
    )
    SELECT * FROM Orders ORDER BY pedfechaEntrega,PEDNumero
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    SELECT GETDATE() ServerNow;
  `);
  const totals = result.recordsets[0]?.[0] || {};
  const total = numeric(totals.Total);
  return {
    casino,
    summary: { total, pending: numeric(totals.Pending) },
    orders: (result.recordsets[1] || []).map(mapOrder),
    serverNow: result.recordsets[2]?.[0]?.ServerNow || null,
    pagination: { page: filters.page, pageSize: filters.pageSize, total, pages: Math.ceil(total / filters.pageSize) },
    statuses: [1, 2, 3, 5].map((id) => ({ id, name: statusLabel(id) }))
  };
};

const loadScopedDetail = async (executor, session, casino, orderNumber) => requestFor(executor)
  .input('empCod', sql.Int, session.empCod)
  .input('casinoId', sql.Decimal(10, 0), casino.id)
  .input('orderNumber', sql.Decimal(10, 0), orderNumber)
  .query(`
    SELECT P.PEDNumero,P.PEDDescripcion,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
           P.PedRutSolicita,RTRIM(P.PEDSolicita) PEDSolicita,RTRIM(ISNULL(PE.PernombreCom,'')) RequesterName,
           RTRIM(ISNULL(C.CASINom,'Casino sin nombre')) Casino,RTRIM(ISNULL(DE.DESTINom,'Destino sin nombre')) Destination,
           RTRIM(ISNULL(M.Mot6Descrip,'Sin motivo')) Motive,RTRIM(ISNULL(X.Decision,'')) Decision,
           RTRIM(ISNULL(X.Comentario,'')) DecisionComment,RTRIM(ISNULL(X.UsuLogin,'')) DecisionBy,X.FechaDecision,
           Y.FechaHoraProgramada,Y.FechaHoraEntrega,Y.DiferenciaMinutos,
           RTRIM(ISNULL(Y.Cumplimiento,'')) Cumplimiento,RTRIM(ISNULL(Y.UsuLogin,'')) DeliveredBy
    FROM SSP06OPPedidosPlanta P
    LEFT JOIN FPPersonas PE ON PE.GECODEMP=P.GECODEMP AND PE.PerRut=P.PedRutSolicita
    LEFT JOIN SSP06MACasinosPlanta C ON C.GECODEMP=P.GECODEMP AND C.CASICod=P.CASICod
    LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=P.GECODEMP AND DE.DESTICod=P.DESTICod
    LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
    LEFT JOIN SSP06OPPedidosPlantaDecision X ON X.GECODEMP=P.GECODEMP AND X.PEDNumero=P.PEDNumero
    LEFT JOIN SSP06OPPedidosPlantaEntrega Y ON Y.GECODEMP=P.GECODEMP AND Y.PEDNumero=P.PEDNumero
    WHERE P.GECODEMP=@empCod AND P.CASICod=@casinoId AND P.PEDNumero=@orderNumber;
    SELECT D.PRODCodigo,RTRIM(ISNULL(PR.ProdNombre,'Producto sin nombre')) ProductName,
           RTRIM(ISNULL(T.TPPRNombre,'Sin tipo')) TypeName,D.PED1Cantidad,D.PED1Precio,
           RTRIM(ISNULL(FD.DivDescripcion,'')) Division,RTRIM(ISNULL(FS.SdiDescripcion,'')) Subdivision,
           RTRIM(ISNULL(FC.CecDescripcion,'')) CostCenter
    FROM SSP06OPPedidosPlantaDet D
    LEFT JOIN SSP06MAProducto PR ON PR.GECODEMP=D.GECODEMP AND PR.PRODCodigo=D.PRODCodigo
    LEFT JOIN SSP06MATPProducto T ON T.GECODEMP=PR.GECODEMP AND T.TPPRCod=PR.TPPRCod
    LEFT JOIN FPDivision FD ON FD.GECODEMP=D.GECODEMP AND FD.DivId=D.DivId
    LEFT JOIN FPDivisionSub FS ON FS.GECODEMP=D.GECODEMP AND FS.DivId=D.DivId AND FS.SdiId=D.SdiId
    LEFT JOIN FPCenCos FC ON FC.GECODEMP=D.GECODEMP AND FC.CecId=D.CecId
    WHERE D.GECODEMP=@empCod AND D.PEDNumero=@orderNumber
    ORDER BY T.TPPROrden,PR.ProdNombre;
  `);

const getRequestDetail = async (numberValue, context) => {
  const session = assertSession(context);
  const orderNumber = parseOrderNumber(numberValue);
  const pool = await getPool();
  const casino = await loadCasinoContext(pool, session);
  const result = await loadScopedDetail(pool, session, casino, orderNumber);
  const header = result.recordsets[0]?.[0];
  if (!header) throw new SecurityError(404, 'ORDER_NOT_FOUND', 'La solicitud no existe para el casino autenticado.');
  const lines = (result.recordsets[1] || []).map((row) => ({
    productId: numeric(row.PRODCodigo), productName: clean(row.ProductName), typeName: clean(row.TypeName),
    quantity: numeric(row.PED1Cantidad), price: numeric(row.PED1Precio), amount: numeric(row.PED1Cantidad) * numeric(row.PED1Precio),
    location: { division: clean(row.Division), subdivision: clean(row.Subdivision), costCenter: clean(row.CostCenter) }
  }));
  return {
    ...mapOrder({ ...header, Products: lines.length, Quantity: lines.reduce((sum, line) => sum + line.quantity, 0), Amount: lines.reduce((sum, line) => sum + line.amount, 0) }),
    casino: clean(header.Casino),
    decision: clean(header.Decision) || null,
    decisionComment: clean(header.DecisionComment) || null,
    decisionBy: clean(header.DecisionBy) || null,
    decisionAt: header.FechaDecision || null,
    delivery: header.FechaHoraEntrega ? {
      scheduledAt: header.FechaHoraProgramada,
      actualAt: header.FechaHoraEntrega,
      ...classifyDeliveryTiming(numeric(header.DiferenciaMinutos)),
      deliveredBy: clean(header.DeliveredBy)
    } : null,
    lines
  };
};

const getPersonHistory = async (rutValue, context) => {
  const session = assertSession(context);
  const rut = Number(rutValue);
  if (!Number.isInteger(rut) || rut < 1) throw new SecurityError(400, 'VALIDATION_ERROR', 'El RUT no es valido.');
  const pool = await getPool();
  const casino = await loadCasinoContext(pool, session);
  const result = await pool.request()
    .input('empCod', sql.Int, session.empCod)
    .input('casinoId', sql.Decimal(10, 0), casino.id)
    .input('rut', sql.Int, rut)
    .query(`
      SELECT TOP (20) P.PEDNumero,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
             P.PedRutSolicita,P.PEDSolicita,P.PEDDescripcion,RTRIM(ISNULL(PE.PernombreCom,'')) RequesterName,
             RTRIM(ISNULL(DE.DESTINom,'Destino sin nombre')) Destination,
             RTRIM(ISNULL(M.Mot6Descrip,'Sin motivo')) Motive,COUNT(D.PRODCodigo) Products,
             SUM(CONVERT(decimal(18,2),D.PED1Cantidad)) Quantity,
             SUM(CONVERT(decimal(18,2),D.PED1Cantidad)*D.PED1Precio) Amount
      FROM SSP06OPPedidosPlanta P
      INNER JOIN SSP06OPPedidosPlantaDet D ON D.GECODEMP=P.GECODEMP AND D.PEDNumero=P.PEDNumero
      LEFT JOIN FPPersonas PE ON PE.GECODEMP=P.GECODEMP AND PE.PerRut=P.PedRutSolicita
      LEFT JOIN SSP06MADestinosPlanta DE ON DE.GECODEMP=P.GECODEMP AND DE.DESTICod=P.DESTICod
      LEFT JOIN SSP06MAMotivoPedidos M ON M.GECODEMP=P.GECODEMP AND M.Mot6Cod=P.Mot6Cod
      WHERE P.GECODEMP=@empCod AND P.CASICod=@casinoId AND P.PedRutSolicita=@rut AND P.PedEstadoIngreso<>0
      GROUP BY P.PEDNumero,P.PEDFechaCrea,P.pedfechaEntrega,P.PedHHEntrega,P.PedEstadoIngreso,
               P.PedRutSolicita,P.PEDSolicita,P.PEDDescripcion,PE.PernombreCom,DE.DESTINom,M.Mot6Descrip
      ORDER BY P.PEDFechaCrea DESC,P.PEDNumero DESC;
    `);
  const orders = result.recordset.map(mapOrder);
  return { requesterRut: rut, requesterName: orders[0]?.requesterName || '', casino, orders };
};

const decide = async ({ numberValue, context, decision, approval, rejection }) => {
  const session = assertSession(context);
  const orderNumber = parseOrderNumber(numberValue);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const casino = await loadCasinoContext(transaction, session);
    const locked = await new sql.Request(transaction)
      .input('empCod', sql.Int, session.empCod)
      .input('casinoId', sql.Decimal(10, 0), casino.id)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber)
      .query(`SELECT PEDNumero,PedEstadoIngreso FROM SSP06OPPedidosPlanta WITH (UPDLOCK,HOLDLOCK)
              WHERE GECODEMP=@empCod AND CASICod=@casinoId AND PEDNumero=@orderNumber;`);
    const order = locked.recordset[0];
    if (!order) throw new SecurityError(404, 'ORDER_NOT_FOUND', 'La solicitud no existe para el casino autenticado.');
    if (numeric(order.PedEstadoIngreso) !== 1) {
      throw new SecurityError(409, 'ORDER_ALREADY_DECIDED', 'Solo se puede aprobar o rechazar una solicitud enviada al Casino.');
    }

    const request = new sql.Request(transaction)
      .input('empCod', sql.Int, session.empCod)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber)
      .input('login', sql.VarChar(10), session.login)
      .input('decision', sql.VarChar(10), decision)
      .input('comment', sql.VarChar(500), rejection?.comment || null);
    if (approval) {
      request.input('deliveryDate', sql.VarChar(10), approval.deliveryDate).input('deliveryMinutes', sql.Int, approval.deliveryMinutes);
      await request.query(`
        DECLARE @delivery datetime=CONVERT(datetime,@deliveryDate,120);
        UPDATE SSP06OPPedidosPlanta
        SET PedEstadoIngreso=2,pedfechaEntrega=@delivery,PedAAEntrega=YEAR(@delivery),PedMMEntrega=MONTH(@delivery),
            PedHHEntrega=DATEADD(minute,@deliveryMinutes,@delivery)
        WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
        UPDATE SSP06OPPedidosPlantaDet SET PED1FechaEnt=@delivery
        WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
        INSERT INTO SSP06OPPedidosPlantaDecision
          (GECODEMP,PEDNumero,Decision,Comentario,FechaEntregaConfirmada,HoraEntregaConfirmada,UsuLogin,FechaDecision)
        VALUES
          (@empCod,@orderNumber,@decision,NULL,@delivery,DATEADD(minute,@deliveryMinutes,@delivery),@login,SYSUTCDATETIME());
      `);
    } else {
      await request.query(`
        UPDATE SSP06OPPedidosPlanta SET PedEstadoIngreso=5
        WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
        INSERT INTO SSP06OPPedidosPlantaDecision
          (GECODEMP,PEDNumero,Decision,Comentario,FechaEntregaConfirmada,HoraEntregaConfirmada,UsuLogin,FechaDecision)
        VALUES
          (@empCod,@orderNumber,@decision,@comment,NULL,NULL,@login,SYSUTCDATETIME());
      `);
    }
    await transaction.commit();
    return { number: orderNumber, status: approval ? 2 : 5, statusLabel: statusLabel(approval ? 2 : 5), decision };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const approveRequest = (numberValue, body, context) => decide({
  numberValue, context, decision: 'APROBADO', approval: normalizeApproval(body)
});

const rejectRequest = (numberValue, body, context) => decide({
  numberValue, context, decision: 'RECHAZADO', rejection: normalizeRejection(body)
});

const deliverRequest = async (numberValue, context) => {
  const session = assertSession(context);
  const orderNumber = parseOrderNumber(numberValue);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const casino = await loadCasinoContext(transaction, session);
    const result = await new sql.Request(transaction)
      .input('empCod', sql.Int, session.empCod)
      .input('casinoId', sql.Decimal(10, 0), casino.id)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber)
      .input('login', sql.VarChar(10), session.login)
      .query(`
        DECLARE @scheduled datetime,@actual datetime=GETDATE(),@difference int,@timing varchar(12);
        SELECT @scheduled=PedHHEntrega
        FROM SSP06OPPedidosPlanta WITH (UPDLOCK,HOLDLOCK)
        WHERE GECODEMP=@empCod AND CASICod=@casinoId AND PEDNumero=@orderNumber AND PedEstadoIngreso=2;
        IF @scheduled IS NULL
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM SSP06OPPedidosPlanta
            WHERE GECODEMP=@empCod AND CASICod=@casinoId AND PEDNumero=@orderNumber
          ) THROW 51001, 'ORDER_NOT_FOUND', 1;
          THROW 51002, 'ORDER_NOT_IN_PREPARATION', 1;
        END;
        SET @difference=DATEDIFF(minute,@scheduled,@actual);
        SET @timing=CASE WHEN @difference<0 THEN 'ANTICIPADO' WHEN @difference>0 THEN 'ATRASADO' ELSE 'ATIEMPO' END;
        UPDATE SSP06OPPedidosPlanta SET PedEstadoIngreso=3
        WHERE GECODEMP=@empCod AND CASICod=@casinoId AND PEDNumero=@orderNumber;
        INSERT INTO SSP06OPPedidosPlantaEntrega
          (GECODEMP,PEDNumero,FechaHoraProgramada,FechaHoraEntrega,DiferenciaMinutos,Cumplimiento,UsuLogin,FechaRegistro)
        VALUES
          (@empCod,@orderNumber,@scheduled,@actual,@difference,@timing,@login,SYSUTCDATETIME());
        SELECT @scheduled ScheduledAt,@actual ActualAt,@difference DifferenceMinutes,@timing Timing;
      `);
    const row = result.recordset[0];
    await transaction.commit();
    return {
      number: orderNumber,
      status: 3,
      statusLabel: statusLabel(3),
      scheduledAt: row.ScheduledAt,
      actualAt: row.ActualAt,
      ...classifyDeliveryTiming(numeric(row.DifferenceMinutes))
    };
  } catch (error) {
    await transaction.rollback();
    if (error.number === 51001 || error.message === 'ORDER_NOT_FOUND') {
      throw new SecurityError(404, 'ORDER_NOT_FOUND', 'La solicitud no existe para el casino autenticado.');
    }
    if (error.number === 51002 || error.message === 'ORDER_NOT_IN_PREPARATION') {
      throw new SecurityError(409, 'ORDER_NOT_IN_PREPARATION', 'Solo se puede entregar un pedido en preparación.');
    }
    throw error;
  }
};

module.exports = {
  getRequests,
  getRequestDetail,
  getPersonHistory,
  approveRequest,
  rejectRequest,
  deliverRequest
};
