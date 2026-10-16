/* Generates a standalone SQL Server 2022 data sample from BDADP_CASINO. */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

const sourceDatabase = process.argv[2] || 'BDADP_CASINO';
const outputFile = path.resolve(process.argv[3] || 'database/20260803_casino_demo_data.sql');
const tables = [
  'G_Emp', 'FPGrupos', 'FPArea', 'FPDivision', 'FPDivisionSub', 'FPOrganiza', 'FPCenCos', 'FPFuncion', 'FPSindicato', 'CHTurnos',
  'FPPersonas', 'SSP06MACasinosPlanta', 'SSP06MADestinosPlanta', 'SSP06MAMotivoPedidos', 'SSP06MATPProducto', 'SSP06MAProducto',
  'SSP06OPPedidosPlanta', 'SSP06OPPedidosPlantaDet', 'SSP06OPEvalPedidoCasino', 'MACorrelativos', 'MailFormatos'
];
const quote = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (Buffer.isBuffer(value)) return `0x${value.toString('hex')}`;
  if (value instanceof Date) return `'${value.toISOString().replace('T', ' ').replace('Z', '')}'`;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  return `N'${String(value).replace(/'/g, "''")}'`;
};
const config = {
  server: process.env.SQLSERVER_HOST,
  port: Number(process.env.SQLSERVER_PORT || 1433),
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  database: sourceDatabase,
  options: { instanceName: process.env.SQLSERVER_INSTANCE, encrypt: process.env.SQLSERVER_ENCRYPT !== 'false', trustServerCertificate: process.env.SQLSERVER_TRUST_CERT === 'true' }
};

(async () => {
  const pool = await sql.connect(config);
  try {
    const parts = [
      '/* Datos reales extraidos de ' + sourceDatabase + '. CONFIDENCIAL: contiene PII y posiblemente fotos. */',
      'SET NOCOUNT ON;', 'SET XACT_ABORT ON;',
      '/* La muestra contiene TOP (20) independiente por tabla; se preservan las filas aunque una referencia quede fuera de la muestra. */',
      ...tables.map((table) => `ALTER TABLE dbo.[${table}] NOCHECK CONSTRAINT ALL;`),
      'BEGIN TRANSACTION;'
    ];
    for (const table of tables) {
      const result = await pool.request().query(`SELECT TOP (20) * FROM dbo.[${table}] ORDER BY 1`);
      const rows = result.recordset;
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      parts.push(`\n/* ${table}: ${rows.length} registros */`);
      for (const row of rows) parts.push(`INSERT dbo.[${table}] (${columns.map((c) => `[${c}]`).join(',')}) VALUES (${columns.map((c) => quote(row[c])).join(',')});`);
    }
    parts.push('COMMIT TRANSACTION;', ...tables.map((table) => `ALTER TABLE dbo.[${table}] CHECK CONSTRAINT ALL;`));
    fs.writeFileSync(outputFile, `${parts.join('\n')}\n`, 'utf8');
    console.log(`Generado: ${outputFile}`);
  } finally { await pool.close(); }
})().catch((error) => { console.error(error.message); process.exit(1); });
