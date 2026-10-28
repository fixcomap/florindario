// Exportar el calendario: .ics (Google Calendar, Apple, Outlook) y el mes en PDF,
// generados aquí y no en el navegador: en el iPhone, con la app instalada, iOS ignora
// window.print() y las descargas de blobs (pasó con plantilla). El front pide un enlace
// firmado de pocos minutos y lo abre: funciona sin cookies, fuera de la app instalada.
const crypto = require('crypto');
const express = require('express');
const PDFDocument = require('pdfkit');
const config = require('./config');
const pool = require('./db');
const { requiereActiva } = require('./cuentas');
const { ErrorValidacion, fecha, minutosDelDia } = require('./validar');

const VIGENCIA_MS = 5 * 60 * 1000;
const DIAS_MAX = { ics: 366, pdf: 31 };

// Mismos nombres y colores que apps/web/src/datos/tipos.js (trabajo: según la jornada).
const TIPOS = {
  trabajo: { nombre: 'Trabajo', fondo: '#fdf0c4', color: '#8a6500' },
  libre: { nombre: 'Libre', fondo: '#e2f0e2', color: '#3f7a4b' },
  vacaciones: { nombre: 'Vacaciones', fondo: '#dbf0f2', color: '#16737f' },
  festivo: { nombre: 'Festivo', fondo: '#ebe7f7', color: '#7d6db7' },
  baja: { nombre: 'Baja', fondo: '#ece8f8', color: '#6a5aa8' },
  compensado: { nombre: 'Libre compensado', fondo: '#dff1ef', color: '#2f8f8a' },
  disposicion: { nombre: 'Libre disposición', fondo: '#e2f0e2', color: '#3f7a4b' },
};
const POR_JORNADA = [{ fondo: '#fdf0c4', color: '#8a6500' }, { fondo: '#fbe1dd', color: '#b3261e' }];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ---------- fechas y horas (como en el front) ----------

const dos = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
const sumarDias = (f, n) => iso(new Date(Date.parse(`${f}T00:00:00Z`) + n * 86400000));
const corta = (hhmm) => (hhmm.endsWith(':00') ? String(Number(hhmm.slice(0, 2))) : `${Number(hhmm.slice(0, 2))}:${hhmm.slice(3)}`);
function horas(minutos) {
  if (!minutos) return '—';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${dos(m)}` : `${h} h`;
}

// Semanas de lunes a domingo que cubren el mes (fechas ISO).
function semanasDelMes(anio, mes) {
  const primero = `${anio}-${dos(mes + 1)}-01`;
  const ultimo = iso(new Date(Date.UTC(anio, mes + 1, 0)));
  let lunes = sumarDias(primero, -((new Date(`${primero}T00:00:00Z`).getUTCDay() + 6) % 7));
  const semanas = [];
  while (lunes <= ultimo) {
    semanas.push(Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)));
    lunes = sumarDias(lunes, 7);
  }
  return semanas;
}

// ---------- enlace firmado ----------

const hmac = (datos) => crypto.createHmac('sha256', config.sessionSecret).update(`exportar:${datos}`).digest('base64url');

function firmar({ usuarioId, formato, desde, hasta }, ahora = Date.now()) {
  const datos = Buffer.from(JSON.stringify([usuarioId, formato, desde, hasta, ahora + VIGENCIA_MS])).toString('base64url');
  return `${datos}.${hmac(datos)}`;
}

// null si no es nuestro, está alterado o venció.
function verificar(token, ahora = Date.now()) {
  const [datos, firma] = String(token).split('.');
  if (!datos || !firma) return null;
  const esperada = Buffer.from(hmac(datos));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
  const [usuarioId, formato, desde, hasta, vence] = JSON.parse(Buffer.from(datos, 'base64url').toString());
  return vence > ahora ? { usuarioId, formato, desde, hasta } : null;
}

function pedido(body) {
  const formato = body?.formato;
  if (!DIAS_MAX[formato]) throw new ErrorValidacion('formato: ics o pdf');
  const desde = fecha(body.desde, 'desde');
  const hasta = fecha(body.hasta, 'hasta');
  const dias = (Date.parse(hasta) - Date.parse(desde)) / 86400000;
  if (dias < 0 || dias >= DIAS_MAX[formato]) throw new ErrorValidacion(`rango: de 1 a ${DIAS_MAX[formato]} días`);
  if (formato === 'pdf' && (desde.slice(8) !== '01' || desde.slice(0, 7) !== hasta.slice(0, 7))) throw new ErrorValidacion('pdf: un mes entero');
  return { formato, desde, hasta };
}

// ---------- .ics ----------

const escapar = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
const compacta = (f) => f.replaceAll('-', '');
const hora = (hhmm) => `${hhmm.replace(':', '')}00`;

// Un evento por tramo de trabajo (con el nombre de la jornada) y uno de día entero por
// libre, vacaciones, etc. Horas "flotantes", sin zona: se ven en la hora del dispositivo.
// El UID es la fecha: reimportar actualiza en vez de duplicar.
function calendarioIcs(dias, jornadas = [], ahora = new Date()) {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const eventos = [];
  for (const d of [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const t = TIPOS[d.tipo];
    if (!t) continue;
    if (d.tipo === 'trabajo') {
      const nombre = jornadas.find((j) => j.id === d.jornadaId)?.nombre || t.nombre;
      d.tramos.forEach((tr, i) => eventos.push([
        `UID:${d.fecha}-${i}@florindario.fixcomap.com`,
        `DTSTART:${compacta(d.fecha)}T${hora(tr.inicio)}`,
        `DTEND:${compacta(tr.fin <= tr.inicio ? sumarDias(d.fecha, 1) : d.fecha)}T${hora(tr.fin)}`,
        `SUMMARY:${escapar(nombre)}`,
      ]));
    } else {
      eventos.push([
        `UID:${d.fecha}-0@florindario.fixcomap.com`,
        `DTSTART;VALUE=DATE:${compacta(d.fecha)}`,
        `DTEND;VALUE=DATE:${compacta(sumarDias(d.fecha, 1))}`,
        `SUMMARY:${escapar(t.nombre)}`,
        'TRANSP:TRANSPARENT',
      ]);
    }
  }
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//fixcomap//Florindario//ES', 'CALSCALE:GREGORIAN',
    ...eventos.flatMap((e) => ['BEGIN:VEVENT', `DTSTAMP:${sello}`, ...e, 'END:VEVENT']),
    'END:VCALENDAR', '',
  ].join('\r\n');
}

// ---------- PDF del mes ----------

// A4 vertical: título, cuadrícula L–D con el horario o el tipo de cada día en su color,
// horas de cada semana a la derecha y el total del mes abajo.
function pdfMes(salida, { anio, mes, dias, jornadas }) {
  const doc = new PDFDocument({ size: 'A4', margin: 36, info: { Title: `Florindario · ${MESES[mes]} ${anio}` } });
  doc.pipe(salida);
  const porFecha = Object.fromEntries(dias.map((d) => [d.fecha, d]));
  const aspecto = (d) => (d.tipo === 'trabajo'
    ? { ...TIPOS.trabajo, ...POR_JORNADA[Math.max(0, jornadas.findIndex((j) => j.id === d.jornadaId)) % POR_JORNADA.length] }
    : TIPOS[d.tipo]);
  const semanas = semanasDelMes(anio, mes);
  const delMes = (f) => f.slice(0, 7) === `${anio}-${dos(mes + 1)}`;

  const x0 = 36;
  const anchoH = 54;
  const ancho = (doc.page.width - 72 - anchoH) / 7;
  const alto = Math.min(110, (doc.page.height - 72 - 90) / semanas.length);
  doc.font('Helvetica-Bold').fontSize(26).fillColor('#2f2a33').text(`${MESES[mes][0].toUpperCase()}${MESES[mes].slice(1)} ${anio}`, x0, 36);
  let y = 84;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#8a7f88');
  ['L', 'M', 'X', 'J', 'V', 'S', 'D', 'h'].forEach((c, i) => doc.text(c, x0 + i * ancho, y, { width: i < 7 ? ancho : anchoH, align: 'center' }));
  y += 18;

  let totalMes = 0;
  for (const semana of semanas) {
    let totalSemana = 0;
    semana.forEach((f, i) => {
      const x = x0 + i * ancho;
      const d = porFecha[f];
      const a = d && TIPOS[d.tipo] ? aspecto(d) : null;
      doc.save().roundedRect(x + 2, y + 2, ancho - 4, alto - 4, 6).lineWidth(1)
        .fillAndStroke(a ? a.fondo : '#ffffff', a ? a.color : '#ece4da').restore();
      doc.save().opacity(delMes(f) ? 1 : 0.4);
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#2f2a33').text(String(Number(f.slice(8))), x + 8, y + 8);
      if (a) {
        const lineas = d.tipo === 'trabajo' ? d.tramos.map((t) => `${corta(t.inicio)}–${corta(t.fin)}`) : [a.nombre];
        doc.font('Helvetica-Bold').fontSize(9).fillColor(a.color).text(lineas.join('\n'), x + 8, y + 28, { width: ancho - 16 });
        const m = minutosDelDia(d);
        if (m) doc.font('Helvetica').fontSize(9).text(horas(m), x + 8, y + alto - 20, { width: ancho - 16, align: 'right' });
      }
      doc.restore();
      if (d && delMes(f)) totalSemana += minutosDelDia(d);
    });
    totalMes += totalSemana;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#2f2a33').text(horas(totalSemana), x0 + 7 * ancho, y + alto / 2 - 6, { width: anchoH, align: 'center' });
    y += alto;
  }
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#2f2a33').text(`Este mes: ${horas(totalMes)}`, x0, y + 14, { width: doc.page.width - 72, align: 'right' });
  doc.end();
}

// ---------- rutas ----------

const router = express.Router();

router.post('/exportar/enlace', requiereActiva, (req, res, next) => {
  try {
    const p = pedido(req.body);
    res.json({ url: `${config.apiUrl}/exportar/${firmar({ usuarioId: req.usuario.id, ...p })}` });
  } catch (err) {
    if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
    next(err);
  }
});

// Sin cookie: lo abre el navegador del sistema (o el de la app instalada) con el enlace.
router.get('/exportar/:token', async (req, res, next) => {
  try {
    const p = verificar(req.params.token);
    if (!p) return res.status(410).type('text/plain').send('Este enlace ya no vale. Volvé a exportar desde la app.');
    const { rows: [usuario] } = await pool.query(`SELECT 1 FROM usuarios WHERE id = $1 AND estado = 'activa'`, [p.usuarioId]);
    if (!usuario) return res.status(410).type('text/plain').send('Este enlace ya no vale.');
    const [anio, mes] = [Number(p.desde.slice(0, 4)), Number(p.desde.slice(5, 7)) - 1];
    const semanas = p.formato === 'pdf' ? semanasDelMes(anio, mes) : null;
    const [desde, hasta] = semanas ? [semanas[0][0], semanas.at(-1)[6]] : [p.desde, p.hasta];
    const [{ rows: dias }, { rows: jornadas }] = await Promise.all([
      pool.query(`SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, tipo, tramos, jornada_id::text AS "jornadaId"
        FROM dias WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha`, [p.usuarioId, desde, hasta]),
      pool.query('SELECT id::text, nombre FROM jornadas WHERE usuario_id = $1 ORDER BY minutos_dia, lower(nombre)', [p.usuarioId]),
    ]);
    res.set('Cache-Control', 'private, no-store');
    if (p.formato === 'ics') {
      res.set('Content-Disposition', `inline; filename="florindario-${p.desde}.ics"`).type('text/calendar; charset=utf-8');
      return res.send(calendarioIcs(dias, jornadas));
    }
    res.set('Content-Disposition', `attachment; filename="florindario-${p.desde.slice(0, 7)}.pdf"`).type('application/pdf');
    pdfMes(res, { anio, mes, dias, jornadas });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, firmar, verificar, pedido, calendarioIcs, semanasDelMes, pdfMes };
