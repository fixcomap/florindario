// Horas de los tramos: misma cuenta que la API (fin < inicio = pasa de medianoche).
const aMinutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export function duracion({ inicio, fin }) {
  const m = aMinutos(fin) - aMinutos(inicio);
  return m > 0 ? m : m + 24 * 60;
}

export const minutosDelDia = (d) => (d?.tipo === 'trabajo' ? d.tramos.reduce((s, t) => s + duracion(t), 0) : 0);

// 1230 -> "20 h 30"; 1200 -> "20 h"; 0 -> "—"
export function horas(minutos) {
  if (!minutos) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

// "09:00" -> "9"; "09:30" -> "9:30" (corto, para la cuadrícula del mes)
export const corta = (hhmm) => (hhmm.endsWith(':00') ? String(Number(hhmm.slice(0, 2))) : `${Number(hhmm.slice(0, 2))}:${hhmm.slice(3)}`);
export const tramoCorto = (t) => `${corta(t.inicio)}–${corta(t.fin)}`;

// Para la cuadrícula: 480 -> "8h"; 210 -> "3:30h".
export const horasCortas = (minutos) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}:${String(m).padStart(2, '0')}h` : `${h}h`;
};
