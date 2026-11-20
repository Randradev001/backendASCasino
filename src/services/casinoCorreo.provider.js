const { Resend } = require('resend');

const configuration = () => ({ enabled: process.env.CASINO_EMAIL_ENABLED === 'true', from: String(process.env.CASINO_EMAIL_FROM || '').trim(), apiKey: String(process.env.RESEND || '').trim() });
const isConfigured = () => { const value = configuration(); return value.enabled && Boolean(value.from && value.apiKey); };
const send = async ({ to, subject, html }) => {
  const config = configuration();
  if (!config.enabled) throw new Error('El envio de correo Casino esta deshabilitado.');
  if (!config.from || !config.apiKey) throw new Error('Falta configurar el remitente o proveedor de correo Casino.');
  const { data, error } = await new Resend(config.apiKey).emails.send({ from: config.from, to, subject, html });
  if (error) throw new Error(error.message || 'El proveedor rechazo el correo.');
  return { id: data?.id || '' };
};
module.exports = { send, isConfigured };
