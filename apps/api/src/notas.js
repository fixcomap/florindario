// Notas del usuario: con fechas (una o varias) o generales de un mes.
// Cuota: 1000 notas por cuenta; 93 fechas por nota.
const express = require('express');
const pool = require('./db');
const { protegerApp } = require('./cuentas');
const { ErrorValidacion, fecha, fechaEditable, rango } = require('./validar');

const MAX_NOTAS = 1000;

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

const texto = (valor) => {
  const t = String(valor ?? '').trim();
  if (t.length < 1 || t.length > 500) throw new ErrorValidacion('nota: entre 1 y 500 caracteres');
  return t;
};
const mes = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}$/.test(valor)) throw new ErrorValidacion('mes: usá AAAA-MM');
  return fecha(`${valor}-01`, 'mes');
};
const id = (valor) => {
  if (!/^\d{1,18}$/.test(valor)) throw new ErrorValidacion('nota: no existe');
  return valor;
};

const SELECT = `SELECT n.id::text, n.texto, to_char(n.mes, 'YYYY-MM') AS mes,
    coalesce(array_agg(to_char(f.fecha, 'YYYY-MM-DD') ORDER BY f.fecha) FILTER (WHERE f.fecha IS NOT NULL), '{}') AS fechas
  FROM notas n LEFT JOIN notas_fechas f ON f.nota_id = n.id`;

async function una(usuarioId, notaId) {
  const { rows } = await pool.query(`${SELECT} WHERE n.usuario_id = $1 AND n.id = $2 GROUP BY n.id`, [usuarioId, notaId]);
  return rows[0];
}

const router = express.Router();
router.use('/notas', protegerApp);

// GET /notas?desde&hasta&mes=AAAA-MM: las que tienen alguna fecha en el rango y las generales del mes.
router.get('/notas', manejar(async (req, res) => {
  const [desde, hasta] = rango(req.query.desde, req.query.hasta);
  const m = mes(req.query.mes);
  const { rows } = await pool.query(
    `${SELECT} WHERE n.usuario_id = $1 AND (n.mes = $4 OR EXISTS (
       SELECT 1 FROM notas_fechas x WHERE x.nota_id = n.id AND x.fecha BETWEEN $2 AND $3))
     GROUP BY n.id ORDER BY min(f.fecha) NULLS LAST, n.creada_en`,
    [req.usuario.id, desde, hasta, m]
  );
  res.json(rows);
}));

// { texto, fechas: [...] } o { texto, mes: 'AAAA-MM' } (general).
router.post('/notas', manejar(async (req, res) => {
  const t = texto(req.body?.texto);
  const fechas = Array.isArray(req.body?.fechas) ? [...new Set(req.body.fechas)] : [];
  if (fechas.length > 93) throw new ErrorValidacion('como mucho 93 días por nota');
  fechas.forEach((f) => fechaEditable(f));
  const m = fechas.length ? null : mes(req.body?.mes);
  const { rows: [{ n }] } = await pool.query('SELECT count(*)::int AS n FROM notas WHERE usuario_id = $1', [req.usuario.id]);
  if (n >= MAX_NOTAS) throw new ErrorValidacion(`como mucho ${MAX_NOTAS} notas`);
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const { rows: [nota] } = await cliente.query('INSERT INTO notas (usuario_id, texto, mes) VALUES ($1, $2, $3) RETURNING id', [req.usuario.id, t, m]);
    if (fechas.length) await cliente.query('INSERT INTO notas_fechas (nota_id, fecha) SELECT $1, unnest($2::date[])', [nota.id, fechas]);
    await cliente.query('COMMIT');
    res.status(201).json(await una(req.usuario.id, nota.id));
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}));

router.put('/notas/:id', manejar(async (req, res) => {
  const { rowCount } = await pool.query('UPDATE notas SET texto = $3 WHERE id = $2 AND usuario_id = $1', [req.usuario.id, id(req.params.id), texto(req.body?.texto)]);
  if (!rowCount) return res.status(404).json({ error: 'No existe' });
  res.json(await una(req.usuario.id, req.params.id));
}));

router.delete('/notas/:id', manejar(async (req, res) => {
  await pool.query('DELETE FROM notas WHERE id = $2 AND usuario_id = $1', [req.usuario.id, id(req.params.id)]);
  res.json({ ok: true });
}));

// Quitar la nota de un día; si era su última fecha, la nota se borra.
router.delete('/notas/:id/fechas/:fecha', manejar(async (req, res) => {
  const notaId = id(req.params.id);
  const f = fecha(req.params.fecha);
  await pool.query(
    'DELETE FROM notas_fechas x USING notas n WHERE n.id = x.nota_id AND n.usuario_id = $1 AND x.nota_id = $2 AND x.fecha = $3',
    [req.usuario.id, notaId, f]
  );
  await pool.query(
    `DELETE FROM notas n WHERE n.id = $2 AND n.usuario_id = $1 AND n.mes IS NULL
       AND NOT EXISTS (SELECT 1 FROM notas_fechas x WHERE x.nota_id = n.id)`,
    [req.usuario.id, notaId]
  );
  res.json((await una(req.usuario.id, notaId)) || { id: notaId, borrada: true });
}));

module.exports = router;
