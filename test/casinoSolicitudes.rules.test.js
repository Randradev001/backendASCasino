const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeRequestsQuery,
  normalizeApproval,
  normalizeRejection,
  classifyDeliveryTiming
} = require('../src/services/casinoSolicitudes.rules');
const { hasPermission } = require('../src/middleware/securityAuthorization');

test('normaliza el listado operacional sin aceptar empresa ni casino desde pantalla', () => {
  assert.deepEqual(normalizeRequestsQuery({ status: '1', search: '  maria  ', page: '2', pageSize: '25', empCod: 99, casinoId: 7 }), {
    status: 1,
    search: 'maria',
    page: 2,
    pageSize: 25,
    offset: 25
  });
});

test('permite consultar juntas las solicitudes con acciones pendientes', () => {
  assert.equal(normalizeRequestsQuery({ status: 'active' }).status, 'active');
});

test('valida la fecha y hora confirmadas al aprobar', () => {
  assert.deepEqual(normalizeApproval({ deliveryDate: '2026-10-20', deliveryTime: '14:35' }), {
    deliveryDate: '2026-10-20',
    deliveryTime: '14:35',
    deliveryMinutes: 875
  });
  assert.throws(() => normalizeApproval({ deliveryDate: '2026-02-30', deliveryTime: '25:00' }), (error) => error.code === 'VALIDATION_ERROR');
});

test('exige comentario al rechazar y limita su longitud', () => {
  assert.deepEqual(normalizeRejection({ comment: '  No hay capacidad para esa hora.  ' }), { comment: 'No hay capacidad para esa hora.' });
  assert.throws(() => normalizeRejection({ comment: ' ' }), (error) => error.code === 'VALIDATION_ERROR');
  assert.throws(() => normalizeRejection({ comment: 'x'.repeat(501) }), (error) => error.code === 'VALIDATION_ERROR');
});

test('separa el control 55/1/10 del permiso para crear pedidos 55/1/1', () => {
  const control = { programas: [{ SistCod: 55, Modcod: 1, ProgCod: 10 }] };
  const requester = { programas: [{ SistCod: 55, Modcod: 1, ProgCod: 1 }] };
  assert.equal(hasPermission(control, { sistema: 55, modulo: 1, programa: 10 }), true);
  assert.equal(hasPermission(requester, { sistema: 55, modulo: 1, programa: 10 }), false);
});

test('clasifica la entrega respecto de la hora comprometida', () => {
  assert.deepEqual(classifyDeliveryTiming(-75), { code: 'ANTICIPADO', label: 'Anticipado', minutes: 75 });
  assert.deepEqual(classifyDeliveryTiming(0), { code: 'ATIEMPO', label: 'A tiempo', minutes: 0 });
  assert.deepEqual(classifyDeliveryTiming(42), { code: 'ATRASADO', label: 'Tarde', minutes: 42 });
});
