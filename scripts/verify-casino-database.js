const sql = require('mssql');

require('dotenv').config();

const database = process.argv[2] || process.env.SQLSERVER_DATABASE;

const config = {
  server: process.env.SQLSERVER_HOST,
  port: Number(process.env.SQLSERVER_PORT || 1433),
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  database,
  options: {
    instanceName: process.env.SQLSERVER_INSTANCE,
    encrypt: process.env.SQLSERVER_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQLSERVER_TRUST_CERT === 'true'
  },
  requestTimeout: 120000
};

const expectedRows = {
  SSP06MACasinosPlanta: 2,
  SSP06MADestinosPlanta: 4,
  SSP06MAMotivoPedidos: 6,
  SSP06MATPProducto: 7,
  SSP06MAProducto: 75,
  SSP06OPPedidosPlanta: 15,
  SSP06OPPedidosPlantaDet: 32,
  SSP06OPEvalPedidoCasino: 14
};

const expectedPersonRows = {
  FPPersonas: 9186,
  FPGrupos: 4,
  FPArea: 12,
  FPDivision: 5,
  FPDivisionSub: 27,
  FPOrganiza: 203,
  FPCenCos: 110,
  FPFuncion: 98,
  FPSindicato: 11,
  CHTurnos: 6
};

const fail = (message) => {
  throw new Error(message);
};

const run = async () => {
  const pool = await sql.connect(config);

  try {
    const metadata = await pool.request().query(`
      SELECT DB_NAME() AS databaseName,
             (SELECT type FROM sys.objects WHERE object_id=OBJECT_ID(N'dbo.DEFEMP')) AS defempType,
             (SELECT COUNT(*) FROM dbo.G_Emp) AS companies,
             (SELECT COUNT(*) FROM dbo.DEFEMP) AS mappedCompanies,
             (SELECT COUNT(*) FROM dbo.FPPersonas) AS people,
             (SELECT COUNT(*) FROM dbo.FPPersonas WHERE PerFoto IS NOT NULL AND DATALENGTH(PerFoto)>0) AS peopleWithPhoto,
             (SELECT COUNT(*) FROM dbo.USUARIOS) AS securityUsers,
             (SELECT COUNT(*) FROM dbo.SISTEMAS WHERE SistCod=55) AS casinoSystems,
             (SELECT COUNT(*) FROM dbo.SISTEMAS WHERE SistCod=10) AS peopleSystems,
             (SELECT COUNT(*) FROM dbo.PROGRAM WHERE SistCod=10 AND Modcod=1 AND ProgCod IN (1,2)) AS peoplePrograms,
             (SELECT COUNT(*) FROM sys.tables WHERE name IN ('FPhuellas','FPMovPerson','LogPersonas','ListAnexo')) AS excludedPeopleTables,
             (SELECT COUNT(*) FROM dbo.PROGRAM WHERE SistCod=55 AND Modcod=1 AND ProgCod=91) AS permission91;
    `);

    const summary = metadata.recordset[0];
    if (String(summary.defempType || '').trim() !== 'V') fail('DEFEMP debe ser una vista de homologacion.');
    if (Number(summary.companies) !== Number(summary.mappedCompanies)) fail('DEFEMP no homologa todas las empresas de G_Emp.');
    if (Number(summary.casinoSystems) !== 1) fail('El sistema 55 de Casino no esta cargado.');
    if (Number(summary.peopleSystems) !== 1) fail('El sistema 10 de Personas no esta cargado.');
    if (Number(summary.peoplePrograms) !== 2) fail('Faltan los programas 10/1/1 y 10/1/2 de la ficha de Personas.');
    if (Number(summary.excludedPeopleTables) !== 0) fail('La base contiene biometria, movimientos o anexos fuera del alcance de la ficha.');
    if (Number(summary.permission91) !== 1) fail('Falta el permiso 55/1/91 para acceso a todos los productos.');

    const counts = await pool.request().query(`
      SELECT t.name AS tableName, SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END) AS [rowCount]
      FROM sys.tables t
      LEFT JOIN sys.partitions p ON p.object_id=t.object_id
      WHERE t.name IN (${Object.keys(expectedRows).map((name) => `'${name}'`).join(',')})
      GROUP BY t.name;
    `);

    const actual = new Map(counts.recordset.map((row) => [row.tableName, Number(row.rowCount)]));
    for (const [table, expected] of Object.entries(expectedRows)) {
      if (actual.get(table) !== expected) fail(`${table}: se esperaban ${expected} filas y se encontraron ${actual.get(table) ?? 0}.`);
    }

    const personCounts = await pool.request().query(`
      SELECT t.name AS tableName, SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END) AS [rowCount]
      FROM sys.tables t
      LEFT JOIN sys.partitions p ON p.object_id=t.object_id
      WHERE t.name IN (${Object.keys(expectedPersonRows).map((name) => `'${name}'`).join(',')})
      GROUP BY t.name;
    `);
    const actualPersonRows = new Map(personCounts.recordset.map((row) => [row.tableName, Number(row.rowCount)]));
    for (const [table, expected] of Object.entries(expectedPersonRows)) {
      if (actualPersonRows.get(table) !== expected) fail(`${table}: se esperaban ${expected} filas y se encontraron ${actualPersonRows.get(table) ?? 0}.`);
    }
    if (Number(summary.peopleWithPhoto) !== 7200) fail(`FPPersonas: se esperaban 7200 fichas con foto y se encontraron ${summary.peopleWithPhoto}.`);

    const forbidden = await pool.request().query(`
      SELECT name
      FROM sys.tables
      WHERE name IN (
        'TEMP01', 'ESPECIES', 'ESPECIES1', 'CALIBRES', 'PRODUCTORES', 'PRODUCTORES1',
        'CLIENTES', 'AGENTES', 'CONSIG', 'EXPORT1', 'ExpProd', 'covEnvases', 'EnvCat1'
      )
      ORDER BY name;
    `);
    if (forbidden.recordset.length) fail(`La base contiene maestros CONEX: ${forbidden.recordset.map((row) => row.name).join(', ')}.`);

    const integrity = await pool.request().query(`
      SELECT 'Detalle sin pedido' AS checkName, COUNT(*) AS issues
      FROM dbo.SSP06OPPedidosPlantaDet D
      LEFT JOIN dbo.SSP06OPPedidosPlanta P ON P.GECODEMP=D.GECODEMP AND P.PEDNumero=D.PEDNumero
      WHERE P.GECODEMP IS NULL
      UNION ALL
      SELECT 'Evaluacion sin pedido', COUNT(*)
      FROM dbo.SSP06OPEvalPedidoCasino E
      LEFT JOIN dbo.SSP06OPPedidosPlanta P ON P.GECODEMP=E.GECODEMP AND P.PEDNumero=E.PEDNumero
      WHERE P.GECODEMP IS NULL
      UNION ALL
      SELECT 'Estado de pedido invalido', COUNT(*)
      FROM dbo.SSP06OPPedidosPlanta
      WHERE PedEstadoIngreso NOT IN (0,1,2,3,5);
    `);

    const issues = integrity.recordset.filter((row) => Number(row.issues) > 0);
    if (issues.length) fail(issues.map((row) => `${row.checkName}: ${row.issues}`).join('; '));

    console.table([
      { verificacion: 'Base', resultado: summary.databaseName },
      { verificacion: 'DEFEMP', resultado: 'VIEW sobre G_Emp' },
      { verificacion: 'Empresas homologadas', resultado: Number(summary.mappedCompanies) },
      { verificacion: 'Personas disponibles', resultado: Number(summary.people) },
      { verificacion: 'Fichas con foto', resultado: Number(summary.peopleWithPhoto) },
      { verificacion: 'Usuarios Seguridad', resultado: Number(summary.securityUsers) },
      { verificacion: 'Tablas Casino', resultado: Object.keys(expectedRows).length },
      { verificacion: 'Tablas Personas', resultado: Object.keys(expectedPersonRows).length },
      { verificacion: 'Maestros CONEX', resultado: 0 }
    ]);
  } finally {
    await pool.close();
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
