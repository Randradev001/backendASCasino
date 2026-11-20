const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuery, permissionForReport } = require('../src/services/casinoConsultas.rules');

test('normaliza filtros anuales sin aceptar empresa ni estado desde pantalla', () => {
  assert.deepEqual(normalizeQuery({ year: '2026', casinoId: '1', empCod: 99, status: 1 }), { year: 2026, casinoId: 1, categoryId: null, motiveId: null, personRut: null, divisionId: null, q: '' });
});
test('mapea cada consulta a su permiso histórico', () => {
  assert.deepEqual(permissionForReport('tipo-producto'), { sistema: 55, modulo: 5, programa: 1 });
  assert.deepEqual(permissionForReport('motivo'), { sistema: 55, modulo: 5, programa: 4 });
});
test('rechaza consulta y año inválidos', () => {
  assert.throws(() => permissionForReport('otra'), (error) => error.code === 'REPORT_NOT_FOUND');
  assert.throws(() => normalizeQuery({ year: 1999 }), (error) => error.code === 'VALIDATION_ERROR');
});
