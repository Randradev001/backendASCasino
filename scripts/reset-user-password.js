require('dotenv').config();

const { getPool, sql } = require('../src/conectorMysql/conectorSqlServer');
const { hashPassword } = require('../src/services/password.service');

const login = String(process.argv[2] || '').trim().toUpperCase();
const password = String(process.env.RESET_PASSWORD || '');

if (!login) {
  console.error('Uso: RESET_PASSWORD=<clave> node scripts/reset-user-password.js <login>');
  process.exit(1);
}

if (password.length < 8 || password.length > 64) {
  console.error('La nueva clave debe tener entre 8 y 64 caracteres.');
  process.exit(1);
}

const run = async () => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const user = await new sql.Request(transaction)
      .input('login', sql.VarChar(10), login)
      .query(`
        SELECT TOP (1) RTRIM(UsuLogin) AS UsuLogin
        FROM dbo.USUARIOS WITH (UPDLOCK, HOLDLOCK)
        WHERE RTRIM(UsuLogin)=@login;
      `);

    if (!user.recordset[0]) throw new Error(`El usuario ${login} no existe.`);

    const modern = await hashPassword(password);
    await new sql.Request(transaction)
      .input('login', sql.VarChar(10), login)
      .input('salt', sql.VarChar(64), modern.salt)
      .input('hash', sql.VarChar(256), modern.hash)
      .query(`
        UPDATE dbo.SEGUSUCRED
        SET PasswordSalt=@salt,
            PasswordHash=@hash,
            MigradoDesdeGX=0,
            FechaCambio=SYSUTCDATETIME()
        WHERE RTRIM(UsuLogin)=@login;

        IF @@ROWCOUNT=0
          INSERT INTO dbo.SEGUSUCRED
            (UsuLogin, PasswordSalt, PasswordHash, MigradoDesdeGX, FechaCambio)
          VALUES
            (@login, @salt, @hash, 0, SYSUTCDATETIME());

        UPDATE dbo.SEGSESION
        SET Revocada=1
        WHERE RTRIM(UsuLogin)=@login AND Revocada=0;
      `);

    await transaction.commit();
    console.log(`Clave restablecida y sesiones revocadas para ${login}.`);
  } catch (error) {
    try {
      await transaction.rollback();
    } catch {}
    throw error;
  } finally {
    await pool.close();
  }
};

run().catch((error) => {
  console.error(`No fue posible restablecer la clave: ${error.message}`);
  process.exitCode = 1;
});
