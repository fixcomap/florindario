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
// Con tarifas por jornada, cada día cobra según la jornada en que se trabajó: por
// hora (horas × precio) o sueldo fijo repartido por los días trabajados en cada una.
// Los días sin jornada van a la jornada con más días ese mes.
// Domingos "a mes vencido": los del mes anterior (diasAnterior) se cobran este mes.
export function estimar(t, dias, jornadas = [], diasAnterior = [], mesAnterior = '') {
  const reglaDomingo = (d) => jornadas.find((j) => j.id === d.jornadaId)?.domingo || 'normal';
  const porJornada = jornadas.length > 0 && t.jornadas?.length > 0;
  const grupos = new Map(); // clave -> { minutos, extraPagada, dias }
  let nocturnos = 0;
  let domingo = 0;
  let extraPagada = 0;
  const sinJornada = [];
  for (const d of dias) {
    if (d.tipo !== 'trabajo') continue;
    const m = d.tramos.reduce((s, tr) => s + duracion(tr), 0);
    const ep = d.extra?.pago === 'dinero' ? Math.min(d.extra.minutos, m) : 0;
    nocturnos += d.tramos.reduce((s, tr) => s + minutosNocturnos(tr), 0);
    if (desdeIso(d.fecha).getDay() === 0 && reglaDomingo(d) === 'normal') domingo += m;
    extraPagada += ep;
    const clave = !porJornada ? 'general' : jornadas.some((j) => j.id === d.jornadaId) ? d.jornadaId : null;
    if (clave === null) { sinJornada.push({ m, ep }); continue; }
    const g = grupos.get(clave) || { minutos: 0, extraPagada: 0, dias: 0 };
    g.minutos += m; g.extraPagada += ep; g.dias += 1;
    grupos.set(clave, g);
  }
  if (porJornada) {
    const principal = [...grupos].sort((a, b) => b[1].dias - a[1].dias)[0]?.[0] || t.jornadas[0].jornadaId;
    const g = grupos.get(principal) || { minutos: 0, extraPagada: 0, dias: 0 };
    sinJornada.forEach(({ m, ep }) => { g.minutos += m; g.extraPagada += ep; g.dias += 1; });
    grupos.set(principal, g);
  }
  const totalDias = [...grupos.values()].reduce((s, g) => s + g.dias, 0);

  const lineas = [];
  for (const [clave, g] of grupos) {
    const tarifa = clave === 'general' ? t : t.jornadas.find((x) => x.jornadaId === clave);
    const nombre = clave === 'general' ? null : jornadas.find((j) => j.id === clave)?.nombre;
    if (!tarifa) { lineas.push({ concepto: `${nombre} · sin tarifa`, cent: 0, sinTarifa: true }); continue; }
    if (tarifa.modo === 'hora') {
      const normales = g.minutos - g.extraPagada;
      lineas.push({ concepto: nombre ? `${nombre} · horas` : 'Horas normales', minutos: normales, cent: Math.round((normales / 60) * tarifa.base) });
    } else {
      const parte = totalDias ? g.dias / totalDias : 1;
      lineas.push({ concepto: nombre ? `${nombre} · ${g.dias} de ${totalDias} días` : 'Sueldo base', cent: Math.round(tarifa.base * parte) });
    }
  }
  if (!grupos.size && t.modo === 'mensual' && !porJornada) lineas.push({ concepto: 'Sueldo base', cent: t.base });
  if (extraPagada && t.extra) lineas.push({ concepto: 'Horas extra pagadas', minutos: extraPagada, cent: Math.round((extraPagada / 60) * t.extra) });
  if (nocturnos && t.nocturna) lineas.push({ concepto: 'Plus nocturnidad', minutos: nocturnos, cent: Math.round((nocturnos / 60) * t.nocturna) });
  if (domingo && t.domingo) lineas.push({ concepto: 'Plus domingo', minutos: domingo, cent: Math.round((domingo / 60) * t.domingo) });
  // Domingos del mes anterior en jornadas que los pagan a mes vencido.
  const vencidos = new Map();
  for (const d of diasAnterior) {
    if (d.tipo !== 'trabajo' || desdeIso(d.fecha).getDay() !== 0 || reglaDomingo(d) !== 'pago') continue;
    const v = vencidos.get(d.jornadaId) || { n: 0, minutos: 0 };
    v.n += 1;
    v.minutos += d.tramos.reduce((s, tr) => s + duracion(tr), 0);
    vencidos.set(d.jornadaId, v);
  }
  for (const [id, v] of vencidos) {
    const tarifa = t.jornadas?.find((x) => x.jornadaId === id);
    const nombre = jornadas.find((j) => j.id === id)?.nombre;
    const cent = !tarifa?.domingo ? 0 : tarifa.domingoPor === 'hora' ? Math.round((v.minutos / 60) * tarifa.domingo) : v.n * tarifa.domingo;
    lineas.push({ concepto: `Domingos de ${mesAnterior} · ${nombre} · ${v.n}`, minutos: v.minutos, cent, sinImporte: !tarifa?.domingo });
  }
  const bruto = lineas.reduce((s, l) => s + l.cent, 0);
  const descuentos = Math.round((bruto * (t.irpf + t.ss)) / 10000);
  return {
    lineas, bruto, descuentos, neto: bruto - descuentos,
    sinPrecioExtra: extraPagada > 0 && !t.extra,
    sinTarifa: lineas.some((l) => l.sinTarifa),
    domingoSinImporte: lineas.some((l) => l.sinImporte),
    asignados: porJornada ? sinJornada.length : 0,
  };
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
