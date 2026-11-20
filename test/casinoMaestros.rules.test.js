const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeListQuery, normalizePayload, permissionForCatalog } = require('../src/services/casinoMaestros.rules');

test('normaliza paginacion y filtros sin aceptar empresa desde pantalla', () => {
  assert.deepEqual(normalizeListQuery({ q: ' aves ', page: '2', pageSize: '50', casinoId: '1', empCod: 99 }), {
    q: 'aves', page: 2, pageSize: 50, offset: 50, access: null, casinoId: 1, categoryId: null
  });
});

test('valida los campos propios de los cinco maestros', () => {
  assert.deepEqual(normalizePayload('casinos', { name: 'Casino Aves', rut: '14332241', dv: 'k', email: 'casino@empresa.cl' }), {
    name: 'Casino Aves', rut: 14332241, dv: 'K', email: 'casino@empresa.cl'
  });
  assert.deepEqual(normalizePayload('destinos', { name: 'Sala de reuniones' }), { name: 'Sala de reuniones' });
  assert.deepEqual(normalizePayload('motivos', { name: 'Capacitación' }), { name: 'Capacitación' });
  assert.deepEqual(normalizePayload('tipos-producto', { name: 'Colaciones', order: 2, access: 1 }), {
    name: 'Colaciones', order: 2, access: 1
  });
  assert.deepEqual(normalizePayload('productos', { name: 'Almuerzo', price: 4500, casinoId: 1, categoryId: 2 }), {
    name: 'Almuerzo', price: 4500, casinoId: 1, categoryId: 2
  });
});

test('rechaza acceso, precio y correo invalidos', () => {
  assert.throws(() => normalizePayload('tipos-producto', { name: 'Privado', order: 1, access: 2 }), /acceso/);
  assert.throws(() => normalizePayload('productos', { name: 'Producto', price: -1, casinoId: 1, categoryId: 1 }), /precio/);
  assert.throws(() => normalizePayload('casinos', { name: 'Casino', rut: 1, dv: '1', email: 'invalido' }), /correo/);
});

test('mapea cada maestro a su programa de seguridad', () => {
  assert.deepEqual(permissionForCatalog('casinos'), { sistema: 55, modulo: 10, programa: 1 });
  assert.deepEqual(permissionForCatalog('productos'), { sistema: 55, modulo: 10, programa: 11 });
});
