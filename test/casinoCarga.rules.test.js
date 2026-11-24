const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeWorkbook, calculateDv, initialPasswordForRut } = require('../src/services/casinoCarga.rules');

const workbook = () => ({
  'Tipo producto': [['Codigo', 'Familia de producto'], ['F1', 'Cafetería']],
  Solicitantes: [['CodigoSolicitante*', 'Nombres*', 'ApellidoPaterno*', 'ApellidoMaterno', 'Email*', 'CodigoDivision*', 'DescripcionDivision*', 'CodigoSubdivision*', 'DescripcionSubdivision*', 'CodigoCentroCosto*', 'DescripcionCentroCosto*'], [17526007, 'Andres', 'Andrade', '', 'andres@example.com', 'D1', 'División', 'S1', 'Subdivisión', 'C1', 'Costo']],
  Productos: [['CodigoProducto', 'NombreProducto*', 'CodigoTipoProducto', 'DescripcionTipoProducto', 'CodigoCasino', 'NombreCasino*', 'Precio*'], ['P1', 'Café', 'F1', 'Cafetería', 'CA1', 'Casino', 100]],
  Casinos: [['CodigoCasino*', 'NombreCasino*', 'emailResponsable*', 'EmailCasino', 'Activo*'], ['CA1', 'Casino', 'andres@example.com', 'casino@example.com', 'Sí']],
  Destinos: [['CodigoDestino*', 'NombreDestino*', 'Activo*'], ['D1', 'Sala', 'Sí']],
  Motivos: [['CodigoMotivo*', 'NombreMotivo*', 'Descripcion', 'Activo*'], ['M1', 'Reunión', '', 'Sí']]
});

test('calcula digito verificador chileno', () => assert.equal(calculateDv(17526007), '2'));
test('genera la clave inicial con los ultimos cuatro digitos del rut', () => {
  assert.equal(initialPasswordForRut(17526007), '6007');
  assert.equal(initialPasswordForRut(123), '0123');
});
test('normaliza la plantilla de centro de cargas', () => {
  const result = normalizeWorkbook(workbook());
  assert.equal(result.valid, true);
  assert.equal(result.summary.requesters, 1);
  assert.equal(result.data.requesters[0].login, '17526007');
  assert.equal(result.data.products[0].categoryExternalCode, 'F1');
});
test('rechaza referencias externas inexistentes', () => {
  const source = workbook();
  source.Productos[1][2] = 'F404';
  const result = normalizeWorkbook(source);
  assert.equal(result.valid, false);
  assert.match(result.errors[0].message, /no existe/);
});
