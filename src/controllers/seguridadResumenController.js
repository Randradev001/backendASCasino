const service = require('../services/seguridadResumen.service');

const summary = async (req, res) => {
  try {
    return res.json({ data: await service.getSummary(req.context) });
  } catch (error) {
    console.error('Error en resumen de seguridad:', error);
    return res.status(500).json({ code: 'SECURITY_SUMMARY_ERROR', message: 'No fue posible consultar el estado de Seguridad.' });
  }
};

module.exports = { summary };
