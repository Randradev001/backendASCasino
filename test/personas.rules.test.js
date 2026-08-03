const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeListQuery,
  normalizeRut,
  calculateAge,
  calculateServiceDuration,
  calculateAbsenteeism
} = require('../src/services/personas.rules');
const { requireAnySystem } = require('../src/middleware/securityAuthorization');

test('normaliza filtros de Personas sin aceptar empresas desde pantalla', () => {
  assert.deepEqual(normalizeListQuery({ search: '  Gonzalez ', estado: '1', page: '2', pageSize: '20', empCod: '99' }), {
    search: 'Gonzalez',
    estado: 1,
    page: 2,
    pageSize: 20,
    offset: 20
  });
});

test('valida RUT numerico usado como segunda parte de la clave', () => {
  assert.equal(normalizeRut('12.345.678-5'), 12345678);
  assert.throws(() => normalizeRut('sin-rut'), (error) => error.code === 'VALIDATION_ERROR');
});

test('calcula edad respetando si ya ocurrio el cumpleaños', () => {
  assert.equal(calculateAge(new Date(1990, 6, 20), new Date(2026, 6, 19)), 35);
  assert.equal(calculateAge(new Date(1990, 6, 20), new Date(2026, 6, 20)), 36);
});

test('conserva el calculo GeneXus de años, meses y ausentismo', () => {
  const duration = calculateServiceDuration(new Date(2020, 2, 15), new Date(2023, 7, 10), new Date(2026, 0, 1));
  assert.deepEqual(duration, { years: 3, months: 4 });
  assert.equal(calculateAbsenteeism(4, 8, duration), 1);
});

test('autoriza la ficha con sistema Personas o Casino', () => {
  const middleware = requireAnySystem([10, 55]);
  let continued = false;
  middleware(
    { auth: { permissions: { sistemas: [{ SistCod: 55 }] } } },
    {},
    () => { continued = true; }
  );
  assert.equal(continued, true);
});

test('rechaza la ficha si el usuario no tiene Personas ni Casino', () => {
  const middleware = requireAnySystem([10, 55]);
  let response;
  const res = {
    status(code) {
      response = { code };
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    }
  };
  middleware({ auth: { permissions: { sistemas: [{ SistCod: 1 }] } } }, res, () => {});
  assert.equal(response.code, 403);
  assert.equal(response.body.code, 'FORBIDDEN');
});
