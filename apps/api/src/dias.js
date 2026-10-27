// Días del calendario de cada usuario: leer un rango, guardar un día y borrarlo.
const express = require('express');
const pool = require('./db');
const { protegerApp } = require('./cuentas');
const { ErrorValidacion, fecha, fechaEditable, dia, rango, lote, minutosDelDia } = require('./validar');

const COLUMNAS = `to_char(fecha, 'YYYY-MM-DD') AS fecha, tipo, tramos, nota, extra_minutos, extra_pago, extra_cobrada, compensa_minutos,
  extra_jornada_id::text, compensa_jornada_id::text, jornada_id::text`;

// Fila de la base -> día del front.
const aDia = (f) => ({
  fecha: f.fecha,
  tipo: f.tipo,
  tramos: f.tramos,
  nota: f.nota,
  extra: f.extra_minutos ? { minutos: f.extra_minutos, pago: f.extra_pago, cobrada: f.extra_cobrada, jornadaId: f.extra_jornada_id } : null,
  compensa: f.compensa_minutos,
  compensaJornadaId: f.compensa_jornada_id,
  jornadaId: f.jornada_id,
});

const GUARDAR = `INSERT INTO dias (usuario_id, fecha, tipo, tramos, nota, extra_minutos, extra_pago, extra_cobrada, compensa_minutos,
    extra_jornada_id, compensa_jornada_id, jornada_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  ON CONFLICT (usuario_id, fecha) DO UPDATE SET tipo = EXCLUDED.tipo, tramos = EXCLUDED.tramos, nota = EXCLUDED.nota,
    extra_minutos = EXCLUDED.extra_minutos, extra_pago = EXCLUDED.extra_pago, extra_cobrada = EXCLUDED.extra_cobrada,
    compensa_minutos = EXCLUDED.compensa_minutos, extra_jornada_id = EXCLUDED.extra_jornada_id,
    compensa_jornada_id = EXCLUDED.compensa_jornada_id, jornada_id = EXCLUDED.jornada_id
  RETURNING ${COLUMNAS}`;
const valores = (usuarioId, f, d) => [usuarioId, f, d.tipo, JSON.stringify(d.tramos), d.nota,
  d.extra?.minutos ?? 0, d.extra?.pago ?? null, d.extra?.cobrada ?? false, d.compensa, d.extra?.jornadaId ?? null, d.compensaJornadaId, d.jornadaId];

// Las jornadas que se nombran tienen que ser del usuario.
async function comprobarJornadas(usuarioId, dias) {
  const ids = [...new Set(dias.flatMap((d) => [d.extra?.jornadaId, d.compensaJornadaId, d.jornadaId]).filter(Boolean))];
  if (!ids.length) return;
  const { rows: [{ n }] } = await pool.query('SELECT count(*)::int AS n FROM jornadas WHERE usuario_id = $1 AND id = ANY($2::bigint[])', [usuarioId, ids]);
  if (n !== ids.length) throw new ErrorValidacion('jornada: no existe');
}

function manejar(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
      next(err);
    }
  };
}

const router = express.Router();
// Cuenta activa, límites de escritura y suspensión automática (src/cuentas.js).
router.use('/dias', protegerApp);

// GET /dias?desde=2026-10-26&hasta=2026-12-06 (lo que muestra la cuadrícula del mes)
router.get('/dias', manejar(async (req, res) => {
  const [desde, hasta] = rango(req.query.desde, req.query.hasta);
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM dias WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha`,
    [req.usuario.id, desde, hasta]
  );
  res.json(rows.map(aDia));
}));

router.put('/dias/:fecha', manejar(async (req, res) => {
  const f = fechaEditable(req.params.fecha);
  const d = dia(req.body);
  await comprobarJornadas(req.usuario.id, [d]);
  const { rows } = await pool.query(GUARDAR, valores(req.usuario.id, f, d));
  res.json(aDia(rows[0]));
}));

// Varios días de una vez (selección múltiple o plantilla aplicada), en una transacción.
router.put('/dias', manejar(async (req, res) => {
  const { dias, borrar } = lote(req.body);
  await comprobarJornadas(req.usuario.id, dias);
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const guardados = [];
    for (const d of dias) {
      const { rows } = await cliente.query(GUARDAR, valores(req.usuario.id, d.fecha, d));
      guardados.push(aDia(rows[0]));
    }
    if (borrar.length) await cliente.query('DELETE FROM dias WHERE usuario_id = $1 AND fecha = ANY($2::date[])', [req.usuario.id, borrar]);
    await cliente.query('COMMIT');
    res.json({ guardados, borrados: borrar });
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}));

// Días de cada tipo en un año (vacaciones gastadas, bajas, festivos...).
router.use('/resumen', protegerApp);
router.get('/resumen', manejar(async (req, res) => {
  const anio = Number(req.query.anio);
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) return res.status(400).json({ error: 'anio: un año entre 2000 y 2100' });
  const { rows } = await pool.query(
    `SELECT tipo, count(*)::int AS dias, count(*) FILTER (WHERE extract(isodow FROM fecha) <= 5)::int AS habiles FROM dias
     WHERE usuario_id = $1 AND fecha >= make_date($2, 1, 1) AND fecha < make_date($2 + 1, 1, 1)
     GROUP BY tipo`,
    [req.usuario.id, anio]
  );
  // vacaciones: según cómo las cuenta el usuario (hábiles = de lunes a viernes; los festivos ya son otro tipo).
  const dias = Object.fromEntries(rows.map((r) => [r.tipo, r.dias]));
  const vac = rows.find((r) => r.tipo === 'vacaciones');
  if (vac) dias.vacaciones = req.usuario.vacaciones_computo === 'naturales' ? vac.dias : vac.habiles;
  // Horas trabajadas y extra de cada mes (enero = 0).
  const trabajo = await pool.query(
    `SELECT extract(month FROM fecha)::int - 1 AS mes, tramos, extra_minutos, extra_pago FROM dias
     WHERE usuario_id = $1 AND tipo = 'trabajo' AND fecha >= make_date($2, 1, 1) AND fecha < make_date($2 + 1, 1, 1)`,
    [req.usuario.id, anio]
  );
  const meses = Array.from({ length: 12 }, (_, mes) => ({ mes, minutos: 0, extraDinero: 0, extraHoras: 0 }));
  for (const f of trabajo.rows) {
    const m = meses[f.mes];
    m.minutos += minutosDelDia({ tipo: 'trabajo', tramos: f.tramos });
    if (f.extra_pago === 'dinero') m.extraDinero += f.extra_minutos;
    if (f.extra_pago === 'horas') m.extraHoras += f.extra_minutos;
  }
  res.json({ anio, dias, meses });
}));

// Horas extra de siempre: lo pagado (cobrado o no) y la bolsa de horas libres.
router.use('/extras', protegerApp);
router.get('/extras', manejar(async (req, res) => {
  const { rows: [r] } = await pool.query(
    `SELECT
       coalesce(sum(extra_minutos) FILTER (WHERE extra_pago = 'dinero' AND NOT extra_cobrada), 0)::int AS sin_cobrar,
       coalesce(sum(extra_minutos) FILTER (WHERE extra_pago = 'dinero' AND extra_cobrada), 0)::int AS cobradas,
       coalesce(sum(extra_minutos) FILTER (WHERE extra_pago = 'horas'), 0)::int AS bolsa_generadas,
       coalesce(sum(compensa_minutos), 0)::int AS bolsa_usadas
     FROM dias WHERE usuario_id = $1`,
    [req.usuario.id]
  );
  // Por jornada: minutos a libres y devueltos (para contarlos en días de cada jornada).
  const { rows: porJornada } = await pool.query(
    `SELECT jornada_id::text AS "jornadaId", sum(generadas)::int AS generadas, sum(usadas)::int AS usadas FROM (
       SELECT extra_jornada_id AS jornada_id, extra_minutos AS generadas, 0 AS usadas FROM dias WHERE usuario_id = $1 AND extra_pago = 'horas'
       UNION ALL
       SELECT compensa_jornada_id, 0, compensa_minutos FROM dias WHERE usuario_id = $1 AND tipo = 'compensado'
       UNION ALL
       SELECT j.id, j.domingo_medios * j.minutos_dia / 2, 0 FROM dias d JOIN jornadas j ON j.id = d.jornada_id
       WHERE d.usuario_id = $1 AND d.tipo = 'trabajo' AND extract(isodow FROM d.fecha) = 7 AND j.domingo = 'libres'
     ) x GROUP BY jornada_id`,
    [req.usuario.id]
  );
  // Domingos trabajados en jornadas que los devuelven en días: suman a la bolsa.
  const { rows: [{ domingos }] } = await pool.query(
    `SELECT coalesce(sum(j.domingo_medios * j.minutos_dia / 2), 0)::int AS domingos FROM dias d JOIN jornadas j ON j.id = d.jornada_id
     WHERE d.usuario_id = $1 AND d.tipo = 'trabajo' AND extract(isodow FROM d.fecha) = 7 AND j.domingo = 'libres'`,
    [req.usuario.id]
  );
  r.bolsa_generadas += domingos;
  res.json({
    porJornada,
    dinero: { sinCobrar: r.sin_cobrar, cobradas: r.cobradas },
    bolsa: { generadas: r.bolsa_generadas, usadas: r.bolsa_usadas, saldo: r.bolsa_generadas - r.bolsa_usadas },
  });
}));

// Marcar como cobradas las extras pagadas de un rango (p. ej. al cobrar la nómina del mes).
router.post('/extras/cobrar', manejar(async (req, res) => {
  const [desde, hasta] = rango(req.body?.desde, req.body?.hasta);
  const { rowCount } = await pool.query(
    `UPDATE dias SET extra_cobrada = true
     WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3 AND extra_pago = 'dinero' AND NOT extra_cobrada`,
    [req.usuario.id, desde, hasta]
  );
  res.json({ marcados: rowCount });
}));

// Dejar el día sin cargar.
router.delete('/dias/:fecha', manejar(async (req, res) => {
  await pool.query('DELETE FROM dias WHERE usuario_id = $1 AND fecha = $2', [req.usuario.id, fecha(req.params.fecha)]);
  res.json({ ok: true });
}));

module.exports = router;
