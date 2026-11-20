const service = require('../services/casinoEvaluaciones.service');
const { SecurityError } = require('../services/seguridad.service');
const sendError = (res, error) => {
  if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message });
  console.error('Error en evaluaciones Casino:', error);
  return res.status(500).json({ code: 'CASINO_EVALUATION_ERROR', message: 'No fue posible registrar la operacion.' });
};
const evaluate = async (req, res) => { try { return res.json(await service.evaluateOwnOrder(req.params.numero, req.body, req.context)); } catch (error) { return sendError(res, error); } };
const observe = async (req, res) => { try { return res.json(await service.addCasinoObservation(req.params.numero, req.body, req.context)); } catch (error) { return sendError(res, error); } };
const payment = async (req, res) => { try { return res.json(await service.setPaymentControl(req.params.numero, req.body, req.context)); } catch (error) { return sendError(res, error); } };
module.exports = { evaluate, observe, payment };
