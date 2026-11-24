require('dotenv').config();

const { getPool, sql } = require('../src/conectorMysql/conectorSqlServer');
const { hashPassword } = require('../src/services/password.service');
const { initialPasswordForRut } = require('../src/services/casinoCarga.rules');

const empCod = Number(process.argv[2]);
if (!Number.isInteger(empCod) || empCod < 1) {
  console.error('Uso: node scripts/inicializar-claves-solicitantes.js <empresa>');
  process.exit(1);
}

const run = async () => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const result = await new sql.Request(transaction).input('empCod', sql.Int, empCod).query(`
      SELECT RTRIM(S.SOLLogin) login,S.SOLRut rut
      FROM SSP06MASolicitante S WITH (UPDLOCK,HOLDLOCK)
      LEFT JOIN SEGUSUCRED C ON RTRIM(C.UsuLogin)=RTRIM(S.SOLLogin)
      WHERE S.GECODEMP=@empCod AND S.SOLActivo=1 AND C.UsuLogin IS NULL;
    `);
    for (const item of result.recordset) {
      const modern = await hashPassword(initialPasswordForRut(item.rut));
      await new sql.Request(transaction).input('login', sql.VarChar(10), item.login)
        .input('salt', sql.VarChar(64), modern.salt).input('hash', sql.VarChar(256), modern.hash).query(`
          INSERT SEGUSUCRED(UsuLogin,PasswordSalt,PasswordHash,MigradoDesdeGX,FechaCambio)
          VALUES(@login,@salt,@hash,0,SYSUTCDATETIME());
        `);
    }
    await transaction.commit();
    const verification = await pool.request().input('empCod', sql.Int, empCod).query(`
      SELECT COUNT(*) solicitantesActivos,
             SUM(CASE WHEN C.UsuLogin IS NOT NULL THEN 1 ELSE 0 END) conCredencial,
             SUM(CASE WHEN C.UsuLogin IS NULL THEN 1 ELSE 0 END) sinCredencial
      FROM SSP06MASolicitante S
      LEFT JOIN SEGUSUCRED C ON RTRIM(C.UsuLogin)=RTRIM(S.SOLLogin)
      WHERE S.GECODEMP=@empCod AND S.SOLActivo=1;
    `);
    console.log({ inicializadas: result.recordset.length, verificacion: verification.recordset[0] });
  } catch (error) {
    try { await transaction.rollback(); } catch {}
    throw error;
  } finally {
    await pool.close();
  }
};

run().catch((error) => {
  console.error(`No fue posible inicializar las claves: ${error.message}`);
  process.exitCode = 1;
});
