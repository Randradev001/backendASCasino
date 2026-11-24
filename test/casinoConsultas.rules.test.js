const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeQuery, permissionForReport } = require('../src/services/casinoConsultas.rules');
const { periodsBetween } = require('../src/services/casinoConsultas.service');

test('normaliza rangos de fechas sin aceptar empresa ni estado desde pantalla', () => {
  assert.deepEqual(normalizeQuery({ from: '2026-10-23', to: '2026-11-23', casinoId: '1', empCod: 99, status: 1 }), { from: '2026-10-23', to: '2026-11-23', casinoId: 1, categoryId: null, motiveId: null, personRut: null, divisionId: null, q: '' });
});
test('mapea cada consulta a su permiso histórico', () => {
  assert.deepEqual(permissionForReport('tipo-producto'), { sistema: 55, modulo: 5, programa: 1 });
  assert.deepEqual(permissionForReport('motivo'), { sistema: 55, modulo: 5, programa: 4 });
});
test('genera columnas mensuales distintas cuando el rango cruza de año', () => {
  assert.deepEqual(periodsBetween('2025-12-15', '2026-02-02'), [
    { value: '2025-12', key: 'period_2025_12' },
    { value: '2026-01', key: 'period_2026_01' },
    { value: '2026-02', key: 'period_2026_02' }
  ]);
});
test('rechaza consulta, fechas inválidas y rango invertido', () => {
  assert.throws(() => permissionForReport('otra'), (error) => error.code === 'REPORT_NOT_FOUND');
  assert.throws(() => normalizeQuery({ from: '2026-02-30' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeQuery({ from: '2026-11-23', to: '2026-10-23' }), (error) => error.code === 'VALIDATION_ERROR');
});
