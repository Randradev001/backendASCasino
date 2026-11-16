const { test } = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core').default;
const generarImages = require('../src/puppeteer/generarImg');
const { Resend } = require('resend');

test('la captura conserva adjuntos Buffer y cierra Chromium', async (t) => {
  let closed = false;
  let launchOptions;
  const page = {
    async goto(url) { assert.equal(url, 'https://report.example.invalid/'); },
    async waitForSelector(selector) { assert.equal(selector, '#correctiva'); },
    async evaluate() {},
    async screenshot() { return new Uint8Array([137, 80, 78, 71]); }
  };
  t.mock.method(puppeteer, 'launch', async (options) => {
    launchOptions = options;
    return { async newPage() { return page; }, async close() { closed = true; } };
  });
  const image = await generarImages({ url: 'https://report.example.invalid/' });
  assert.ok(Buffer.isBuffer(image));
  assert.deepEqual([...image], [137, 80, 78, 71]);
  assert.equal(launchOptions.executablePath, process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser');
  assert.equal(closed, true);
});

test('la captura libera Chromium si falla la página', async (t) => {
  let closed = false;
  t.mock.method(puppeteer, 'launch', async () => ({
    async newPage() { throw new Error('pagina no disponible'); },
    async close() { closed = true; }
  }));
  await assert.rejects(generarImages({ url: 'https://report.example.invalid/' }), /pagina no disponible/);
  assert.equal(closed, true);
});

test('Resend actualizado conserva HTML, adjuntos y respuesta sin enviar correo', async (t) => {
  let request;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ id: 'local-contract-check' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  });
  const resend = new Resend('re_local_test_no_credential');
  const result = await resend.emails.send({
    from: 'sender@example.invalid', to: ['recipient@example.invalid'],
    subject: 'Prueba local', html: '<p>Prueba</p>',
    attachments: [{ filename: 'test.txt', content: Buffer.from('test') }]
  });
  assert.equal(request.url, 'https://api.resend.com/emails');
  const body = JSON.parse(request.options.body);
  assert.equal(body.html, '<p>Prueba</p>');
  assert.equal(body.attachments[0].content, Buffer.from('test').toString('base64'));
  assert.equal(result.error, null);
  assert.equal(result.data.id, 'local-contract-check');
});
