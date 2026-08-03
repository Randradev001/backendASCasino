const service = require('../services/personas.service');
const { SecurityError } = require('../services/seguridad.service');

const sendError = (res, error) => {
  if (error instanceof SecurityError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  console.error('Error en Personas:', error);
  return res.status(500).json({ code: 'PERSONAS_ERROR', message: 'No fue posible consultar la ficha de Personas.' });
};

const list = async (req, res) => {
  try {
    return res.json(await service.list(req.query, req.context));
  } catch (error) {
    return sendError(res, error);
  }
};

const detail = async (req, res) => {
  try {
    return res.json(await service.getByRut(req.params.rut, req.context));
  } catch (error) {
    return sendError(res, error);
  }
};

const photo = async (req, res) => {
  try {
    const data = await service.getPhoto(req.params.rut, req.context);
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=300');
    return res.send(data);
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { list, detail, photo };

