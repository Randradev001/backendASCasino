const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeOrderPayload,
  resolveRequesterRut,
  getMissingRequesterLocationFields,
  buildRequesterLocationError
} = require('../src/services/casinoPedidos.rules');

const validPayload = {
  requesterRut: 12911839,
  casinoId: 1,
  destinationId: 3,
  motiveId: 2,
  deliveryDate: '2026-08-03',
  deliveryTime: '14:30',
  description: 'Reunion operativa',
  lines: [{ productCode: 111, quantity: 5 }],
  empCod: 99,
  price: 1
};

test('normaliza el pedido sin aceptar empresa ni precios desde React', () => {
  assert.deepEqual(normalizeOrderPayload(validPayload), {
    requesterRut: 12911839,
    casinoId: 1,
    destinationId: 3,
    motiveId: 2,
    deliveryDate: '2026-08-03',
    deliveryTime: '14:30',
    deliveryMinutes: 870,
    description: 'Reunion operativa',
    lines: [{ productCode: 111, quantity: 5 }]
  });
});

test('permite cantidades digitadas grandes dentro del smallint GeneXus', () => {
  const result = normalizeOrderPayload({ ...validPayload, lines: [{ productCode: 111, quantity: '1250' }] });
  assert.equal(result.lines[0].quantity, 1250);
});

test('rechaza productos repetidos, cantidad cero y fecha u hora invalidas', () => {
  assert.throws(
    () => normalizeOrderPayload({ ...validPayload, lines: [{ productCode: 111, quantity: 1 }, { productCode: 111, quantity: 2 }] }),
    (error) => error.code === 'VALIDATION_ERROR'
  );
  assert.throws(
    () => normalizeOrderPayload({ ...validPayload, lines: [{ productCode: 111, quantity: 0 }] }),
    (error) => error.code === 'VALIDATION_ERROR'
  );
  assert.throws(() => normalizeOrderPayload({ ...validPayload, deliveryDate: '2026-02-30' }), /fecha/);
  assert.throws(() => normalizeOrderPayload({ ...validPayload, deliveryTime: '25:10' }), /hora/);
});

test('el solicitante normal queda fijado por la sesion', () => {
  assert.equal(resolveRequesterRut({ authenticatedRut: 6563483, requestedRut: null, canManageOthers: false }), 6563483);
  assert.throws(
    () => resolveRequesterRut({ authenticatedRut: 6563483, requestedRut: 12911839, canManageOthers: false }),
    (error) => error.status === 403 && error.code === 'REQUESTER_FORBIDDEN'
  );
});

test('55/1/90 puede elegir a otra persona de la empresa', () => {
  assert.equal(resolveRequesterRut({ authenticatedRut: 14332241, requestedRut: 12911839, canManageOthers: true }), 12911839);
});

test('informa exactamente los datos organizacionales que faltan en la ficha', () => {
  const location = { divisionId: 'D053', subdivisionId: '', costCenterId: '' };
  assert.deepEqual(getMissingRequesterLocationFields(location), [
    { key: 'subdivision', label: 'Subdivisión' },
    { key: 'costCenter', label: 'Centro de costo' }
  ]);

  const error = buildRequesterLocationError({ name: 'Persona de prueba', location });
  assert.match(error.message, /subdivisión y centro de costo/);
  assert.match(error.message, /Seleccione otro solicitante/);
});
