const service = require('../services/casinoSolicitudes.service');
const { SecurityError } = require('../services/seguridad.service');

const sendError = (res, error) => {
  if (error instanceof SecurityError) {
    return res.status(error.status).json({ code: error.code, message: error.message, details: error.details });
  }
  console.error('Error en control de solicitudes Casino:', error);
  return res.status(500).json({ code: 'CASINO_REQUESTS_ERROR', message: 'No fue posible procesar las solicitudes del Casino.' });
};

const list = async (req, res) => {
  try { return res.json(await service.getRequests(req.query, req.context)); } catch (error) { return sendError(res, error); }
};

const detail = async (req, res) => {
  try { return res.json(await service.getRequestDetail(req.params.numero, req.context)); } catch (error) { return sendError(res, error); }
};

const personHistory = async (req, res) => {
  try { return res.json(await service.getPersonHistory(req.params.rut, req.context)); } catch (error) { return sendError(res, error); }
};

const approve = async (req, res) => {
  try { return res.json(await service.approveRequest(req.params.numero, req.body, req.context)); } catch (error) { return sendError(res, error); }
};

const reject = async (req, res) => {
  try { return res.json(await service.rejectRequest(req.params.numero, req.body, req.context)); } catch (error) { return sendError(res, error); }
};

const deliver = async (req, res) => {
  try { return res.json(await service.deliverRequest(req.params.numero, req.context)); } catch (error) { return sendError(res, error); }
};

module.exports = { list, detail, personHistory, approve, reject, deliver };
