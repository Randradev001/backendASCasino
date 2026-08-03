const router = require("express").Router();

const seguridadRouter = require('./seguridad.routes')
const personasRouter = require('./personas.routes')
const casinoRouter = require('./casino.routes')

router.use('/seguridad', seguridadRouter)
router.use('/personas', personasRouter)
router.use('/casino', casinoRouter)

// test para confirmar que este router está montado
router.get('/test', (req, res) => res.send('Router raíz OK'));



module.exports = router
