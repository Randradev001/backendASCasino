const { SecurityError } = require('./seguridad.service');

const PLANTS = [
  { id: 'rosario', name: 'Faenadora Rosario', codes: ['D053', 'D054', 'D055'] },
  { id: 'san-vicente', name: 'Faenadora San Vicente', codes: [] },
  { id: 'lo-miranda', name: 'Faenadora Lo Miranda', codes: [] }
];

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

const normalizeDashboardQuery = (query = {}) => {
  const from = query.from ? String(query.from).trim() : null;
  const to = query.to ? String(query.to).trim() : null;
  const plant = query.plant ? String(query.plant).trim().toLowerCase() : 'all';

  if ((from && !validDate(from)) || (to && !validDate(to))) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'Las fechas deben usar el formato AAAA-MM-DD.');
  }
  if (from && to && from > to) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'La fecha desde no puede ser posterior a la fecha hasta.');
  }
  if (plant !== 'all' && !PLANTS.some((item) => item.id === plant)) {
    throw new SecurityError(400, 'VALIDATION_ERROR', 'La faenadora indicada no es valida.');
  }

  return { from, to, plant };
};

const statusLabel = (status) => ({
  0: 'Pendiente',
  1: 'Enviado al casino',
  2: 'En preparacion',
  3: 'Entregado',
  5: 'Anulado'
})[Number(status)] || `Estado ${status}`;

const percentage = (value) => `${Number(value || 0).toFixed(0)}%`;

const buildBusinessAnalysis = ({ kpis = {}, plants = [], trend = [], topProducts = [] } = {}) => {
  const orders = Number(kpis.orders || 0);
  const fulfillmentRate = Number(kpis.fulfillmentRate || 0);
  const activePlants = plants.filter((plant) => Number(plant.amount || 0) > 0).sort((left, right) => right.amount - left.amount);
  const leadPlant = activePlants[0];
  const leadProduct = topProducts[0];
  const currentPeriod = trend.at(-1);
  const previousPeriod = trend.at(-2);
  const variation = previousPeriod?.amount
    ? ((Number(currentPeriod?.amount || 0) - Number(previousPeriod.amount)) / Number(previousPeriod.amount)) * 100
    : null;

  const fulfillmentText = orders
    ? `${percentage(fulfillmentRate)} de los pedidos está entregado; ${Number(kpis.pending || 0)} siguen en flujo y ${Number(kpis.cancelled || 0)} están anulados.`
    : 'No hay pedidos en el período seleccionado para medir el cumplimiento operativo.';
  const plantText = leadPlant
    ? `${leadPlant.name} concentra ${percentage(kpis.amount ? (Number(leadPlant.amount) / Number(kpis.amount)) * 100 : 0)} del monto solicitado dentro de la información homologada.`
    : 'No hay monto asociado a una faenadora homologada dentro del período seleccionado.';
  const productText = leadProduct
    ? `${leadProduct.name} lidera el valor solicitado, con ${Number(leadProduct.orders || 0)} pedidos y ${Number(leadProduct.quantity || 0)} unidades.`
    : 'No hay productos con movimiento dentro del período seleccionado.';
  const trendText = !currentPeriod
    ? 'No hay períodos disponibles para evaluar la evolución mensual.'
    : variation === null
      ? `El período ${currentPeriod.period} todavía no tiene un mes anterior comparable.`
      : `El monto del último mes ${variation >= 0 ? 'sube' : 'baja'} ${percentage(Math.abs(variation))} frente al mes anterior.`;

  const conclusions = [
    { id: 'fulfillment', title: 'Cumplimiento operativo', text: fulfillmentText },
    { id: 'plant', title: 'Concentración por faenadora', text: plantText },
    { id: 'product', title: 'Producto líder', text: productText },
    { id: 'trend', title: 'Tendencia reciente', text: trendText }
  ];

  return {
    conclusions,
    assistant: {
      mode: 'grounded-zero-cost',
      welcome: 'Puedo explicar cumplimiento, faenadoras, productos y tendencia usando solamente los datos del filtro actual.',
      suggestions: [
        '¿Cómo está el cumplimiento?',
        '¿Qué faenadora concentra más monto?',
        '¿Cuál es el producto líder?',
        '¿Cómo viene la tendencia?'
      ],
      answers: {
        overview: conclusions.map((item) => item.text).join(' '),
        fulfillment: fulfillmentText,
        plant: plantText,
        product: productText,
        trend: trendText,
        fallback: 'Puedo responder sobre cumplimiento, faenadoras, productos o tendencia. Prueba una de las preguntas sugeridas.'
      }
    }
  };
};

module.exports = { PLANTS, normalizeDashboardQuery, statusLabel, buildBusinessAnalysis };
