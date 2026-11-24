/*
 * Exporta el esquema y todos los datos de una base SQL Server a scripts
 * compatibles con SQL Server 2016. La fuente se consulta exclusivamente en
 * modo lectura. Los archivos generados contienen PII y deben tratarse como
 * confidenciales.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

require('dotenv').config();

const sourceDatabase = process.argv[2] || process.env.SQLSERVER_DATABASE || 'BDADP_CASINO';
const outputDirectory = path.resolve(process.argv[3] || `database/exports/${sourceDatabase}-sqlserver-2016`);
const targetDatabase = process.argv[4] || sourceDatabase;
const MAX_BATCH_ROWS = 100;
const MAX_BATCH_CHARACTERS = 4 * 1024 * 1024;

const connection = {
  server: process.env.SQLSERVER_HOST,
  port: Number(process.env.SQLSERVER_PORT || 1433),
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  database: sourceDatabase,
  options: {
    instanceName: process.env.SQLSERVER_INSTANCE,
    encrypt: process.env.SQLSERVER_ENCRYPT !== 'false',
    trustServerCertificate: process.env.SQLSERVER_TRUST_CERT === 'true'
  },
  requestTimeout: 0
};

const bracket = (value) => `[${String(value).replace(/]/g, ']]')}]`;
const qualified = (schema, name) => `${bracket(schema)}.${bracket(name)}`;
const sqlString = (value) => `N'${String(value).replace(/'/g, "''")}'`;
const normalizeName = (value) => String(value).replace(/[^a-zA-Z0-9_.-]+/g, '_');
const pad = (value, length = 2) => String(value).padStart(length, '0');
const stamp = (date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const writeText = (file, content) => fs.writeFileSync(file, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
const fileDigest = (file) => {
  const hash = crypto.createHash('sha256');
  const descriptor = fs.openSync(file, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytes;
    while ((bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytes));
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest('hex');
};

const dataType = (column) => {
  const type = column.type_name.toLowerCase();
  if (['varchar', 'char', 'varbinary', 'binary'].includes(type)) return `${type}(${column.max_length === -1 ? 'max' : column.max_length})`;
  if (['nvarchar', 'nchar'].includes(type)) return `${type}(${column.max_length === -1 ? 'max' : column.max_length / 2})`;
  if (['decimal', 'numeric'].includes(type)) return `${type}(${column.precision},${column.scale})`;
  if (['datetime2', 'datetimeoffset', 'time'].includes(type)) return `${type}(${column.scale})`;
  if (type === 'float') return `${type}(${column.precision})`;
  return type;
};

const literalProjection = (column) => {
  const name = bracket(column.column_name);
  const alias = bracket(column.column_name);
  const type = column.type_name.toLowerCase();
  if (['binary', 'varbinary', 'image', 'timestamp', 'rowversion'].includes(type)) {
    return `CONVERT(varchar(max),${name},2) AS ${alias}`;
  }
  if (['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time'].includes(type)) {
    return `CONVERT(varchar(50),${name},126) AS ${alias}`;
  }
  if (['decimal', 'numeric', 'money', 'smallmoney', 'bigint', 'int', 'smallint', 'tinyint', 'bit', 'float', 'real'].includes(type)) {
    return `CONVERT(varchar(100),${name}) AS ${alias}`;
  }
  if (type === 'uniqueidentifier') return `CONVERT(varchar(36),${name}) AS ${alias}`;
  return name;
};

const dataLiteral = (value, column) => {
  if (value === null || value === undefined) return 'NULL';
  const type = column.type_name.toLowerCase();
  if (['binary', 'varbinary', 'image', 'timestamp', 'rowversion'].includes(type)) return `0x${value}`;
  if (['decimal', 'numeric', 'money', 'smallmoney', 'bigint', 'int', 'smallint', 'tinyint', 'bit', 'float', 'real'].includes(type)) return String(value);
  if (type === 'uniqueidentifier') return `'${value}'`;
  if (['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time'].includes(type)) return `'${value}'`;
  return sqlString(value);
};

const queryMetadata = async (pool) => {
  const result = await pool.request().query(`
    SELECT DB_NAME() database_name,
      CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(128)) product_version,
      CAST(SERVERPROPERTY('ProductLevel') AS nvarchar(128)) product_level,
      CAST(SERVERPROPERTY('Edition') AS nvarchar(128)) edition,
      d.compatibility_level,d.collation_name
    FROM sys.databases d WHERE d.name=DB_NAME();

    SELECT s.name schema_name,t.name table_name,t.object_id,t.is_memory_optimized,t.temporal_type,
      CAST(COALESCE(SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END),0) AS bigint) row_count
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id=t.schema_id
    LEFT JOIN sys.partitions p ON p.object_id=t.object_id
    WHERE t.is_ms_shipped=0
    GROUP BY s.name,t.name,t.object_id,t.is_memory_optimized,t.temporal_type
    ORDER BY s.name,t.name;

    SELECT s.name schema_name,t.name table_name,c.object_id,c.column_id,c.name column_name,
      ty.name type_name,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,c.is_computed,
      c.collation_name,c.is_rowguidcol,c.is_sparse,ic.seed_value,ic.increment_value,ic.is_not_for_replication,
      dc.name default_name,dc.definition default_definition
    FROM sys.columns c
    JOIN sys.tables t ON t.object_id=c.object_id
    JOIN sys.schemas s ON s.schema_id=t.schema_id
    JOIN sys.types ty ON ty.user_type_id=c.user_type_id
    LEFT JOIN sys.identity_columns ic ON ic.object_id=c.object_id AND ic.column_id=c.column_id
    LEFT JOIN sys.default_constraints dc ON dc.parent_object_id=c.object_id AND dc.parent_column_id=c.column_id
    WHERE t.is_ms_shipped=0
    ORDER BY s.name,t.name,c.column_id;

    SELECT s.name schema_name,t.name table_name,k.name constraint_name,k.type,k.unique_index_id,
      i.type_desc index_type,i.is_padded,i.fill_factor,i.ignore_dup_key,i.allow_row_locks,i.allow_page_locks,
      ds.name data_space_name,ic.key_ordinal,ic.is_descending_key,c.name column_name
    FROM sys.key_constraints k
    JOIN sys.tables t ON t.object_id=k.parent_object_id
    JOIN sys.schemas s ON s.schema_id=t.schema_id
    JOIN sys.indexes i ON i.object_id=k.parent_object_id AND i.index_id=k.unique_index_id
    JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id AND ic.key_ordinal>0
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    JOIN sys.data_spaces ds ON ds.data_space_id=i.data_space_id
    WHERE t.is_ms_shipped=0
    ORDER BY s.name,t.name,k.name,ic.key_ordinal;

    SELECT s.name schema_name,t.name table_name,cc.name constraint_name,cc.definition,
      cc.is_not_for_replication,cc.is_disabled,cc.is_not_trusted
    FROM sys.check_constraints cc
    JOIN sys.tables t ON t.object_id=cc.parent_object_id
    JOIN sys.schemas s ON s.schema_id=t.schema_id
    WHERE t.is_ms_shipped=0
    ORDER BY s.name,t.name,cc.name;

    SELECT s.name schema_name,t.name table_name,i.name index_name,i.index_id,i.type_desc,i.is_unique,
      i.has_filter,i.filter_definition,i.is_padded,i.fill_factor,i.ignore_dup_key,i.allow_row_locks,i.allow_page_locks,
      ds.name data_space_name,ic.key_ordinal,ic.is_descending_key,ic.is_included_column,c.name column_name
    FROM sys.indexes i
    JOIN sys.tables t ON t.object_id=i.object_id
    JOIN sys.schemas s ON s.schema_id=t.schema_id
    JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id
    JOIN sys.columns c ON c.object_id=ic.object_id AND c.column_id=ic.column_id
    JOIN sys.data_spaces ds ON ds.data_space_id=i.data_space_id
    WHERE t.is_ms_shipped=0 AND i.index_id>0 AND i.is_primary_key=0 AND i.is_unique_constraint=0
    ORDER BY s.name,t.name,i.name,ic.is_included_column,ic.key_ordinal,ic.index_column_id;

    SELECT ps.name parent_schema,pt.name parent_table,fk.name constraint_name,
      rs.name referenced_schema,rt.name referenced_table,fk.delete_referential_action_desc,fk.update_referential_action_desc,
      fk.is_not_for_replication,fk.is_disabled,fk.is_not_trusted,fkc.constraint_column_id,
      pc.name parent_column,rc.name referenced_column
    FROM sys.foreign_keys fk
    JOIN sys.tables pt ON pt.object_id=fk.parent_object_id
    JOIN sys.schemas ps ON ps.schema_id=pt.schema_id
    JOIN sys.tables rt ON rt.object_id=fk.referenced_object_id
    JOIN sys.schemas rs ON rs.schema_id=rt.schema_id
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
    JOIN sys.columns pc ON pc.object_id=fkc.parent_object_id AND pc.column_id=fkc.parent_column_id
    JOIN sys.columns rc ON rc.object_id=fkc.referenced_object_id AND rc.column_id=fkc.referenced_column_id
    WHERE pt.is_ms_shipped=0
    ORDER BY ps.name,pt.name,fk.name,fkc.constraint_column_id;

    SELECT s.name schema_name,v.name view_name,m.definition,m.uses_ansi_nulls,m.uses_quoted_identifier
    FROM sys.views v JOIN sys.schemas s ON s.schema_id=v.schema_id JOIN sys.sql_modules m ON m.object_id=v.object_id
    WHERE v.is_ms_shipped=0 ORDER BY s.name,v.name;
  `);
  return {
    database: result.recordsets[0][0],
    tables: result.recordsets[1],
    columns: result.recordsets[2],
    keys: result.recordsets[3],
    checks: result.recordsets[4],
    indexes: result.recordsets[5],
    foreignKeys: result.recordsets[6],
    views: result.recordsets[7]
  };
};

const groupBy = (rows, keyBuilder) => {
  const groups = new Map();
  for (const row of rows) {
    const key = keyBuilder(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
};

const tableScript = (metadata, generatedAt) => {
  const columnsByTable = groupBy(metadata.columns, (row) => `${row.schema_name}.${row.table_name}`);
  const keysByTable = groupBy(metadata.keys, (row) => `${row.schema_name}.${row.table_name}`);
  const parts = [
    `/* Generado ${generatedAt.toISOString()} desde ${sourceDatabase}. Compatible con SQL Server 2016. */`,
    'SET NOCOUNT ON;',
    'SET XACT_ABORT ON;',
    `IF DB_ID(${sqlString(targetDatabase)}) IS NULL`,
    'BEGIN',
    `  EXEC(N'CREATE DATABASE ${bracket(targetDatabase.replace(/'/g, "''"))} COLLATE ${metadata.database.collation_name}');`,
    'END;',
    'GO',
    `ALTER DATABASE ${bracket(targetDatabase)} SET COMPATIBILITY_LEVEL = 130;`,
    'GO',
    `USE ${bracket(targetDatabase)};`,
    'GO',
    'SET ANSI_NULLS ON;',
    'SET QUOTED_IDENTIFIER ON;',
    'GO'
  ];

  for (const table of metadata.tables) {
    if (table.is_memory_optimized || table.temporal_type) throw new Error(`La tabla ${table.schema_name}.${table.table_name} usa una característica no soportada por este exportador.`);
    const tableName = qualified(table.schema_name, table.table_name);
    const columns = columnsByTable.get(`${table.schema_name}.${table.table_name}`) || [];
    const definitions = columns.map((column) => {
      if (column.is_computed) throw new Error(`La columna calculada ${tableName}.${column.column_name} requiere soporte adicional.`);
      let definition = `  ${bracket(column.column_name)} ${dataType(column)}`;
      if (column.collation_name) definition += ` COLLATE ${column.collation_name}`;
      if (column.is_identity) definition += ` IDENTITY(${column.seed_value},${column.increment_value})${column.is_not_for_replication ? ' NOT FOR REPLICATION' : ''}`;
      if (column.is_rowguidcol) definition += ' ROWGUIDCOL';
      if (column.is_sparse) definition += ' SPARSE';
      definition += column.is_nullable ? ' NULL' : ' NOT NULL';
      if (column.default_name) definition += ` CONSTRAINT ${bracket(column.default_name)} DEFAULT ${column.default_definition}`;
      return definition;
    });
    const tableKeys = groupBy(keysByTable.get(`${table.schema_name}.${table.table_name}`) || [], (row) => row.constraint_name);
    for (const rows of tableKeys.values()) {
      const key = rows[0];
      const keyColumns = rows.map((row) => `${bracket(row.column_name)} ${row.is_descending_key ? 'DESC' : 'ASC'}`).join(', ');
      const options = `PAD_INDEX = ${key.is_padded ? 'ON' : 'OFF'}, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = ${key.ignore_dup_key ? 'ON' : 'OFF'}, ALLOW_ROW_LOCKS = ${key.allow_row_locks ? 'ON' : 'OFF'}, ALLOW_PAGE_LOCKS = ${key.allow_page_locks ? 'ON' : 'OFF'}${key.fill_factor ? `, FILLFACTOR = ${key.fill_factor}` : ''}`;
      definitions.push(`  CONSTRAINT ${bracket(key.constraint_name)} ${key.type === 'PK' ? 'PRIMARY KEY' : 'UNIQUE'} ${key.index_type.replace('_', ' ')} (${keyColumns}) WITH (${options}) ON ${bracket(key.data_space_name)}`);
    }
    parts.push(`\nIF OBJECT_ID(N'${tableName}', N'U') IS NOT NULL THROW 50000, N'La tabla ${tableName} ya existe.', 1;`, `CREATE TABLE ${tableName} (\n${definitions.join(',\n')}\n) ON [PRIMARY];`, 'GO');
  }
  return `${parts.join('\n')}\n`;
};

const secondaryObjectsScript = (metadata, generatedAt) => {
  const parts = [
    `/* Restricciones e indices. Generado ${generatedAt.toISOString()}. */`,
    `USE ${bracket(targetDatabase)};`,
    'GO',
    'SET NOCOUNT ON;',
    'SET XACT_ABORT ON;',
    'SET ANSI_NULLS ON;',
    'SET ANSI_PADDING ON;',
    'SET ANSI_WARNINGS ON;',
    'SET ARITHABORT ON;',
    'SET CONCAT_NULL_YIELDS_NULL ON;',
    'SET QUOTED_IDENTIFIER ON;',
    'SET NUMERIC_ROUNDABORT OFF;',
    'GO'
  ];
  for (const check of metadata.checks) {
    const table = qualified(check.schema_name, check.table_name);
    parts.push(`IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id=OBJECT_ID(N'${table}') AND name=N'${check.constraint_name.replace(/'/g, "''")}')`);
    parts.push(`  ALTER TABLE ${table} WITH ${check.is_not_trusted ? 'NOCHECK' : 'CHECK'} ADD CONSTRAINT ${bracket(check.constraint_name)} CHECK${check.is_not_for_replication ? ' NOT FOR REPLICATION' : ''} ${check.definition};`);
    parts.push(`ALTER TABLE ${table} ${check.is_disabled ? 'NOCHECK' : 'CHECK'} CONSTRAINT ${bracket(check.constraint_name)};`, 'GO');
  }
  const indexes = groupBy(metadata.indexes, (row) => `${row.schema_name}.${row.table_name}.${row.index_name}`);
  for (const rows of indexes.values()) {
    const index = rows[0];
    if (!['CLUSTERED', 'NONCLUSTERED'].includes(index.type_desc)) throw new Error(`Indice ${index.index_name} de tipo ${index.type_desc} no soportado.`);
    const keys = rows.filter((row) => !row.is_included_column).map((row) => `${bracket(row.column_name)} ${row.is_descending_key ? 'DESC' : 'ASC'}`).join(', ');
    const included = rows.filter((row) => row.is_included_column).map((row) => bracket(row.column_name));
    const options = `PAD_INDEX = ${index.is_padded ? 'ON' : 'OFF'}, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = ${index.ignore_dup_key ? 'ON' : 'OFF'}, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ${index.allow_row_locks ? 'ON' : 'OFF'}, ALLOW_PAGE_LOCKS = ${index.allow_page_locks ? 'ON' : 'OFF'}${index.fill_factor ? `, FILLFACTOR = ${index.fill_factor}` : ''}`;
    parts.push(`IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'${qualified(index.schema_name, index.table_name)}') AND name=N'${index.index_name.replace(/'/g, "''")}')`);
    parts.push(`  CREATE ${index.is_unique ? 'UNIQUE ' : ''}${index.type_desc} INDEX ${bracket(index.index_name)} ON ${qualified(index.schema_name, index.table_name)} (${keys})${included.length ? ` INCLUDE (${included.join(', ')})` : ''}${index.has_filter ? ` WHERE ${index.filter_definition}` : ''} WITH (${options}) ON ${bracket(index.data_space_name)};`, 'GO');
  }
  return `${parts.join('\n')}\n`;
};

const relationsAndViewsScript = (metadata, generatedAt) => {
  const parts = [
    `/* Claves foraneas y vistas. Generado ${generatedAt.toISOString()}. */`,
    `USE ${bracket(targetDatabase)};`,
    'GO',
    'SET NOCOUNT ON;',
    'SET XACT_ABORT ON;',
    'GO'
  ];
  const foreignKeys = groupBy(metadata.foreignKeys, (row) => `${row.parent_schema}.${row.parent_table}.${row.constraint_name}`);
  for (const rows of foreignKeys.values()) {
    const key = rows[0];
    const parentColumns = rows.map((row) => bracket(row.parent_column)).join(', ');
    const referencedColumns = rows.map((row) => bracket(row.referenced_column)).join(', ');
    const actions = `${key.delete_referential_action_desc !== 'NO_ACTION' ? ` ON DELETE ${key.delete_referential_action_desc.replace('_', ' ')}` : ''}${key.update_referential_action_desc !== 'NO_ACTION' ? ` ON UPDATE ${key.update_referential_action_desc.replace('_', ' ')}` : ''}`;
    const parentTable = qualified(key.parent_schema, key.parent_table);
    parts.push(`IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'${parentTable}') AND name=N'${key.constraint_name.replace(/'/g, "''")}')`);
    parts.push(`  ALTER TABLE ${parentTable} WITH ${key.is_not_trusted ? 'NOCHECK' : 'CHECK'} ADD CONSTRAINT ${bracket(key.constraint_name)} FOREIGN KEY${key.is_not_for_replication ? ' NOT FOR REPLICATION' : ''} (${parentColumns}) REFERENCES ${qualified(key.referenced_schema, key.referenced_table)} (${referencedColumns})${actions};`);
    parts.push(`ALTER TABLE ${parentTable} ${key.is_disabled ? 'NOCHECK' : 'CHECK'} CONSTRAINT ${bracket(key.constraint_name)};`, 'GO');
  }
  for (const view of metadata.views) {
    parts.push(`SET ANSI_NULLS ${view.uses_ansi_nulls ? 'ON' : 'OFF'};`, `SET QUOTED_IDENTIFIER ${view.uses_quoted_identifier ? 'ON' : 'OFF'};`, 'GO', view.definition.trim(), 'GO');
  }
  return `${parts.join('\n')}\n`;
};

const exportTableData = async (pool, table, columns, file, generatedAt) => {
  const writableColumns = columns.filter((column) => !['timestamp', 'rowversion'].includes(column.type_name.toLowerCase()));
  const identity = writableColumns.some((column) => column.is_identity);
  const tableName = qualified(table.schema_name, table.table_name);
  const descriptor = fs.openSync(file, 'w');
  let rowsWritten = 0;
  let batch = [];
  let batchCharacters = 0;

  const write = (value) => fs.writeSync(descriptor, value, null, 'utf8');
  const flush = () => {
    if (!batch.length) return;
    if (identity) write(`SET IDENTITY_INSERT ${tableName} ON;\n`);
    write('BEGIN TRANSACTION;\n');
    write(`INSERT INTO ${tableName} (${writableColumns.map((column) => bracket(column.column_name)).join(', ')}) VALUES\n`);
    write(`${batch.join(',\n')};\nCOMMIT TRANSACTION;\n`);
    if (identity) write(`SET IDENTITY_INSERT ${tableName} OFF;\n`);
    write('GO\n');
    batch = [];
    batchCharacters = 0;
  };

  try {
    write(`/* Datos confidenciales de ${tableName}. Generado ${generatedAt.toISOString()}. Filas esperadas: ${table.row_count}. */\n`);
    write(`USE ${bracket(targetDatabase)};\nGO\nSET NOCOUNT ON;\nSET XACT_ABORT ON;\nSET ANSI_NULLS ON;\nSET ANSI_PADDING ON;\nSET ANSI_WARNINGS ON;\nSET ARITHABORT ON;\nSET CONCAT_NULL_YIELDS_NULL ON;\nSET QUOTED_IDENTIFIER ON;\nSET NUMERIC_ROUNDABORT OFF;\nGO\n`);
    write(`IF EXISTS (SELECT TOP (1) 1 FROM ${tableName}) THROW 50000, N'La tabla ${tableName} debe estar vacia antes de importar.', 1;\nGO\n`);
    if (Number(table.row_count) > 0) {
      const request = pool.request();
      request.stream = true;
      const completion = new Promise((resolve, reject) => {
        request.on('row', (row) => {
          const tuple = `(${writableColumns.map((column) => dataLiteral(row[column.column_name], column)).join(', ')})`;
          if (batch.length && (batch.length >= MAX_BATCH_ROWS || batchCharacters + tuple.length > MAX_BATCH_CHARACTERS)) flush();
          batch.push(tuple);
          batchCharacters += tuple.length;
          rowsWritten += 1;
        });
        request.on('error', reject);
        request.on('done', resolve);
      });
      const select = writableColumns.map(literalProjection).join(',');
      request.query(`SELECT ${select} FROM ${tableName};`);
      await completion;
      flush();
    }
    write(`IF (SELECT COUNT_BIG(*) FROM ${tableName}) <> ${table.row_count} THROW 50000, N'Conteo incorrecto en ${tableName}.', 1;\nGO\n`);
  } finally {
    fs.closeSync(descriptor);
  }
  if (BigInt(rowsWritten) !== BigInt(table.row_count)) throw new Error(`Conteo exportado incorrecto en ${tableName}: ${rowsWritten} de ${table.row_count}.`);
  return rowsWritten;
};

const verificationScript = (metadata, generatedAt) => {
  const parts = [
    `/* Verificacion posterior a la importacion. Generado ${generatedAt.toISOString()}. */`,
    `USE ${bracket(targetDatabase)};`,
    'GO',
    'SET NOCOUNT ON;',
    `IF (SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) <> 130 THROW 50000, N'La compatibilidad debe ser SQL Server 2016 (130).', 1;`,
    `IF (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0) <> ${metadata.tables.length} THROW 50000, N'Cantidad de tablas incorrecta.', 1;`,
    `IF (SELECT COUNT(*) FROM sys.foreign_keys) <> ${new Set(metadata.foreignKeys.map((row) => row.constraint_name)).size} THROW 50000, N'Cantidad de claves foraneas incorrecta.', 1;`,
    `IF (SELECT COUNT(*) FROM sys.views WHERE is_ms_shipped=0) <> ${metadata.views.length} THROW 50000, N'Cantidad de vistas incorrecta.', 1;`,
    'DECLARE @Resultados table (Esquema sysname, Tabla sysname, Esperadas bigint, Encontradas bigint, Estado varchar(10));'
  ];
  for (const table of metadata.tables) {
    const tableName = qualified(table.schema_name, table.table_name);
    parts.push(`INSERT @Resultados SELECT N'${table.schema_name.replace(/'/g, "''")}',N'${table.table_name.replace(/'/g, "''")}',${table.row_count},COUNT_BIG(*),CASE WHEN COUNT_BIG(*)=${table.row_count} THEN 'OK' ELSE 'ERROR' END FROM ${tableName};`);
  }
  parts.push("IF EXISTS (SELECT 1 FROM @Resultados WHERE Estado='ERROR') BEGIN SELECT * FROM @Resultados ORDER BY Esquema,Tabla; THROW 50000, N'Existen tablas con conteos distintos.', 1; END;", 'SELECT * FROM @Resultados ORDER BY Esquema,Tabla;', "DBCC CHECKCONSTRAINTS WITH ALL_CONSTRAINTS;", "SELECT DB_NAME() Base,SERVERPROPERTY('ProductVersion') VersionServidor,(SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()) Compatibilidad,COUNT(*) TablasVerificadas,SUM(Encontradas) FilasVerificadas FROM @Resultados;", 'GO');
  return `${parts.join('\n')}\n`;
};

const readme = (metadata, generatedAt, dataFiles) => `# Exportacion completa de ${sourceDatabase} para SQL Server 2016

Generada: ${generatedAt.toISOString()}

Este paquete contiene el esquema y todos los datos observados en la base fuente. Es
confidencial: incluye datos personales, hashes de credenciales, sesiones y fotografias.
No debe almacenarse en un repositorio publico ni enviarse por canales no protegidos.

## Fuente

- Base: ${sourceDatabase}
- Version del servidor: ${metadata.database.product_version} (${metadata.database.edition})
- Compatibilidad original: ${metadata.database.compatibility_level}
- Tablas: ${metadata.tables.length}
- Vistas: ${metadata.views.length}
- Filas exportadas: ${metadata.tables.reduce((sum, table) => sum + Number(table.row_count), 0)}

## Orden de ejecucion

Ejecutar con una cuenta autorizada, en este orden:

1. \`00_create_database_and_tables.sql\`
2. Todos los archivos de \`data/\`, en orden alfabetico.
3. \`90_checks_and_indexes.sql\`
4. \`95_foreign_keys_and_views.sql\`
5. \`99_verify.sql\`

Los archivos usan separadores \`GO\`. En \`sqlcmd\`, usar entrada UTF-8 para conservar
acentos. La base de destino se crea con compatibilidad 130. Cada archivo de datos exige
que su tabla esté vacía y valida el conteo al terminar, evitando duplicaciones por una
ejecución accidental.

## Alcance deliberado

Se incluyen tablas, datos, claves primarias, restricciones UNIQUE y DEFAULT, CHECK,
indices, claves foraneas y vistas. La fuente no contiene procedimientos, funciones,
triggers, usuarios propios de base ni permisos propios que deban exportarse. No se
exportan logins del servidor SQL ni rutas fisicas de MDF/LDF.

## Archivos de datos

${dataFiles.map((item) => `- \`${item.file}\`: ${item.rows} filas`).join('\n')}
`;

const main = async () => {
  const generatedAt = new Date();
  const finalDirectory = path.join(outputDirectory, `${stamp(generatedAt)}_${normalizeName(sourceDatabase)}`);
  const dataDirectory = path.join(finalDirectory, 'data');
  fs.mkdirSync(dataDirectory, { recursive: true });

  const pool = await sql.connect(connection);
  try {
    const metadata = await queryMetadata(pool);
    if (metadata.database.database_name !== sourceDatabase) throw new Error(`La conexion apunta a ${metadata.database.database_name}, no a ${sourceDatabase}.`);
    if (metadata.tables.some((table) => table.schema_name !== 'dbo')) throw new Error('La exportacion contiene esquemas distintos de dbo; el exportador debe ampliarse antes de continuar.');

    writeText(path.join(finalDirectory, '00_create_database_and_tables.sql'), tableScript(metadata, generatedAt));
    writeText(path.join(finalDirectory, '90_checks_and_indexes.sql'), secondaryObjectsScript(metadata, generatedAt));
    writeText(path.join(finalDirectory, '95_foreign_keys_and_views.sql'), relationsAndViewsScript(metadata, generatedAt));
    writeText(path.join(finalDirectory, '99_verify.sql'), verificationScript(metadata, generatedAt));

    const columnsByTable = groupBy(metadata.columns, (row) => `${row.schema_name}.${row.table_name}`);
    const dataFiles = [];
    for (const [index, table] of metadata.tables.entries()) {
      const fileName = `${pad(index + 1, 3)}_${normalizeName(table.schema_name)}.${normalizeName(table.table_name)}.sql`;
      const relativeFile = `data/${fileName}`;
      process.stdout.write(`[${index + 1}/${metadata.tables.length}] ${table.schema_name}.${table.table_name} (${table.row_count} filas)... `);
      const rows = await exportTableData(pool, table, columnsByTable.get(`${table.schema_name}.${table.table_name}`) || [], path.join(finalDirectory, relativeFile), generatedAt);
      dataFiles.push({ file: relativeFile, rows });
      console.log('OK');
    }

    const finalCounts = await pool.request().query(`SELECT s.name schema_name,t.name table_name,SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END) row_count FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.partitions p ON p.object_id=t.object_id WHERE t.is_ms_shipped=0 GROUP BY s.name,t.name;`);
    const countMap = new Map(finalCounts.recordset.map((row) => [`${row.schema_name}.${row.table_name}`, BigInt(row.row_count)]));
    for (const table of metadata.tables) {
      if (countMap.get(`${table.schema_name}.${table.table_name}`) !== BigInt(table.row_count)) throw new Error(`La tabla ${table.schema_name}.${table.table_name} cambio durante la exportacion; descarte el paquete y repita.`);
    }

    writeText(path.join(finalDirectory, 'README.md'), readme(metadata, generatedAt, dataFiles));
    const files = fs.readdirSync(finalDirectory, { recursive: true }).filter((item) => typeof item === 'string' && !item.endsWith('manifest.json')).sort();
    const manifestFiles = files.filter((item) => fs.statSync(path.join(finalDirectory, item)).isFile()).map((file) => ({ file, bytes: fs.statSync(path.join(finalDirectory, file)).size, sha256: fileDigest(path.join(finalDirectory, file)) }));
    const manifest = {
      generatedAt: generatedAt.toISOString(),
      source: metadata.database,
      targetDatabase,
      targetCompatibilityLevel: 130,
      tables: metadata.tables.map((table) => ({ schema: table.schema_name, table: table.table_name, rows: Number(table.row_count) })),
      files: manifestFiles
    };
    writeText(path.join(finalDirectory, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Exportacion completa: ${finalDirectory}`);
  } finally {
    await pool.close();
  }
};

main().catch((error) => {
  console.error(`Exportacion cancelada: ${error.message}`);
  process.exit(1);
});
