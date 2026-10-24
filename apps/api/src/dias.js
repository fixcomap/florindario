// Días del calendario de cada usuario: leer un rango, guardar un día y borrarlo.
const express = require('express');
const pool = require('./db');
const { protegerApp } = require('./cuentas');
const { ErrorValidacion, fecha, fechaEditable, dia, rango, lote } = require('./validar');

const COLUMNAS = `to_char(fecha, 'YYYY-MM-DD') AS fecha, tipo, tramos, nota, extra_minutos, extra_pago, extra_cobrada, compensa_minutos`;

// Fila de la base -> día del front.
const aDia = (f) => ({
  fecha: f.fecha,
  tipo: f.tipo,
  tramos: f.tramos,
  nota: f.nota,
  extra: f.extra_minutos ? { minutos: f.extra_minutos, pago: f.extra_pago, cobrada: f.extra_cobrada } : null,
  compensa: f.compensa_minutos,
});

const GUARDAR = `INSERT INTO dias (usuario_id, fecha, tipo, tramos, nota, extra_minutos, extra_pago, extra_cobrada, compensa_minutos)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (usuario_id, fecha) DO UPDATE SET tipo = EXCLUDED.tipo, tramos = EXCLUDED.tramos, nota = EXCLUDED.nota,
    extra_minutos = EXCLUDED.extra_minutos, extra_pago = EXCLUDED.extra_pago, extra_cobrada = EXCLUDED.extra_cobrada,
    compensa_minutos = EXCLUDED.compensa_minutos
  RETURNING ${COLUMNAS}`;
const valores = (usuarioId, f, d) => [usuarioId, f, d.tipo, JSON.stringify(d.tramos), d.nota,
  d.extra?.minutos ?? 0, d.extra?.pago ?? null, d.extra?.cobrada ?? false, d.compensa];

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
  const { rows } = await pool.query(GUARDAR, valores(req.usuario.id, f, d));
  res.json(aDia(rows[0]));
}));

// Varios días de una vez (selección múltiple o plantilla aplicada), en una transacción.
router.put('/dias', manejar(async (req, res) => {
  const { dias, borrar } = lote(req.body);
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
  res.json({
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
