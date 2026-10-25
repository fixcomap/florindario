// Jornadas del usuario: nombre y duración de un día de esa jornada. Cuota: 20.
const express = require('express');
const pool = require('./db');
const { protegerApp } = require('./cuentas');
const { ErrorValidacion } = require('./validar');

const MAX_JORNADAS = 20;

function manejar(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
      if (err.code === '23505') return res.status(409).json({ error: 'Ya tenés una jornada con ese nombre' });
      next(err);
    }
  };
}

function jornada(body) {
  const nombre = String(body?.nombre ?? '').replace(/\s+/g, ' ').trim();
  if (nombre.length < 2 || nombre.length > 40) throw new ErrorValidacion('nombre: entre 2 y 40 caracteres');
  const m = body?.minutosDia;
  if (!Number.isInteger(m) || m < 15 || m > 1440) throw new ErrorValidacion('duración del día: entre 15 minutos y 24 horas');
  return { nombre, minutosDia: m };
}
const id = (valor) => {
  if (!/^\d{1,18}$/.test(valor)) throw new ErrorValidacion('jornada: no existe');
  return valor;
};
const COLS = 'id::text, nombre, minutos_dia AS "minutosDia"';

const router = express.Router();
router.use('/jornadas', protegerApp);

router.get('/jornadas', manejar(async (req, res) => {
  const { rows } = await pool.query(`SELECT ${COLS} FROM jornadas WHERE usuario_id = $1 ORDER BY minutos_dia, lower(nombre)`, [req.usuario.id]);
  res.json(rows);
}));

router.post('/jornadas', manejar(async (req, res) => {
  const j = jornada(req.body);
  const { rows: [{ n }] } = await pool.query('SELECT count(*)::int AS n FROM jornadas WHERE usuario_id = $1', [req.usuario.id]);
  if (n >= MAX_JORNADAS) throw new ErrorValidacion(`como mucho ${MAX_JORNADAS} jornadas`);
  const { rows } = await pool.query(`INSERT INTO jornadas (usuario_id, nombre, minutos_dia) VALUES ($1, $2, $3) RETURNING ${COLS}`, [req.usuario.id, j.nombre, j.minutosDia]);
  res.status(201).json(rows[0]);
}));

router.put('/jornadas/:id', manejar(async (req, res) => {
  const j = jornada(req.body);
  const { rows } = await pool.query(`UPDATE jornadas SET nombre = $3, minutos_dia = $4 WHERE id = $2 AND usuario_id = $1 RETURNING ${COLS}`,
    [req.usuario.id, id(req.params.id), j.nombre, j.minutosDia]);
  if (!rows.length) return res.status(404).json({ error: 'No existe' });
  res.json(rows[0]);
}));

// Sus plantillas quedan "sin jornada" (ON DELETE SET NULL).
router.delete('/jornadas/:id', manejar(async (req, res) => {
  await pool.query('DELETE FROM jornadas WHERE id = $2 AND usuario_id = $1', [req.usuario.id, id(req.params.id)]);
  res.json({ ok: true });
}));

module.exports = router;
