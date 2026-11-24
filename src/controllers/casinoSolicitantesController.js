const service = require('../services/casinoSolicitantes.service');
const { SecurityError } = require('../services/seguridad.service');
const sendError = (res, error) => error instanceof SecurityError
  ? res.status(error.status).json({ code: error.code, message: error.message, details: error.details })
  : (console.error('Error en solicitantes Casino:', error), res.status(500).json({ code: 'CASINO_REQUESTER_ERROR', message: 'No fue posible procesar el solicitante.' }));
const list = async (req, res) => { try { return res.json(await service.list(req.query, req.context)); } catch (error) { return sendError(res, error); } };
const create = async (req, res) => { try { return res.status(201).json(await service.create(req.body, req.context)); } catch (error) { return sendError(res, error); } };
const update = async (req, res) => { try { return res.json(await service.update(req.params.id, req.body, req.context)); } catch (error) { return sendError(res, error); } };
const remove = async (req, res) => { try { return res.json(await service.remove(req.params.id, req.context)); } catch (error) { return sendError(res, error); } };
module.exports = { list, create, update, remove };
