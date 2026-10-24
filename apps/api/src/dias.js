// Días del calendario de cada usuario: leer un rango, guardar un día y borrarlo.
const express = require('express');
const pool = require('./db');
const { requiereSesion } = require('./auth');
const { ErrorValidacion, fecha, dia, rango } = require('./validar');

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
router.use('/dias', requiereSesion);

// GET /dias?desde=2026-10-26&hasta=2026-12-06 (lo que muestra la cuadrícula del mes)
router.get('/dias', manejar(async (req, res) => {
  const [desde, hasta] = rango(req.query.desde, req.query.hasta);
  const { rows } = await pool.query(
    `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, tipo, tramos, nota FROM dias
     WHERE usuario_id = $1 AND fecha BETWEEN $2 AND $3 ORDER BY fecha`,
    [req.usuario.id, desde, hasta]
  );
  res.json(rows);
}));

router.put('/dias/:fecha', manejar(async (req, res) => {
  const f = fecha(req.params.fecha);
  const d = dia(req.body);
  const { rows } = await pool.query(
    `INSERT INTO dias (usuario_id, fecha, tipo, tramos, nota) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id, fecha) DO UPDATE SET tipo = EXCLUDED.tipo, tramos = EXCLUDED.tramos, nota = EXCLUDED.nota
     RETURNING to_char(fecha, 'YYYY-MM-DD') AS fecha, tipo, tramos, nota`,
    [req.usuario.id, f, d.tipo, JSON.stringify(d.tramos), d.nota]
  );
  res.json(rows[0]);
}));

// Dejar el día sin cargar.
router.delete('/dias/:fecha', manejar(async (req, res) => {
  await pool.query('DELETE FROM dias WHERE usuario_id = $1 AND fecha = $2', [req.usuario.id, fecha(req.params.fecha)]);
  res.json({ ok: true });
}));

module.exports = router;
