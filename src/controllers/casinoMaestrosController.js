const service = require('../services/casinoMaestros.service');
const { SecurityError } = require('../services/seguridad.service');

const sendError = (res, error) => {
  if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message, details: error.details });
  console.error('Error en maestros Casino:', error);
  return res.status(500).json({ code: 'CASINO_MASTER_ERROR', message: 'No fue posible procesar el maestro de Casino.' });
};

const list = async (req, res) => { try { return res.json(await service.list(req.params.catalogo, req.query, req.context)); } catch (error) { return sendError(res, error); } };
const create = async (req, res) => { try { return res.status(201).json(await service.create(req.params.catalogo, req.body, req.context, req.file)); } catch (error) { return sendError(res, error); } };
const update = async (req, res) => { try { return res.json(await service.update(req.params.catalogo, req.params.id, req.body, req.context, req.file)); } catch (error) { return sendError(res, error); } };
const remove = async (req, res) => { try { return res.json(await service.remove(req.params.catalogo, req.params.id, req.context)); } catch (error) { return sendError(res, error); } };
const options = async (req, res) => { try { return res.json(await service.options(req.context)); } catch (error) { return sendError(res, error); } };
const image = async (req, res) => { try { const result = await service.image(req.params.id, req.context); res.type(result.mimeType).set('Cache-Control', 'private, max-age=300'); return res.send(result.image); } catch (error) { return sendError(res, error); } };

module.exports = { list, create, update, remove, options, image };
