const service = require('../services/casinoCarga.service');
const { SecurityError } = require('../services/seguridad.service');

const sendError = (res, error) => {
  if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message, details: error.details });
  console.error('Error en centro de cargas Casino:', error);
  return res.status(500).json({ code: 'CASINO_LOAD_ERROR', message: 'No fue posible procesar la planilla.' });
};
const file = (req) => { if (!req.file?.buffer) throw new SecurityError(400, 'FILE_REQUIRED', 'Debe seleccionar un archivo XLSX.'); return req.file; };
const validate = async (req, res) => { try { const uploaded = file(req); return res.json(await service.analyze(uploaded.buffer, req.context)); } catch (error) { return sendError(res, error); } };
const apply = async (req, res) => { try { const uploaded = file(req); return res.json(await service.apply(uploaded.buffer, uploaded.originalname, req.context)); } catch (error) { return sendError(res, error); } };

module.exports = { validate, apply };
