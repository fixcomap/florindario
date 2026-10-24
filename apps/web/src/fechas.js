// Fechas como "AAAA-MM-DD" en hora local: un día del calendario no tiene zona.
const dos = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const desdeIso = (s) => new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
export const hoy = () => iso(new Date());

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const nombreMes = (anio, mes) => `${MESES[mes]} ${anio}`;
export const diaLargo = (s) => {
  const d = desdeIso(s);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

// Semanas (de lunes a domingo) que cubren el mes: cada una, 7 fechas ISO.
export function semanasDelMes(anio, mes) {
  const ultimo = new Date(anio, mes + 1, 0);
  const lunes = new Date(anio, mes, 1);
  lunes.setDate(1 - ((lunes.getDay() + 6) % 7));
  const semanas = [];
  while (lunes <= ultimo) {
    semanas.push(Array.from({ length: 7 }, (_, i) => iso(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i))));
    lunes.setDate(lunes.getDate() + 7);
  }
  return semanas;
}
