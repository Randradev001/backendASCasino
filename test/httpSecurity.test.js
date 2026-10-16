const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'production';
process.env.CORS_ORIGINS = 'https://casino.example.test';
process.env.LOGIN_RATE_LIMIT_MAX = '3';
process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '60000';

const app = require('../index');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('expone headers defensivos y no identifica Express', async () => {
  const response = await fetch(`${baseUrl}/ping`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('strict-transport-security'), 'max-age=15552000');
});

test('rechaza origen CORS no autorizado sin filtrar detalles internos', async () => {
  const response = await fetch(`${baseUrl}/backendDocker/no-existe`, { headers: { Origin: 'https://evil.example' } });
  const body = await response.json();
  assert.equal(response.status, 403);
  assert.equal(body.code, 'CORS_ORIGIN_DENIED');
  assert.equal(body.message, 'Origen no permitido por CORS.');
});

test('rechaza payload JSON mayor al limite configurado', async () => {
  const response = await fetch(`${baseUrl}/backendDocker/seguridad/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://casino.example.test' },
    body: JSON.stringify({ rut: '1-9', password: 'x'.repeat(300 * 1024) })
  });
  const body = await response.json();
  assert.equal(response.status, 413);
  assert.equal(body.code, 'PAYLOAD_TOO_LARGE');
});

test('limita intentos repetidos de login', async () => {
  let response;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await fetch(`${baseUrl}/backendDocker/seguridad/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://casino.example.test' },
      body: JSON.stringify({ rut: 'invalido', password: 'incorrecta' })
    });
  }
  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.code, 'TOO_MANY_LOGIN_ATTEMPTS');
});

test('no publica la ruta interna de prueba', async () => {
  const response = await fetch(`${baseUrl}/backendDocker/test`);
  assert.equal(response.status, 404);
});
