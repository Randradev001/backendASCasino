require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/Router');
const securityHeaders = require('./src/middleware/securityHeaders');

const app = express();
// const envioReporte = require('./src/controllers/correoController')
// const http = require('http');

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.urlencoded({ extended: false, limit: '64kb', parameterLimit: 200 }));
app.use(express.json({ limit: '256kb' }));
app.get('/ping', (req, res) => {
  res.type('text/plain').send('Servidor responde ✅');
});


const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDevelopmentOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    const isLocalHost = host === 'localhost' || host === '::1' || host.startsWith('127.');
    const isPrivateNetwork = host.startsWith('10.') || host.startsWith('192.168.')
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host);

    return ['http:', 'https:'].includes(url.protocol) && (isLocalHost || isPrivateNetwork);
  } catch {
    return false;
  }
};

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isDevelopmentOrigin(origin)) return callback(null, true);
    const error = new Error('Origen no permitido por CORS.');
    error.status = 403;
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  }
}));

app.use('/backendDocker', routes);

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Ruta no encontrada.' }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status || error.statusCode || 500);
  const safeStatus = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
  const code = error.code || (error.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR');
  if (safeStatus >= 500) console.error('Error HTTP no controlado:', error);
  return res.status(safeStatus).json({
    code,
    message: safeStatus === 500 ? 'No fue posible completar la operacion.' : error.message
  });
});



// const { CronJob } = require('cron');

// const tareasCron =  new CronJob('0 30 18 * * *',()=>{
//   console.log('pruebaCron')
// });

// tareasCron.start()

/*
// Turno 1
cron.schedule('0 0 8 * * *', () => {
 // 	envioReporte.enviarReporteHallazgo(1)
},{
  scheduled: true,
  timezone: "America/Santiago"
});

// Turno 2
cron.schedule('0 0 20 * * *', () => {
 // envioReporte.enviarReporteHallazgo(2)
},{
scheduled: true,
timezone: "America/Santiago"
}); */

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor corriendo en puerto: ${port}`);
  });
}

module.exports = app;
