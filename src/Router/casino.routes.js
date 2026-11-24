const router = require('express').Router();
const biController = require('../controllers/casinoBiController');
const historyController = require('../controllers/casinoHistorialController');
const ordersController = require('../controllers/casinoPedidosController');
const requestsController = require('../controllers/casinoSolicitudesController');
const mastersController = require('../controllers/casinoMaestrosController');
const reportsController = require('../controllers/casinoConsultasController');
const generalDownloadController = require('../controllers/casinoDescargaController');
const evaluationsController = require('../controllers/casinoEvaluacionesController');
const mailController = require('../controllers/casinoCorreoController');
const loadController = require('../controllers/casinoCargaController');
const requestersController = require('../controllers/casinoSolicitantesController');
const multer = require('multer');
const authContext = require('../middleware/authContext');
const { requireAnyPermission, requirePermission } = require('../middleware/securityAuthorization');

const consultationPermissions = [
  { sistema: 55, modulo: 1, programa: 1 },
  ...[1, 2, 3, 4, 5, 6].map((programa) => ({ sistema: 55, modulo: 5, programa }))
];
const orderPermission = { sistema: 55, modulo: 1, programa: 1 };
const historyPermission = { sistema: 55, modulo: 5, programa: 6 };
const requestsPermission = { sistema: 55, modulo: 1, programa: 10 };
const masterPermissions = { casinos: 1, destinos: 2, motivos: 3, 'tipos-producto': 10, productos: 11 };
const requireMasterPermission = requirePermission((req) => ({ sistema: 55, modulo: 10, programa: masterPermissions[req.params.catalogo] }));
const reportPermissions = { 'tipo-producto': 1, 'centro-costo': 2, persona: 3, motivo: 4 };
const requireReportPermission = requirePermission((req) => ({ sistema: 55, modulo: 5, programa: reportPermissions[req.params.consulta] }));
const workbookUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

router.use(authContext);
router.get('/bi/pedidos', requireAnyPermission(consultationPermissions), biController.dashboard);
router.get('/bi/historial', requirePermission(historyPermission), historyController.history);
router.get('/bi/pedidos/:numero', requirePermission(historyPermission), historyController.detail);
router.get('/consultas/descarga-general', requirePermission({ sistema: 55, modulo: 5, programa: 5 }), generalDownloadController.get);
router.get('/consultas/:consulta', requireReportPermission, reportsController.get);
router.get('/correos', requirePermission({ sistema: 55, modulo: 1, programa: 92 }), mailController.list);
router.get('/correos/:id', requirePermission({ sistema: 55, modulo: 1, programa: 92 }), mailController.detail);
router.post('/correos/:id/reintentar', requirePermission({ sistema: 55, modulo: 1, programa: 92 }), mailController.retry);
router.post('/correos-procesar', requirePermission({ sistema: 55, modulo: 1, programa: 92 }), mailController.process);
router.post('/cargas/validar', requirePermission({ sistema: 55, modulo: 10, programa: 13 }), workbookUpload.single('file'), loadController.validate);
router.post('/cargas/importar', requirePermission({ sistema: 55, modulo: 10, programa: 13 }), workbookUpload.single('file'), loadController.apply);
router.get('/maestros/solicitantes', requirePermission({ sistema: 55, modulo: 10, programa: 12 }), requestersController.list);
router.post('/maestros/solicitantes', requirePermission({ sistema: 55, modulo: 10, programa: 12 }), requestersController.create);
router.put('/maestros/solicitantes/:id', requirePermission({ sistema: 55, modulo: 10, programa: 12 }), requestersController.update);
router.delete('/maestros/solicitantes/:id', requirePermission({ sistema: 55, modulo: 10, programa: 12 }), requestersController.remove);
router.get('/pedidos/contexto', requirePermission(orderPermission), ordersController.context);
router.post('/pedidos', requirePermission(orderPermission), ordersController.create);
router.post('/pedidos/:numero/enviar', requirePermission(orderPermission), ordersController.send);
router.post('/pedidos/:numero/evaluacion', requirePermission(orderPermission), evaluationsController.evaluate);
router.get('/solicitudes', requirePermission(requestsPermission), requestsController.list);
router.get('/solicitudes/personas/:rut/historial', requirePermission(requestsPermission), requestsController.personHistory);
router.get('/solicitudes/:numero', requirePermission(requestsPermission), requestsController.detail);
router.post('/solicitudes/:numero/aprobar', requirePermission(requestsPermission), requestsController.approve);
router.post('/solicitudes/:numero/rechazar', requirePermission(requestsPermission), requestsController.reject);
router.post('/solicitudes/:numero/entregar', requirePermission(requestsPermission), requestsController.deliver);
router.post('/solicitudes/:numero/observacion', requirePermission(requestsPermission), evaluationsController.observe);
router.post('/solicitudes/:numero/control-pago', requirePermission(requestsPermission), evaluationsController.payment);
router.get('/maestros/opciones', requirePermission({ sistema: 55, modulo: 10, programa: 11 }), mastersController.options);
router.get('/maestros/:catalogo', requireMasterPermission, mastersController.list);
router.post('/maestros/:catalogo', requireMasterPermission, mastersController.create);
router.put('/maestros/:catalogo/:id', requireMasterPermission, mastersController.update);
router.delete('/maestros/:catalogo/:id', requireMasterPermission, mastersController.remove);

module.exports = router;
