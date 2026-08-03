const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeDashboardQuery, statusLabel, buildBusinessAnalysis } = require('../src/services/casinoBi.rules');
const { requireAnyPermission } = require('../src/middleware/securityAuthorization');

test('normaliza filtros BI sin aceptar la empresa de la pantalla', () => {
  assert.deepEqual(normalizeDashboardQuery({ from: '2019-12-01', to: '2020-03-31', plant: 'ROSARIO', empCod: 99 }), {
    from: '2019-12-01',
    to: '2020-03-31',
    plant: 'rosario'
  });
});

test('rechaza rangos y faenadoras invalidas', () => {
  assert.throws(() => normalizeDashboardQuery({ from: '2020-04-01', to: '2020-03-01' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeDashboardQuery({ plant: 'el-milagro' }), (error) => error.code === 'VALIDATION_ERROR');
});

test('conserva los estados del flujo de pedidos GeneXus', () => {
  assert.equal(statusLabel(1), 'Enviado al casino');
  assert.equal(statusLabel(3), 'Entregado');
  assert.equal(statusLabel(5), 'Anulado');
});

test('autoriza BI con cualquiera de los programas de consulta Casino', () => {
  const middleware = requireAnyPermission([
    { sistema: 55, modulo: 5, programa: 1 },
    { sistema: 55, modulo: 5, programa: 5 }
  ]);
  let continued = false;
  middleware({ auth: { permissions: { programas: [{ SistCod: 55, Modcod: 5, ProgCod: 5 }] } } }, {}, () => { continued = true; });
  assert.equal(continued, true);
});

test('mantiene el dashboard principal para operacion y acepta 55/5/6', () => {
  const middleware = requireAnyPermission([
    { sistema: 55, modulo: 1, programa: 1 },
    { sistema: 55, modulo: 5, programa: 1 },
    { sistema: 55, modulo: 5, programa: 6 }
  ]);
  let continued = false;
  middleware({ auth: { permissions: { programas: [{ SistCod: 55, Modcod: 5, ProgCod: 6 }] } } }, {}, () => { continued = true; });
  assert.equal(continued, true);

  let operationalContinued = false;
  middleware({ auth: { permissions: { programas: [{ SistCod: 55, Modcod: 1, ProgCod: 1 }] } } }, {}, () => { operationalContinued = true; });
  assert.equal(operationalContinued, true);
});

test('genera cuatro conclusiones ejecutivas y respuestas fundamentadas sin un modelo externo', () => {
  const analysis = buildBusinessAnalysis({
    kpis: { orders: 10, delivered: 7, pending: 2, cancelled: 1, amount: 100000, fulfillmentRate: 70 },
    plants: [
      { name: 'Faenadora Rosario', amount: 75000 },
      { name: 'Faenadora San Vicente', amount: 25000 }
    ],
    trend: [
      { period: '2026-06', amount: 40000 },
      { period: '2026-07', amount: 50000 }
    ],
    topProducts: [{ name: 'Almuerzo ejecutivo', orders: 6, quantity: 120 }]
  });

  assert.equal(analysis.conclusions.length, 4);
  assert.match(analysis.assistant.answers.fulfillment, /70%/);
  assert.match(analysis.assistant.answers.plant, /Rosario/);
  assert.match(analysis.assistant.answers.product, /Almuerzo ejecutivo/);
  assert.match(analysis.assistant.answers.trend, /sube 25%/);
  assert.equal(analysis.assistant.mode, 'grounded-zero-cost');
});
