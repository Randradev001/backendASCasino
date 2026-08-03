const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const {
  normalizeOrderPayload,
  resolveRequesterRut,
  getMissingRequesterLocationFields,
  buildRequesterLocationError
} = require('./casinoPedidos.rules');

const clean = (value) => String(value || '').trim();
const number = (value) => Number(value || 0);

const assertContext = (context) => {
  const empCod = Number(context?.empCod);
  const login = clean(context?.login).toUpperCase();
  if (!Number.isInteger(empCod) || empCod < 1 || !login) {
    throw new SecurityError(401, 'UNAUTHENTICATED', 'La empresa y el usuario deben provenir de la sesion.');
  }
  return { empCod, login };
};

const requestFor = (executor) => (executor instanceof sql.Transaction ? new sql.Request(executor) : executor.request());

const loadAuthenticatedUser = async (executor, { empCod, login }) => {
  const result = await requestFor(executor)
    .input('empCod', sql.Int, empCod)
    .input('login', sql.VarChar(10), login)
    .query(`
      SELECT TOP (1) U.UsuRut, RTRIM(ISNULL(U.UsuDV,'')) UsuDV, RTRIM(ISNULL(U.Usunom,'')) Usunom
      FROM USUARIOS U
      INNER JOIN SEGUSUEMP UE ON UE.GECODEMP=@empCod AND RTRIM(UE.UsuLogin)=RTRIM(U.UsuLogin)
      WHERE RTRIM(U.UsuLogin)=@login;
    `);
  const row = result.recordset[0];
  if (!row || !Number(row.UsuRut)) {
    throw new SecurityError(409, 'REQUESTER_NOT_LINKED', 'El usuario no tiene un RUT asociado para crear pedidos.');
  }
  return { rut: Number(row.UsuRut), dv: clean(row.UsuDV), name: clean(row.Usunom) };
};

const loadPerson = async (executor, empCod, rut) => {
  const result = await requestFor(executor)
    .input('empCod', sql.Int, empCod)
    .input('rut', sql.Int, rut)
    .query(`
      SELECT P.PerRut, RTRIM(P.PerDV) PerDV, RTRIM(P.PernombreCom) PernombreCom,
             RTRIM(P.DivId) DivId, RTRIM(P.SdiId) SdiId, RTRIM(P.CecId) CecId,
             P.PerEstadoLab, RTRIM(ISNULL(D.DivDescripcion,'')) DivDescripcion,
             RTRIM(ISNULL(S.SdiDescripcion,'')) SdiDescripcion,
             RTRIM(ISNULL(C.CecDescripcion,'')) CecDescripcion
      FROM FPPersonas P
      LEFT JOIN FPDivision D ON D.GECODEMP=P.GECODEMP AND D.DivId=P.DivId
      LEFT JOIN FPDivisionSub S ON S.GECODEMP=P.GECODEMP AND S.DivId=P.DivId AND S.SdiId=P.SdiId
      LEFT JOIN FPCenCos C ON C.GECODEMP=P.GECODEMP AND C.CecId=P.CecId
      WHERE P.GECODEMP=@empCod AND P.PerRut=@rut;
    `);
  const row = result.recordset[0];
  if (!row) throw new SecurityError(404, 'REQUESTER_NOT_FOUND', 'El solicitante no existe en la empresa autenticada.');
  const location = {
    divisionId: clean(row.DivId),
    division: clean(row.DivDescripcion),
    subdivisionId: clean(row.SdiId),
    subdivision: clean(row.SdiDescripcion),
    costCenterId: clean(row.CecId),
    costCenter: clean(row.CecDescripcion)
  };
  const missingLocationFields = getMissingRequesterLocationFields(location);

  return {
    rut: Number(row.PerRut),
    dv: clean(row.PerDV),
    fullRut: `${Number(row.PerRut)}-${clean(row.PerDV)}`,
    name: clean(row.PernombreCom),
    active: Number(row.PerEstadoLab) === 1,
    location,
    locationComplete: missingLocationFields.length === 0,
    missingLocationFields
  };
};

const getContext = async (context, canManageOthers = false) => {
  const session = assertContext(context);
  const pool = await getPool();
  const authenticated = await loadAuthenticatedUser(pool, session);
  const [requester, catalogs] = await Promise.all([
    loadPerson(pool, session.empCod, authenticated.rut),
    pool.request().input('empCod', sql.Int, session.empCod).query(`
      SELECT CASICod, RTRIM(CASINom) CASINom FROM SSP06MACasinosPlanta
      WHERE GECODEMP=@empCod ORDER BY CASINom;

      SELECT DESTICod, RTRIM(DESTINom) DESTINom FROM SSP06MADestinosPlanta
      WHERE GECODEMP=@empCod ORDER BY DESTINom;

      SELECT Mot6Cod, RTRIM(Mot6Descrip) Mot6Descrip FROM SSP06MAMotivoPedidos
      WHERE GECODEMP=@empCod ORDER BY Mot6Descrip;

      SELECT TPPRCod, RTRIM(TPPRNombre) TPPRNombre, TPPROrden FROM SSP06MATPProducto
      WHERE GECODEMP=@empCod ORDER BY TPPROrden, TPPRNombre;

      SELECT P.PRODCodigo, P.TPPRCod, RTRIM(P.ProdNombre) ProdNombre, P.PRODPrecio, P.CASICod
      FROM SSP06MAProducto P
      INNER JOIN SSP06MATPProducto T ON T.GECODEMP=P.GECODEMP AND T.TPPRCod=P.TPPRCod
      WHERE P.GECODEMP=@empCod ORDER BY T.TPPROrden, P.ProdNombre;
    `)
  ]);

  return {
    company: session.empCod,
    login: session.login,
    canManageOthers: Boolean(canManageOthers),
    requester,
    catalogs: {
      casinos: (catalogs.recordsets[0] || []).map((row) => ({ id: number(row.CASICod), name: clean(row.CASINom) })),
      destinations: (catalogs.recordsets[1] || []).map((row) => ({ id: number(row.DESTICod), name: clean(row.DESTINom) })),
      motives: (catalogs.recordsets[2] || []).map((row) => ({ id: number(row.Mot6Cod), name: clean(row.Mot6Descrip) })),
      categories: (catalogs.recordsets[3] || []).map((row) => ({
        id: number(row.TPPRCod), name: clean(row.TPPRNombre), order: number(row.TPPROrden)
      })),
      products: (catalogs.recordsets[4] || []).map((row) => ({
        id: number(row.PRODCodigo), categoryId: number(row.TPPRCod), name: clean(row.ProdNombre),
        price: number(row.PRODPrecio), casinoId: number(row.CASICod)
      }))
    },
    compatibility: { categoryAccessPending: true, emailNotificationAvailable: false }
  };
};

const nextOrderNumber = async (transaction, empCod) => {
  const result = await new sql.Request(transaction)
    .input('empCod', sql.Int, empCod)
    .input('correlativeId', sql.Char(10), 'PEDCASINOS')
    .query(`
      DECLARE @next decimal(10,0);
      SELECT @next=CRRNum+1 FROM MACorrelativos WITH (UPDLOCK,HOLDLOCK)
      WHERE GECODEMP=@empCod AND RTRIM(CRRID)=RTRIM(@correlativeId);
      IF @next IS NULL
      BEGIN
        SET @next=1;
        INSERT INTO MACorrelativos (GECODEMP,CRRID,CRRNum) VALUES (@empCod,@correlativeId,@next);
      END
      ELSE
        UPDATE MACorrelativos SET CRRNum=@next
        WHERE GECODEMP=@empCod AND RTRIM(CRRID)=RTRIM(@correlativeId);
      SELECT @next value;
    `);
  return Number(result.recordset[0].value);
};

const validateCatalogs = async (transaction, session, input) => {
  const catalogResult = await new sql.Request(transaction)
    .input('empCod', sql.Int, session.empCod)
    .input('casinoId', sql.Decimal(10, 0), input.casinoId)
    .input('destinationId', sql.Decimal(10, 0), input.destinationId)
    .input('motiveId', sql.SmallInt, input.motiveId)
    .query(`
      SELECT CASICod FROM SSP06MACasinosPlanta WHERE GECODEMP=@empCod AND CASICod=@casinoId;
      SELECT DESTICod FROM SSP06MADestinosPlanta WHERE GECODEMP=@empCod AND DESTICod=@destinationId;
      SELECT Mot6Cod FROM SSP06MAMotivoPedidos WHERE GECODEMP=@empCod AND Mot6Cod=@motiveId;
    `);
  if (!catalogResult.recordsets[0]?.length) throw new SecurityError(400, 'INVALID_CASINO', 'El casino seleccionado no existe.');
  if (!catalogResult.recordsets[1]?.length) throw new SecurityError(400, 'INVALID_DESTINATION', 'El destino seleccionado no existe.');
  if (!catalogResult.recordsets[2]?.length) throw new SecurityError(400, 'INVALID_MOTIVE', 'El motivo seleccionado no existe.');

  const productsRequest = new sql.Request(transaction).input('empCod', sql.Int, session.empCod);
  const placeholders = input.lines.map((line, index) => {
    productsRequest.input(`product${index}`, sql.Decimal(10, 0), line.productCode);
    return `@product${index}`;
  });
  const productsResult = await productsRequest.query(`
    SELECT PRODCodigo, RTRIM(ProdNombre) ProdNombre, PRODPrecio, CASICod
    FROM SSP06MAProducto WHERE GECODEMP=@empCod AND PRODCodigo IN (${placeholders.join(',')});
  `);
  const products = new Map(productsResult.recordset.map((row) => [number(row.PRODCodigo), row]));
  for (const line of input.lines) {
    const product = products.get(line.productCode);
    if (!product) throw new SecurityError(400, 'INVALID_PRODUCT', `El producto ${line.productCode} no existe.`);
    if (number(product.CASICod) !== input.casinoId) {
      throw new SecurityError(400, 'PRODUCT_CASINO_MISMATCH', `${clean(product.ProdNombre)} no pertenece al casino seleccionado.`);
    }
  }
  return products;
};

const createDraft = async (body, context, canManageOthers = false) => {
  const session = assertContext(context);
  const input = normalizeOrderPayload(body);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const authenticated = await loadAuthenticatedUser(transaction, session);
    const requesterRut = resolveRequesterRut({
      authenticatedRut: authenticated.rut,
      requestedRut: input.requesterRut,
      canManageOthers
    });
    const requester = await loadPerson(transaction, session.empCod, requesterRut);
    if (!requester.locationComplete) {
      const locationError = buildRequesterLocationError(requester);
      throw new SecurityError(409, 'REQUESTER_LOCATION_REQUIRED', locationError.message, {
        requesterRut: requester.rut,
        missingFields: locationError.missingFields
      });
    }
    const products = await validateCatalogs(transaction, session, input);
    const orderNumber = await nextOrderNumber(transaction, session.empCod);

    await new sql.Request(transaction)
      .input('empCod', sql.Int, session.empCod)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber)
      .input('description', sql.Char(400), input.description)
      .input('destinationId', sql.Decimal(10, 0), input.destinationId)
      .input('casinoId', sql.Decimal(10, 0), input.casinoId)
      .input('login', sql.Char(10), session.login)
      .input('motiveId', sql.SmallInt, input.motiveId)
      .input('deliveryDate', sql.VarChar(10), input.deliveryDate)
      .input('deliveryMinutes', sql.Int, input.deliveryMinutes)
      .input('requesterRut', sql.Int, requester.rut)
      .query(`
        DECLARE @delivery datetime=CONVERT(datetime,@deliveryDate,120);
        INSERT INTO SSP06OPPedidosPlanta
          (GECODEMP,PEDNumero,PEDDescripcion,PEDFechaCrea,DESTICod,CASICod,PEDSolicita,
           PedEstadoIngreso,PedMM,PedAA,pedfechaEntrega,PedAAEntrega,PedMMEntrega,Mot6Cod,
           PedHHEntrega,PedRutSolicita,PEDSwCorreo,PEDControlPago)
        VALUES
          (@empCod,@orderNumber,@description,GETDATE(),@destinationId,@casinoId,@login,
           0,MONTH(GETDATE()),YEAR(GETDATE()),@delivery,YEAR(@delivery),MONTH(@delivery),@motiveId,
           DATEADD(minute,@deliveryMinutes,@delivery),@requesterRut,0,0);
      `);

    let amount = 0;
    for (const line of input.lines) {
      const product = products.get(line.productCode);
      const price = number(product.PRODPrecio);
      amount += price * line.quantity;
      await new sql.Request(transaction)
        .input('empCod', sql.Int, session.empCod)
        .input('orderNumber', sql.Decimal(10, 0), orderNumber)
        .input('productCode', sql.Decimal(10, 0), line.productCode)
        .input('price', sql.Decimal(10, 0), price)
        .input('quantity', sql.SmallInt, line.quantity)
        .input('deliveryDate', sql.VarChar(10), input.deliveryDate)
        .input('divisionId', sql.Char(10), requester.location.divisionId)
        .input('subdivisionId', sql.Char(10), requester.location.subdivisionId)
        .input('costCenterId', sql.Char(10), requester.location.costCenterId)
        .query(`
          INSERT INTO SSP06OPPedidosPlantaDet
            (GECODEMP,PEDNumero,PRODCodigo,PED1Precio,PED1Cantidad,PED1FechaEnt,DivId,SdiId,CecId)
          VALUES
            (@empCod,@orderNumber,@productCode,@price,@quantity,CONVERT(datetime,@deliveryDate,120),
             @divisionId,@subdivisionId,@costCenterId);
        `);
    }

    await transaction.commit();
    return {
      number: orderNumber,
      status: 0,
      statusLabel: 'Borrador',
      requester,
      lines: input.lines.length,
      quantity: input.lines.reduce((total, line) => total + line.quantity, 0),
      amount
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const sendOrder = async (numberValue, context, canManageOthers = false) => {
  const session = assertContext(context);
  const orderNumber = Number(numberValue);
  if (!Number.isInteger(orderNumber) || orderNumber < 1) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'El numero de pedido no es valido.');
  }
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  try {
    const authenticated = await loadAuthenticatedUser(transaction, session);
    const result = await new sql.Request(transaction)
      .input('empCod', sql.Int, session.empCod)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber)
      .query(`
        SELECT PEDNumero,PedEstadoIngreso,RTRIM(PEDSolicita) PEDSolicita,PedRutSolicita
        FROM SSP06OPPedidosPlanta WITH (UPDLOCK,HOLDLOCK)
        WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
        SELECT COUNT(*) lineCount FROM SSP06OPPedidosPlantaDet
        WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;
      `);
    const order = result.recordsets[0]?.[0];
    if (!order) throw new SecurityError(404, 'ORDER_NOT_FOUND', 'El pedido no existe.');
    if (!canManageOthers && number(order.PedRutSolicita) !== authenticated.rut) {
      throw new SecurityError(403, 'ORDER_FORBIDDEN', 'No puede enviar el pedido de otra persona.');
    }
    if (Number(order.PedEstadoIngreso) !== 0) {
      throw new SecurityError(409, 'ORDER_NOT_DRAFT', 'Solo se puede enviar un pedido en borrador.');
    }
    if (!Number(result.recordsets[1]?.[0]?.lineCount)) {
      throw new SecurityError(409, 'ORDER_WITHOUT_LINES', 'El pedido no tiene productos.');
    }
    await new sql.Request(transaction)
      .input('empCod', sql.Int, session.empCod)
      .input('orderNumber', sql.Decimal(10, 0), orderNumber)
      .query(`UPDATE SSP06OPPedidosPlanta SET PedEstadoIngreso=1
              WHERE GECODEMP=@empCod AND PEDNumero=@orderNumber;`);
    await transaction.commit();
    return { number: orderNumber, status: 1, statusLabel: 'Enviado al casino', emailNotificationSent: false };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = { getContext, createDraft, sendOrder };
