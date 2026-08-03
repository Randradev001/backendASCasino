const service = require('../services/casinoBi.service');
const { SecurityError } = require('../services/seguridad.service');

const dashboard = async (req, res) => {
  try {
    return res.json(await service.dashboard(req.query, req.context));
  } catch (error) {
    if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message });
    console.error('Error en BI Casino:', error);
    return res.status(500).json({ code: 'CASINO_BI_ERROR', message: 'No fue posible consultar el panel de pedidos.' });
  }
};

module.exports = { dashboard };
