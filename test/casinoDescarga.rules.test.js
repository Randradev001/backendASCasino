const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGeneralDownloadQuery } = require('../src/services/casinoDescarga.rules');

test('normaliza descarga general con intervalos abiertos y paginacion', () => {
  assert.deepEqual(normalizeGeneralDownloadQuery({ from: '2026-10-01', page: '2', pageSize: '50', status: '3', empCod: 99 }), {
    from: '2026-10-01', to: null, page: 2, pageSize: 50, exportAll: false, casinoId: null, categoryId: null, productId: null,
    motiveId: null, personRut: null, divisionId: null, subdivisionId: null, costCenterId: null,
    paymentControl: null, evaluation: null, status: 3, q: ''
  });
});

test('acepta cero en control, evaluacion y estado', () => {
  const result = normalizeGeneralDownloadQuery({ paymentControl: '0', evaluation: '0', status: '0', export: '1' });
  assert.equal(result.paymentControl, 0); assert.equal(result.evaluation, 0); assert.equal(result.status, 0);
  assert.equal(result.exportAll, true);
});

test('rechaza fechas y catalogos cerrados invalidos', () => {
  assert.throws(() => normalizeGeneralDownloadQuery({ from: '2026-02-30' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeGeneralDownloadQuery({ from: '2026-11-02', to: '2026-11-01' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeGeneralDownloadQuery({ status: '4' }), (error) => error.code === 'VALIDATION_ERROR');
});
