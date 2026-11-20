const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEvaluation, normalizeCasinoObservation, normalizePaymentControl } = require('../src/services/casinoEvaluaciones.rules');

test('la evaluacion mala o regular exige observacion', () => {
  assert.throws(() => normalizeEvaluation({ evaluation: 1 }), (error) => error.code === 'VALIDATION_ERROR');
  assert.deepEqual(normalizeEvaluation({ evaluation: 2, comment: 'Entrega tardia' }), { evaluation: 2, comment: 'Entrega tardia' });
  assert.deepEqual(normalizeEvaluation({ evaluation: 3 }), { evaluation: 3, comment: '' });
});
test('el bloqueo manual exige motivo y la liberacion permite comentario opcional', () => {
  assert.throws(() => normalizePaymentControl({ paymentControl: 2 }), (error) => error.code === 'VALIDATION_ERROR');
  assert.deepEqual(normalizePaymentControl({ paymentControl: 1 }), { paymentControl: 1, comment: '' });
  assert.deepEqual(normalizeCasinoObservation({ comment: 'Sin stock de te' }), { comment: 'Sin stock de te' });
});
