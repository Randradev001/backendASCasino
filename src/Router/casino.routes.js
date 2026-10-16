const router = require('express').Router();
const biController = require('../controllers/casinoBiController');
const historyController = require('../controllers/casinoHistorialController');
const ordersController = require('../controllers/casinoPedidosController');
const requestsController = require('../controllers/casinoSolicitudesController');
const authContext = require('../middleware/authContext');
const { requireAnyPermission, requirePermission } = require('../middleware/securityAuthorization');

const consultationPermissions = [
  { sistema: 55, modulo: 1, programa: 1 },
  ...[1, 2, 3, 4, 5, 6].map((programa) => ({ sistema: 55, modulo: 5, programa }))
];
const orderPermission = { sistema: 55, modulo: 1, programa: 1 };
const historyPermission = { sistema: 55, modulo: 5, programa: 6 };
const requestsPermission = { sistema: 55, modulo: 1, programa: 10 };

router.use(authContext);
router.get('/bi/pedidos', requireAnyPermission(consultationPermissions), biController.dashboard);
router.get('/bi/historial', requirePermission(historyPermission), historyController.history);
router.get('/bi/pedidos/:numero', requirePermission(historyPermission), historyController.detail);
router.get('/pedidos/contexto', requirePermission(orderPermission), ordersController.context);
router.post('/pedidos', requirePermission(orderPermission), ordersController.create);
router.post('/pedidos/:numero/enviar', requirePermission(orderPermission), ordersController.send);
router.get('/solicitudes', requirePermission(requestsPermission), requestsController.list);
router.get('/solicitudes/personas/:rut/historial', requirePermission(requestsPermission), requestsController.personHistory);
router.get('/solicitudes/:numero', requirePermission(requestsPermission), requestsController.detail);
router.post('/solicitudes/:numero/aprobar', requirePermission(requestsPermission), requestsController.approve);
router.post('/solicitudes/:numero/rechazar', requirePermission(requestsPermission), requestsController.reject);
router.post('/solicitudes/:numero/entregar', requirePermission(requestsPermission), requestsController.deliver);

module.exports = router;
