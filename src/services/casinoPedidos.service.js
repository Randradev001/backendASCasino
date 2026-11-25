const { getPool, sql } = require('../conectorMysql/conectorSqlServer');
const { SecurityError } = require('./seguridad.service');
const { enqueueOrderEvent } = require('./casinoCorreoOutbox.service');
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

const loadRequester = async (executor, empCod, rut) => {
  const result = await requestFor(executor)
    .input('empCod', sql.Int, empCod)
    .input('rut', sql.Int, rut)
    .query(`
      SELECT S.SOLRut PerRut, RTRIM(U.UsuDV) PerDV,
             RTRIM(CONCAT(S.SOLNombres,' ',S.SOLApellidoPaterno,' ',S.SOLApellidoMaterno)) PernombreCom,
             RTRIM(S.DivId) DivId, RTRIM(S.SdiId) SdiId, RTRIM(S.CecId) CecId,
             S.SOLActivo PerEstadoLab, RTRIM(ISNULL(D.DivDescripcion,'')) DivDescripcion,
             RTRIM(ISNULL(SD.SdiDescripcion,'')) SdiDescripcion,
             RTRIM(ISNULL(C.CecDescripcion,'')) CecDescripcion
      FROM SSP06MASolicitante S
      INNER JOIN USUARIOS U ON RTRIM(U.UsuLogin)=RTRIM(S.SOLLogin)
      LEFT JOIN FPDivision D ON D.GECODEMP=S.GECODEMP AND D.DivId=S.DivId
      LEFT JOIN FPDivisionSub SD ON SD.GECODEMP=S.GECODEMP AND SD.DivId=S.DivId AND SD.SdiId=S.SdiId
      LEFT JOIN FPCenCos C ON C.GECODEMP=S.GECODEMP AND C.CecId=S.CecId
      WHERE S.GECODEMP=@empCod AND S.SOLRut=@rut AND S.SOLActivo=1;
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

const getContext = async (context, canManageOthers = false, canAccessRestrictedProducts = false) => {
  const session = assertContext(context);
  const pool = await getPool();
  const authenticated = await loadAuthenticatedUser(pool, session);
  const [requester, catalogs] = await Promise.all([
    loadRequester(pool, session.empCod, authenticated.rut).catch((error) => {
      if (canManageOthers && error instanceof SecurityError && error.code === 'REQUESTER_NOT_FOUND') return null;
      throw error;
    }),
    pool.request().input('empCod', sql.Int, session.empCod)
      .input('canAccessRestricted', sql.Bit, canAccessRestrictedProducts ? 1 : 0).query(`
      SELECT CASICod, RTRIM(CASINom) CASINom FROM SSP06MACasinosPlanta
      WHERE GECODEMP=@empCod AND CASIActivo=1 ORDER BY CASINom;

      SELECT DESTICod, RTRIM(DESTINom) DESTINom FROM SSP06MADestinosPlanta
      WHERE GECODEMP=@empCod AND DESTIActivo=1 ORDER BY DESTINom;

      SELECT Mot6Cod, RTRIM(Mot6Descrip) Mot6Descrip FROM SSP06MAMotivoPedidos
      WHERE GECODEMP=@empCod AND Mot6Activo=1 ORDER BY Mot6Descrip;

      SELECT TPPRCod, RTRIM(TPPRNombre) TPPRNombre, TPPROrden,COALESCE(TPPRAcceso,0) TPPRAcceso
      FROM SSP06MATPProducto
      WHERE GECODEMP=@empCod AND TPPRActivo=1 AND (COALESCE(TPPRAcceso,0)=0 OR @canAccessRestricted=1)
      ORDER BY TPPROrden, TPPRNombre;

      SELECT P.PRODCodigo, P.TPPRCod, RTRIM(P.ProdNombre) ProdNombre, P.PRODPrecio, P.CASICod,
             CONVERT(bit,CASE WHEN P.PRODImagen IS NULL THEN 0 ELSE 1 END) TieneImagen
      FROM SSP06MAProducto P
      INNER JOIN SSP06MATPProducto T ON T.GECODEMP=P.GECODEMP AND T.TPPRCod=P.TPPRCod
      WHERE P.GECODEMP=@empCod AND P.PRODActivo=1 AND T.TPPRActivo=1 AND (COALESCE(T.TPPRAcceso,0)=0 OR @canAccessRestricted=1)
      ORDER BY T.TPPROrden, P.ProdNombre;
    `)
  ]);

  return {
    company: session.empCod,
    login: session.login,
    canManageOthers: Boolean(canManageOthers),
    canAccessRestrictedProducts: Boolean(canAccessRestrictedProducts),
    requiresRequesterSelection: !requester,
    requester,
    catalogs: {
      casinos: (catalogs.recordsets[0] || []).map((row) => ({ id: number(row.CASICod), name: clean(row.CASINom) })),
      destinations: (catalogs.recordsets[1] || []).map((row) => ({ id: number(row.DESTICod), name: clean(row.DESTINom) })),
      motives: (catalogs.recordsets[2] || []).map((row) => ({ id: number(row.Mot6Cod), name: clean(row.Mot6Descrip) })),
      categories: (catalogs.recordsets[3] || []).map((row) => ({
        id: number(row.TPPRCod), name: clean(row.TPPRNombre), order: number(row.TPPROrden), access: number(row.TPPRAcceso)
      })),
      products: (catalogs.recordsets[4] || []).map((row) => ({
        id: number(row.PRODCodigo), categoryId: number(row.TPPRCod), name: clean(row.ProdNombre),
        price: number(row.PRODPrecio), casinoId: number(row.CASICod), hasImage: Boolean(row.TieneImagen)
      }))
    },
    compatibility: { categoryAccessPending: false, emailNotificationAvailable: false }
  };
};

const getProductImage = async (idValue, context) => {
  const session = assertContext(context);
  const productId = Number(idValue);
  if (!Number.isInteger(productId) || productId < 1) {
    throw new SecurityError(400, 'INVALID_PRODUCT_ID', 'El código del producto no es válido.');
  }
  const result = await (await getPool()).request()
    .input('empCod', sql.Int, session.empCod)
    .input('productId', sql.Decimal(10, 0), productId)
    .query(`
      SELECT PRODImagen image,PRODImagenMime mimeType
      FROM SSP06MAProducto
      WHERE GECODEMP=@empCod AND PRODCodigo=@productId AND PRODActivo=1;
    `);
  const row = result.recordset[0];
  if (!row) throw new SecurityError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe en la empresa autenticada.');
  if (!row.image) throw new SecurityError(404, 'PRODUCT_IMAGE_NOT_FOUND', 'El producto no tiene una imagen cargada.');
  return row;
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

const validateCatalogs = async (transaction, session, input, canAccessRestrictedProducts = false) => {
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

  const productsRequest = new sql.Request(transaction)
    .input('empCod', sql.Int, session.empCod);
  const placeholders = input.lines.map((line, index) => {
    productsRequest.input(`product${index}`, sql.Decimal(10, 0), line.productCode);
    return `@product${index}`;
  });
  const productsResult = await productsRequest.query(`
    SELECT P.PRODCodigo, RTRIM(P.ProdNombre) ProdNombre, P.PRODPrecio, P.CASICod,
      COALESCE(T.TPPRAcceso,0) TPPRAcceso
    FROM SSP06MAProducto P
    INNER JOIN SSP06MATPProducto T ON T.GECODEMP=P.GECODEMP AND T.TPPRCod=P.TPPRCod
    WHERE P.GECODEMP=@empCod AND P.PRODCodigo IN (${placeholders.join(',')});
  `);
  const products = new Map(productsResult.recordset.map((row) => [number(row.PRODCodigo), row]));
  for (const line of input.lines) {
    const product = products.get(line.productCode);
    if (!product) throw new SecurityError(400, 'INVALID_PRODUCT', `El producto ${line.productCode} no existe.`);
    if (number(product.TPPRAcceso) === 1 && !canAccessRestrictedProducts) {
      throw new SecurityError(
        403,
        'RESTRICTED_PRODUCT_ACCESS_REQUIRED',
        `${clean(product.ProdNombre)} pertenece a un tipo restringido. Se requiere el permiso 55/1/91.`
      );
    }
    if (number(product.CASICod) !== input.casinoId) {
      throw new SecurityError(400, 'PRODUCT_CASINO_MISMATCH', `${clean(product.ProdNombre)} no pertenece al casino seleccionado.`);
    }
  }
  return products;
};

const createDraft = async (body, context, canManageOthers = false, canAccessRestrictedProducts = false) => {
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
    const requester = await loadRequester(transaction, session.empCod, requesterRut);
    if (!requester.locationComplete) {
      const locationError = buildRequesterLocationError(requester);
      throw new SecurityError(409, 'REQUESTER_LOCATION_REQUIRED', locationError.message, {
        requesterRut: requester.rut,
        missingFields: locationError.missingFields
      });
    }
    const products = await validateCatalogs(transaction, session, input, canAccessRestrictedProducts);
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
    await enqueueOrderEvent(transaction, { empCod: session.empCod, orderNumber, eventType: 'ORDER_SENT', login: session.login });
    await transaction.commit();
    return { number: orderNumber, status: 1, statusLabel: 'Enviado al casino', emailNotificationQueued: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = { getContext, getProductImage, createDraft, sendOrder };
