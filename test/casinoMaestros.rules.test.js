const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeListQuery, normalizePayload, permissionForCatalog } = require('../src/services/casinoMaestros.rules');

test('normaliza paginacion y filtros sin aceptar empresa desde pantalla', () => {
  assert.deepEqual(normalizeListQuery({ q: ' aves ', page: '2', pageSize: '50', casinoId: '1', empCod: 99 }), {
    q: 'aves', page: 2, pageSize: 50, offset: 50, access: null, casinoId: 1, categoryId: null
  });
});

test('valida los campos propios de los cinco maestros', () => {
  assert.deepEqual(normalizePayload('casinos', { externalCode: 'CAS01', name: 'Casino Aves', rut: '14332241', dv: 'k', email: 'casino@empresa.cl' }), {
    externalCode: 'CAS01', active: 1, name: 'Casino Aves', rut: 14332241, dv: 'K', email: 'casino@empresa.cl'
  });
  assert.deepEqual(normalizePayload('destinos', { externalCode: 'DEST01', name: 'Sala de reuniones' }), { externalCode: 'DEST01', name: 'Sala de reuniones', active: 1 });
  assert.deepEqual(normalizePayload('motivos', { externalCode: 'MOT01', name: 'Capacitación' }), { externalCode: 'MOT01', name: 'Capacitación', active: 1 });
  assert.deepEqual(normalizePayload('tipos-producto', { externalCode: 'TP01', name: 'Colaciones', order: 2, access: 1 }), {
    externalCode: 'TP01', active: 1, name: 'Colaciones', order: 2, access: 1
  });
  assert.deepEqual(normalizePayload('productos', { externalCode: 'PROD01', name: 'Almuerzo', price: 4500, casinoId: 1, categoryId: 2 }), {
    externalCode: 'PROD01', active: 1, name: 'Almuerzo', price: 4500, casinoId: 1, categoryId: 2
  });
});

test('rechaza acceso, precio y correo invalidos', () => {
  assert.throws(() => normalizePayload('tipos-producto', { externalCode: 'TP01', name: 'Privado', order: 1, access: 2 }), /acceso/);
  assert.throws(() => normalizePayload('productos', { externalCode: 'PROD01', name: 'Producto', price: -1, casinoId: 1, categoryId: 1 }), /precio/);
  assert.throws(() => normalizePayload('casinos', { externalCode: 'CAS01', name: 'Casino', rut: 1, dv: '1', email: 'invalido' }), /correo/);
});

test('mapea cada maestro a su programa de seguridad', () => {
  assert.deepEqual(permissionForCatalog('casinos'), { sistema: 55, modulo: 10, programa: 1 });
  assert.deepEqual(permissionForCatalog('productos'), { sistema: 55, modulo: 10, programa: 11 });
});
