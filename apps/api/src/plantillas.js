// Plantillas de horario (tabla semanas_tipo): una semana de lunes a domingo que
// se aplica a los días elegidos en el calendario. Cuota: 30 por cuenta.
const express = require('express');
const pool = require('./db');
const { protegerApp } = require('./cuentas');
const { ErrorValidacion, plantilla } = require('./validar');

const MAX_PLANTILLAS = 30;

function manejar(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErrorValidacion) return res.status(400).json({ error: err.message });
      if (err.code === '23505') return res.status(409).json({ error: 'Ya tenés una plantilla con ese nombre' });
      next(err);
    }
  };
}

const id = (valor) => {
  if (!/^\d{1,18}$/.test(valor)) throw new ErrorValidacion('plantilla: no existe');
  return valor;
};

const router = express.Router();
router.use('/plantillas', protegerApp);

router.get('/plantillas', manejar(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id::text, nombre, dias FROM semanas_tipo WHERE usuario_id = $1 ORDER BY lower(nombre)',
    [req.usuario.id]
  );
  res.json(rows);
}));

router.post('/plantillas', manejar(async (req, res) => {
  const p = plantilla(req.body);
  const { rows: [{ n }] } = await pool.query('SELECT count(*)::int AS n FROM semanas_tipo WHERE usuario_id = $1', [req.usuario.id]);
  if (n >= MAX_PLANTILLAS) throw new ErrorValidacion(`como mucho ${MAX_PLANTILLAS} plantillas`);
  const { rows } = await pool.query(
    'INSERT INTO semanas_tipo (usuario_id, nombre, dias) VALUES ($1, $2, $3) RETURNING id::text, nombre, dias',
    [req.usuario.id, p.nombre, JSON.stringify(p.dias)]
  );
  res.status(201).json(rows[0]);
}));

router.put('/plantillas/:id', manejar(async (req, res) => {
  const p = plantilla(req.body);
  const { rows } = await pool.query(
    'UPDATE semanas_tipo SET nombre = $3, dias = $4 WHERE id = $2 AND usuario_id = $1 RETURNING id::text, nombre, dias',
    [req.usuario.id, id(req.params.id), p.nombre, JSON.stringify(p.dias)]
  );
  if (!rows.length) return res.status(404).json({ error: 'No existe' });
  res.json(rows[0]);
}));

router.delete('/plantillas/:id', manejar(async (req, res) => {
  await pool.query('DELETE FROM semanas_tipo WHERE id = $2 AND usuario_id = $1', [req.usuario.id, id(req.params.id)]);
  res.json({ ok: true });
}));

module.exports = router;
