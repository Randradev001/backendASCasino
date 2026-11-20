const service = require('../services/casinoCorreo.service');
const { SecurityError } = require('../services/seguridad.service');
const error = (res, value) => {
  if (value instanceof SecurityError) return res.status(value.status).json({ code: value.code, message: value.message });
  console.error('Error en correo Casino:', value); return res.status(500).json({ code: 'CASINO_MAIL_ERROR', message: 'No fue posible procesar el modulo de correos.' });
};
const list = async (req, res) => { try { return res.json(await service.list(req.query, req.context)); } catch (value) { return error(res, value); } };
const detail = async (req, res) => { try { return res.json(await service.detail(req.params.id, req.context)); } catch (value) { return error(res, value); } };
const retry = async (req, res) => { try { return res.json(await service.retry(req.params.id, req.context)); } catch (value) { return error(res, value); } };
const process = async (req, res) => { try { return res.json(await service.processBatch(req.body?.limit)); } catch (value) { return error(res, value); } };
module.exports = { list, detail, retry, process };
