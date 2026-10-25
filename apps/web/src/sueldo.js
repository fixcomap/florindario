import { desdeIso } from './fechas.js';
import { duracion } from './horas.js';

const aMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
// Ventanas de nocturnidad (22:00–06:00) en minutos desde la medianoche del día del tramo.
const NOCHE = [[0, 360], [1320, 1800], [2760, 2880]];

// Minutos de un tramo entre las 22:00 y las 06:00 (también si pasa de medianoche).
export function minutosNocturnos({ inicio, fin }) {
  const s = aMin(inicio);
  const e = s + duracion({ inicio, fin });
  return NOCHE.reduce((suma, [a, b]) => suma + Math.max(0, Math.min(e, b) - Math.max(s, a)), 0);
}

// Estimación del mes con las tarifas (céntimos y centésimas de %) y los días del mes.
export function estimar(t, dias) {
  let trabajados = 0;
  let nocturnos = 0;
  let domingo = 0;
  let extraPagada = 0;
  for (const d of dias) {
    if (d.tipo !== 'trabajo') continue;
    const m = d.tramos.reduce((s, tr) => s + duracion(tr), 0);
    trabajados += m;
    nocturnos += d.tramos.reduce((s, tr) => s + minutosNocturnos(tr), 0);
    if (desdeIso(d.fecha).getDay() === 0) domingo += m;
    if (d.extra?.pago === 'dinero') extraPagada += Math.min(d.extra.minutos, m);
  }
  // Las extras pagadas se cobran a su precio; el resto de horas, a la tarifa normal.
  const lineas = [];
  if (t.modo === 'mensual') lineas.push({ concepto: 'Sueldo base', cent: t.base });
  else lineas.push({ concepto: 'Horas normales', minutos: trabajados - extraPagada, cent: Math.round(((trabajados - extraPagada) / 60) * t.base) });
  if (extraPagada && t.extra) lineas.push({ concepto: 'Horas extra pagadas', minutos: extraPagada, cent: Math.round((extraPagada / 60) * t.extra) });
  if (nocturnos && t.nocturna) lineas.push({ concepto: 'Plus nocturnidad', minutos: nocturnos, cent: Math.round((nocturnos / 60) * t.nocturna) });
  if (domingo && t.domingo) lineas.push({ concepto: 'Plus domingo', minutos: domingo, cent: Math.round((domingo / 60) * t.domingo) });
  const bruto = lineas.reduce((s, l) => s + l.cent, 0);
  const descuentos = Math.round((bruto * (t.irpf + t.ss)) / 10000);
  return { lineas, bruto, descuentos, neto: bruto - descuentos, sinPrecioExtra: extraPagada > 0 && !t.extra };
}

// 123456 -> "1.234,56 €"
export const euros = (cent) => `${(cent / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
// "12,5" -> 1250 (céntimos o centésimas); vacío -> 0; inválido -> null
export function aCent(texto) {
  const t = String(texto ?? '').trim().replace(/\./g, '').replace(',', '.');
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
export const deCent = (cent) => (cent ? String(cent / 100).replace('.', ',') : '');
