// Validación de lo que llega del front y cálculo de horas: funciones puras (sin
// base) para poder probarlas con node --test.

class ErrorValidacion extends Error {}

const TIPOS = ['trabajo', 'libre', 'vacaciones', 'festivo', 'baja'];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// "2026-11-02" -> fecha real (rechaza 2026-02-30).
function fecha(valor, campo = 'fecha') {
  if (typeof valor !== 'string' || !FECHA.test(valor)) throw new ErrorValidacion(`${campo}: usá AAAA-MM-DD`);
  const d = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== valor) throw new ErrorValidacion(`${campo}: no existe`);
  return valor;
}

// Cuota: se carga desde 3 años atrás hasta 2 años adelante. Acota lo que una
// cuenta puede guardar (y con miles de cuentas, lo que ocupa la base).
function fechaEditable(valor, hoy = new Date()) {
  const f = fecha(valor);
  const y = hoy.getUTCFullYear();
  const min = `${y - 3}${hoy.toISOString().slice(4, 10)}`;
  const max = `${y + 2}${hoy.toISOString().slice(4, 10)}`;
  if (f < min || f > max) throw new ErrorValidacion('fecha: se puede cargar desde 3 años atrás hasta 2 años adelante');
  return f;
}

const aMinutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

// Duración de un tramo en minutos; fin < inicio = pasa de medianoche.
function duracion({ inicio, fin }) {
  const m = aMinutos(fin) - aMinutos(inicio);
  return m > 0 ? m : m + 24 * 60;
}

// Tramos de un día de trabajo: 1 a 3, "HH:MM", inicio distinto de fin.
function tramos(valor) {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > 3) {
    throw new ErrorValidacion('tramos: entre 1 y 3 tramos por día');
  }
  return valor.map((t, i) => {
    if (!HORA.test(t?.inicio ?? '') || !HORA.test(t?.fin ?? '')) throw new ErrorValidacion(`tramo ${i + 1}: horas en formato HH:MM`);
    if (t.inicio === t.fin) throw new ErrorValidacion(`tramo ${i + 1}: el inicio y el fin no pueden ser iguales`);
    return { inicio: t.inicio, fin: t.fin };
  });
}

// Un día: { tipo, tramos (solo trabajo), nota? }.
function dia(body) {
  if (!TIPOS.includes(body?.tipo)) throw new ErrorValidacion(`tipo: elegí entre ${TIPOS.join(', ')}`);
  const nota = String(body?.nota ?? '').replace(/\s+/g, ' ').trim();
  if (nota.length > 200) throw new ErrorValidacion('nota: como mucho 200 caracteres');
  return {
    tipo: body.tipo,
    tramos: body.tipo === 'trabajo' ? tramos(body.tramos) : [],
    nota: nota || null,
  };
}

// Rango [desde, hasta] para leer el calendario: como mucho ~2 meses y medio.
function rango(desde, hasta) {
  fecha(desde, 'desde');
  fecha(hasta, 'hasta');
  const dias = (new Date(hasta) - new Date(desde)) / 86400000;
  if (dias < 0) throw new ErrorValidacion('hasta: tiene que ser igual o posterior a desde');
  if (dias > 75) throw new ErrorValidacion('rango: como mucho 75 días');
  return [desde, hasta];
}

const minutosDelDia = (d) => (d.tipo === 'trabajo' ? d.tramos.reduce((s, t) => s + duracion(t), 0) : 0);

module.exports = { ErrorValidacion, TIPOS, fecha, fechaEditable, duracion, tramos, dia, rango, minutosDelDia };
