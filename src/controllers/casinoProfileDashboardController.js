const service = require('../services/casinoProfileDashboard.service');
const { SecurityError } = require('../services/seguridad.service');
const send = (profile) => async (req, res) => { try { return res.json(await service.dashboard(req.context, profile)); } catch (error) { if (error instanceof SecurityError) return res.status(error.status).json({ code: error.code, message: error.message }); console.error('Error dashboard por perfil:', error); return res.status(500).json({ code: 'CASINO_DASHBOARD_ERROR', message: 'No fue posible cargar el dashboard.' }); } };
module.exports = { person: send('person'), casino: send('casino') };
