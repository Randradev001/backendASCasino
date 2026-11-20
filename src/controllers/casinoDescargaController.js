const service = require('../services/casinoDescarga.service');
const { SecurityError } = require('../services/seguridad.service');

const get = async (req, res) => {
  try { return res.json(await service.get(req.query, req.context)); }
  catch (error) {
    if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message });
    console.error('Error en descarga general Casino:', error);
    return res.status(500).json({ code: 'CASINO_GENERAL_DOWNLOAD_ERROR', message: 'No fue posible obtener la descarga general.' });
  }
};

module.exports = { get };
