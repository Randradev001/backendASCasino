const { getPool, sql } = require('../conectorMysql/conectorSqlServer');

const clean = (value) => String(value || '').trim();

const getSummary = async (context) => {
  const pool = await getPool();
  const result = await pool.request().input('empCod', sql.Int, context.empCod).query(`
    SELECT
      COUNT(*) AS Users,
      SUM(CASE WHEN UE.UsuEstado=1 AND U.UsuEstado=1 THEN 1 ELSE 0 END) AS ActiveUsers,
      SUM(CASE WHEN C.UsuLogin IS NOT NULL THEN 1 ELSE 0 END) AS ModernCredentials
    FROM USUARIOS U
    INNER JOIN SEGUSUEMP UE ON UE.UsuLogin=U.UsuLogin AND UE.GECODEMP=@empCod
    LEFT JOIN SEGUSUCRED C ON C.UsuLogin=U.UsuLogin AND NULLIF(RTRIM(C.PasswordHash),'') IS NOT NULL;

    SELECT COUNT(*) AS Roles FROM UROLES;
    SELECT COUNT(*) AS RoleAssignments FROM URolesPorUser WHERE GECODEMP=@empCod;
    SELECT COUNT(*) AS ActiveSessions FROM SEGSESION WHERE EmpCod=@empCod AND FechaExpiracion>SYSUTCDATETIME();

    SELECT RTRIM(U.UsuLogin) AS UsuLogin, U.UsuNseg, RTRIM(ISNULL(R.ROLCod,'')) AS ROLCod
    FROM USUARIOS U
    INNER JOIN SEGUSUEMP UE ON UE.UsuLogin=U.UsuLogin AND UE.GECODEMP=@empCod
    LEFT JOIN URolesPorUser RXU ON RXU.GECODEMP=UE.GECODEMP AND RXU.UsuLogin=U.UsuLogin
    LEFT JOIN UROLES R ON R.ROLCod=RXU.ROLCod;
  `);

  const counts = result.recordsets[0]?.[0] || {};
  const users = Number(counts.Users || 0);
  const adminRoles = String(process.env.SECURITY_ADMIN_ROLES || 'ADMINFULL').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
  const configuredLogins = String(process.env.SECURITY_ADMIN_LOGINS || '').split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
  const minimumLevel = Number(process.env.SECURITY_ADMIN_MIN_LEVEL || 900);
  const candidates = new Map();

  for (const row of result.recordsets[4] || []) {
    const login = clean(row.UsuLogin).toUpperCase();
    const current = candidates.get(login) || { login, level: Number(row.UsuNseg || 0), roles: [] };
    const role = clean(row.ROLCod).toUpperCase();
    if (role) current.roles.push(role);
    candidates.set(login, current);
  }

  const securityAdmins = [...candidates.values()].filter((user) =>
    configuredLogins.includes(user.login) || user.level >= minimumLevel || adminRoles.some((role) => user.roles.includes(role))
  ).length;
  const legacyDataAdmins = [...candidates.values()].filter((user) => user.roles.includes('ADMFULL')).length;

  return {
    users,
    activeUsers: Number(counts.ActiveUsers || 0),
    inactiveUsers: users - Number(counts.ActiveUsers || 0),
    roles: Number(result.recordsets[1]?.[0]?.Roles || 0),
    roleAssignments: Number(result.recordsets[2]?.[0]?.RoleAssignments || 0),
    activeSessions: Number(result.recordsets[3]?.[0]?.ActiveSessions || 0),
    modernCredentials: Number(counts.ModernCredentials || 0),
    legacyCredentials: users - Number(counts.ModernCredentials || 0),
    securityAdmins,
    legacyDataAdmins,
    policy: { adminRoles, minimumLevel }
  };
};

module.exports = { getSummary };
