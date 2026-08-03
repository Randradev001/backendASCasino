const service = require('../services/casinoHistorial.service');
const { SecurityError } = require('../services/seguridad.service');

const sendError = (res, error) => {
  if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message });
  console.error('Error en historial Casino:', error);
  return res.status(500).json({ code: 'CASINO_HISTORY_ERROR', message: 'No fue posible consultar el historial de pedidos.' });
};

const history = async (req, res) => {
  try {
    return res.json(await service.getHistory(req.query, req.context));
  } catch (error) {
    return sendError(res, error);
  }
};

const detail = async (req, res) => {
  try {
    return res.json(await service.getOrderDetail(req.params.numero, req.context));
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { history, detail };
