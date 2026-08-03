const service = require('../services/casinoPedidos.service');
const { SecurityError } = require('../services/seguridad.service');
const { hasPermission } = require('../middleware/securityAuthorization');

const canManageOthers = (req) => hasPermission(req.auth?.permissions || {}, { sistema: 55, modulo: 1, programa: 90 });

const sendError = (res, error) => {
  if (error instanceof SecurityError) {
    return res.status(error.status).json({ code: error.code, message: error.message, details: error.details });
  }
  console.error('Error en solicitudes Casino:', error);
  return res.status(500).json({ code: 'CASINO_ORDER_ERROR', message: 'No fue posible procesar la solicitud.' });
};

const context = async (req, res) => {
  try {
    return res.json(await service.getContext(req.context, canManageOthers(req)));
  } catch (error) {
    return sendError(res, error);
  }
};

const create = async (req, res) => {
  try {
    return res.status(201).json(await service.createDraft(req.body, req.context, canManageOthers(req)));
  } catch (error) {
    return sendError(res, error);
  }
};

const send = async (req, res) => {
  try {
    return res.json(await service.sendOrder(req.params.numero, req.context, canManageOthers(req)));
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { context, create, send };
