const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMailQuery, parseMailId } = require('../src/services/casinoCorreo.rules');

test('normaliza filtros de correo con intervalos abiertos', () => {
  assert.deepEqual(normalizeMailQuery({ from: '2026-11-01', status: 'error', page: '2', pageSize: '50' }), {
    from: '2026-11-01', to: null, status: 'ERROR', eventType: null, q: '', page: 2, pageSize: 50, offset: 50, exportAll: false
  });
});
test('rechaza rango, estado e identificador invalidos', () => {
  assert.throws(() => normalizeMailQuery({ from: '2026-11-02', to: '2026-11-01' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeMailQuery({ status: 'otro' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => parseMailId('x'), (error) => error.code === 'VALIDATION_ERROR');
});
