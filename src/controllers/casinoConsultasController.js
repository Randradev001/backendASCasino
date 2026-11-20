const service = require('../services/casinoConsultas.service');
const { SecurityError } = require('../services/seguridad.service');

const get = async (req, res) => {
  try { return res.json(await service.get(req.params.consulta, req.query, req.context)); }
  catch (error) {
    if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message });
    console.error('Error en consultas Casino:', error);
    return res.status(500).json({ code: 'CASINO_REPORT_ERROR', message: 'No fue posible generar la consulta.' });
  }
};
module.exports = { get };
