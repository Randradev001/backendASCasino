const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeHistoryQuery, buildHistoryInsight } = require('../src/services/casinoHistorial.rules');

test('normaliza filtros historicos y descarta cualquier empresa de pantalla', () => {
  assert.deepEqual(normalizeHistoryQuery({ from: '2020-01-01', to: '2020-12-31', status: '3', productId: '111', page: '2', pageSize: '25', empCod: 99 }), {
    from: '2020-01-01', to: '2020-12-31', status: 3, casinoId: null, destinationId: null, motiveId: null,
    categoryId: null, productId: 111, search: '', page: 2, pageSize: 25, offset: 25
  });
});

test('rechaza fechas y codigos invalidos y limita tamaños de pagina', () => {
  assert.throws(() => normalizeHistoryQuery({ from: '2020-13-01' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeHistoryQuery({ categoryId: '-2' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.equal(normalizeHistoryQuery({ pageSize: 1000 }).pageSize, 10);
});

test('genera una conclusion breve desde los indicadores filtrados', () => {
  const insight = buildHistoryInsight({
    orders: 10,
    delivered: 8,
    typeCounters: [{ name: 'Bebestibles' }],
    productCounters: [{ name: 'Bebida cola' }],
    trend: [{ orders: 4 }, { orders: 6 }]
  });
  assert.match(insight, /80%/);
  assert.match(insight, /Bebestibles/);
  assert.match(insight, /aumenta 50%/);
});
