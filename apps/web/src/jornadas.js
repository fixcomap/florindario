import { horas } from './horas.js';

const num = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
const porId = (jornadas, id) => jornadas.find((j) => j.id === id);

// 240 minutos en una jornada de 4 h -> "1 día de Jornada 20 h".
export function enDias(minutos, j) {
  const n = minutos / j.minutosDia;
  return `${num(n)} ${num(n) === '1' ? 'día' : 'días'} de ${j.nombre}`;
}

// [{ minutos, jornadaId }] -> "1 día de Jornada 20 h · 2 días de Jornada 40 h" (sin jornada, en horas).
export function sumaEnDias(items, jornadas) {
  const suma = new Map();
  items.forEach(({ minutos, jornadaId }) => {
    const k = porId(jornadas, jornadaId) ? jornadaId : null;
    suma.set(k, (suma.get(k) || 0) + minutos);
  });
  return [...suma].filter(([, m]) => m).map(([id, m]) => (id ? enDias(m, porId(jornadas, id)) : horas(m))).join(' · ');
}

// Saldo de la bolsa (en minutos) en días de la jornada con más extras; las otras
// jornadas con movimientos, como equivalencia ("o 2 días de Jornada 20 h").
export function saldoEnDias(minutos, porJornada = [], jornadas = []) {
  const peso = (j) => porJornada.find((p) => p.jornadaId === j.id)?.generadas || 0;
  const usadas = jornadas.filter((j) => porJornada.some((p) => p.jornadaId === j.id));
  if (!usadas.length) return jornadas.length ? enDias(minutos, jornadas[0]) : horas(minutos);
  const [principal, ...resto] = [...usadas].sort((a, b) => peso(b) - peso(a));
  return [enDias(minutos, principal), ...resto.map((j) => `o ${enDias(minutos, j)}`)].join(' · ');
}
