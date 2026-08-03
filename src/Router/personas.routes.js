const router = require('express').Router();
const PersonasController = require('../controllers/personasController');
const authContext = require('../middleware/authContext');
const { requireAnySystem } = require('../middleware/securityAuthorization');

router.use(authContext, requireAnySystem([10, 55]));
router.get('/', PersonasController.list);
router.get('/:rut/foto', PersonasController.photo);
router.get('/:rut', PersonasController.detail);

module.exports = router;

