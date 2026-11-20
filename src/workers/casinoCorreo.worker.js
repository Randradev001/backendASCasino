const service = require('../services/casinoCorreo.service');
let timer;
const start = () => {
  if (timer || process.env.CASINO_EMAIL_WORKER_ENABLED !== 'true') return false;
  const interval = Math.max(15, Number(process.env.CASINO_EMAIL_WORKER_INTERVAL_SECONDS || 30)) * 1000;
  const run = () => service.processBatch(Number(process.env.CASINO_EMAIL_BATCH_SIZE || 10)).catch((error) => console.error('Error en worker de correo Casino:', error.message));
  timer = setInterval(run, interval); timer.unref(); run(); return true;
};
const stop = () => { if (timer) clearInterval(timer); timer = undefined; };
module.exports = { start, stop };
