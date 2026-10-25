// Notas del usuario: con fechas (una o varias) o generales de un mes. Fijada:
// se ve desde el mes en que se fijó hasta el anterior al que se le quitó el pin.
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

// $2 = mes que se mira (primer día): "fijada" es si está fijada en ese mes.
const FIJADA_EN = `EXISTS (SELECT 1 FROM notas_pines p WHERE p.nota_id = n.id AND p.desde <= $2 AND (p.hasta IS NULL OR $2 < p.hasta))`;
const SELECT = `SELECT n.id::text, n.texto, ${FIJADA_EN} AS fijada, to_char(n.mes, 'YYYY-MM') AS mes,
    coalesce(array_agg(to_char(f.fecha, 'YYYY-MM-DD') ORDER BY f.fecha) FILTER (WHERE f.fecha IS NOT NULL), '{}') AS fechas
  FROM notas n LEFT JOIN notas_fechas f ON f.nota_id = n.id`;

async function una(usuarioId, notaId, m) {
  const { rows } = await pool.query(`${SELECT} WHERE n.usuario_id = $1 AND n.id = $3 GROUP BY n.id`, [usuarioId, m, notaId]);
  return rows[0];
}

const router = express.Router();
router.use('/notas', protegerApp);

// GET /notas?desde&hasta&mes=AAAA-MM: las que tienen alguna fecha en el rango, las generales del mes y las fijadas.
router.get('/notas', manejar(async (req, res) => {
  const [desde, hasta] = rango(req.query.desde, req.query.hasta);
  const m = mes(req.query.mes);
  const { rows } = await pool.query(
    `${SELECT} WHERE n.usuario_id = $1 AND (${FIJADA_EN} OR n.mes = $2 OR EXISTS (
       SELECT 1 FROM notas_fechas x WHERE x.nota_id = n.id AND x.fecha BETWEEN $3 AND $4))
     GROUP BY n.id ORDER BY 3 DESC, min(f.fecha) NULLS LAST, n.creada_en`,
    [req.usuario.id, m, desde, hasta]
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
    // Fijada al crearla: desde su mes (el general, o el de su primer día).
    const desdeFijada = req.body?.fijada === true ? (m || `${[...fechas].sort()[0].slice(0, 7)}-01`) : null;
    const { rows: [nota] } = await cliente.query('INSERT INTO notas (usuario_id, texto, mes) VALUES ($1, $2, $3) RETURNING id', [req.usuario.id, t, m]);
    if (desdeFijada) await cliente.query('INSERT INTO notas_pines (nota_id, desde) VALUES ($1, $2)', [nota.id, desdeFijada]);
    if (fechas.length) await cliente.query('INSERT INTO notas_fechas (nota_id, fecha) SELECT $1, unnest($2::date[])', [nota.id, fechas]);
    await cliente.query('COMMIT');
    res.status(201).json(await una(req.usuario.id, nota.id, m || desdeFijada || `${[...fechas].sort()[0].slice(0, 7)}-01`));
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}));

// { texto?, fijada?, mes: 'AAAA-MM' (el que se mira) }. Fijar: abre un tramo
// desde ese mes; quitar el pin: deja de verse desde ese mes en adelante, los
// meses anteriores la conservan.
router.put('/notas/:id', manejar(async (req, res) => {
  const t = req.body?.texto === undefined ? null : texto(req.body.texto);
  const fijada = typeof req.body?.fijada === 'boolean' ? req.body.fijada : null;
  if (t === null && fijada === null) throw new ErrorValidacion('nada que cambiar');
  const m = mes(req.body?.mes);
  const notaId = id(req.params.id);
  const { rowCount } = await pool.query('UPDATE notas SET texto = coalesce($3, texto) WHERE id = $2 AND usuario_id = $1', [req.usuario.id, notaId, t]);
  if (!rowCount) return res.status(404).json({ error: 'No existe' });
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    if (fijada !== null) {
      // Desde este mes en adelante manda lo nuevo: se cortan o quitan los tramos que lo cubren.
      await cliente.query('DELETE FROM notas_pines WHERE nota_id = $1 AND desde >= $2', [notaId, m]);
      await cliente.query('UPDATE notas_pines SET hasta = $2 WHERE nota_id = $1 AND (hasta IS NULL OR hasta > $2)', [notaId, m]);
    }
    if (fijada === true) {
      // Si el tramo anterior acababa justo este mes, se continúa; si no, uno nuevo.
      const { rowCount: seguido } = await cliente.query('UPDATE notas_pines SET hasta = NULL WHERE nota_id = $1 AND hasta = $2', [notaId, m]);
      if (!seguido) await cliente.query('INSERT INTO notas_pines (nota_id, desde) VALUES ($1, $2)', [notaId, m]);
    }
    await cliente.query('COMMIT');
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
  res.json(await una(req.usuario.id, notaId, m));
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
  res.json((await una(req.usuario.id, notaId, `${f.slice(0, 7)}-01`)) || { id: notaId, borrada: true });
}));

module.exports = router;
