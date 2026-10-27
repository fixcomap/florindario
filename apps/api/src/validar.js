// Validación de lo que llega del front y cálculo de horas: funciones puras (sin
// base) para poder probarlas con node --test.

class ErrorValidacion extends Error {}

const TIPOS = ['trabajo', 'libre', 'vacaciones', 'festivo', 'baja', 'compensado', 'disposicion'];
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

const minutosDelDia = (d) => (d.tipo === 'trabajo' ? d.tramos.reduce((s, t) => s + duracion(t), 0) : 0);

// Jornada opcional de un día extra o compensado (que sea del usuario lo mira dias.js).
const idJornada = (valor) => {
  if (valor == null || valor === '') return null;
  if (!/^\d{1,18}$/.test(String(valor))) throw new ErrorValidacion('jornada: no existe');
  return String(valor);
};

const minutos = (valor, campo, min) => {
  if (!Number.isInteger(valor) || valor < min || valor > 1440) throw new ErrorValidacion(`${campo}: entre ${min} y 1440 minutos`);
  return valor;
};

// Un día: { tipo, tramos (solo trabajo), nota?, extra?, compensa? }.
//   extra (solo trabajo): { minutos, pago: 'dinero' | 'horas', cobrada? }; no más que lo trabajado.
//   compensa (solo 'compensado'): minutos que gasta de la bolsa de horas libres.
function dia(body) {
  if (!TIPOS.includes(body?.tipo)) throw new ErrorValidacion(`tipo: elegí entre ${TIPOS.join(', ')}`);
  const nota = String(body?.nota ?? '').replace(/\s+/g, ' ').trim();
  if (nota.length > 200) throw new ErrorValidacion('nota: como mucho 200 caracteres');
  const d = { tipo: body.tipo, tramos: body.tipo === 'trabajo' ? tramos(body.tramos) : [], nota: nota || null, extra: null, compensa: 0 };
  if (d.tipo === 'trabajo' && body.extra) {
    const m = minutos(body.extra.minutos, 'horas extra', 1);
    // En días de jornada (modo "por jornadas") cuenta la jornada, no lo trabajado.
    if (!body.extra.jornadaId && m > minutosDelDia(d)) throw new ErrorValidacion('horas extra: no pueden ser más que las trabajadas ese día');
    if (!['dinero', 'horas'].includes(body.extra.pago)) throw new ErrorValidacion('horas extra: elegí si se pagan o van a horas libres');
    d.extra = { minutos: m, pago: body.extra.pago, cobrada: body.extra.pago === 'dinero' && body.extra.cobrada === true, jornadaId: idJornada(body.extra.jornadaId) };
  }
  d.jornadaId = d.tipo === 'trabajo' ? idJornada(body.jornadaId) : null;
  d.compensaJornadaId = null;
  if (d.tipo === 'compensado') {
    d.compensa = minutos(body.compensa, 'horas libres usadas', 15);
    d.compensaJornadaId = idJornada(body.compensaJornadaId);
  }
  return d;
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

// Plantilla: 7 días (lunes a domingo); null = ese día no se toca al aplicarla.
function plantilla(body) {
  const nombre = String(body?.nombre ?? '').replace(/\s+/g, ' ').trim();
  if (nombre.length < 2 || nombre.length > 40) throw new ErrorValidacion('nombre: entre 2 y 40 caracteres');
  if (!Array.isArray(body?.dias) || body.dias.length !== 7) throw new ErrorValidacion('dias: uno por día de la semana (7)');
  if (body.dias.some((d) => d?.tipo === 'compensado')) throw new ErrorValidacion('plantilla: el libre compensado se carga día a día');
  if (body.dias.some((d) => d?.tipo === 'disposicion')) throw new ErrorValidacion('plantilla: los días de libre disposición se cargan día a día');
  const dias = body.dias.map((d) => (d == null ? null : (({ tipo: t, tramos: tr }) => ({ tipo: t, tramos: tr }))(dia(d))));
  if (dias.every((d) => d === null)) throw new ErrorValidacion('dias: cargá al menos un día');
  return { nombre, dias };
}

// Cambios en bloque (varios días seleccionados, o una plantilla aplicada):
// { dias: [{ fecha, tipo, tramos, nota }], borrar: [fecha] }, como mucho 93.
function lote(body, hoy = new Date()) {
  const dias = Array.isArray(body?.dias) ? body.dias : [];
  const borrar = Array.isArray(body?.borrar) ? body.borrar : [];
  if (!dias.length && !borrar.length) throw new ErrorValidacion('nada que cambiar');
  if (dias.length + borrar.length > 93) throw new ErrorValidacion('como mucho 93 días por vez');
  const vistos = new Set();
  const una = (f) => {
    fechaEditable(f, hoy);
    if (vistos.has(f)) throw new ErrorValidacion(`fecha repetida: ${f}`);
    vistos.add(f);
    return f;
  };
  return {
    dias: dias.map((d) => ({ fecha: una(d?.fecha), ...dia(d) })),
    borrar: borrar.map(una),
  };
}


module.exports = { ErrorValidacion, TIPOS, fecha, fechaEditable, duracion, tramos, dia, rango, plantilla, lote, minutosDelDia };
