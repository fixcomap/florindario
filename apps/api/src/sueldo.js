// Tarifas del usuario para estimar el sueldo del mes (el cálculo lo hace el front
// con los días del mes). Importes en céntimos, porcentajes en centésimas. La base
// puede ser una por jornada (un mes puede mezclar jornadas de 20 h y de 40 h).
const express = require('express');
const pool = require('./db');
const { protegerApp } = require('./cuentas');

const CAMPOS = {
  base: [0, 100000000],
  extra: [0, 1000000],
  nocturna: [0, 1000000],
  domingo: [0, 1000000],
  irpf: [0, 6000],
  ss: [0, 3000],
};

class Invalido extends Error {}

function tarifas(body) {
  if (!['mensual', 'hora'].includes(body?.modo)) throw new Invalido('modo: mensual u hora');
  const t = { modo: body.modo };
  for (const [campo, [min, max]] of Object.entries(CAMPOS)) {
    const v = body[campo] ?? 0;
    if (!Number.isInteger(v) || v < min || v > max) throw new Invalido(`${campo}: valor fuera de rango`);
    t[campo] = v;
  }
  const porJornada = Array.isArray(body.jornadas) ? body.jornadas : [];
  if (porJornada.length > 20) throw new Invalido('jornadas: demasiadas');
  t.jornadas = porJornada.map((j) => {
    if (!/^\d{1,18}$/.test(String(j?.jornadaId ?? ''))) throw new Invalido('jornada: no existe');
    if (!['mensual', 'hora'].includes(j.modo)) throw new Invalido('modo: mensual u hora');
    if (!Number.isInteger(j.base) || j.base < 0 || j.base > 100000000) throw new Invalido('base: valor fuera de rango');
    const domingo = j.domingo ?? 0;
    if (!Number.isInteger(domingo) || domingo < 0 || domingo > 1000000) throw new Invalido('domingo: valor fuera de rango');
    if (!['dia', 'hora'].includes(j.domingoPor ?? 'dia')) throw new Invalido('domingo: por día o por hora');
    return { jornadaId: String(j.jornadaId), modo: j.modo, base: j.base, domingo, domingoPor: j.domingoPor ?? 'dia' };
  });
  return t;
}

const SELECT = `SELECT modo, base_cent AS base, extra_cent AS extra, nocturna_cent AS nocturna, domingo_cent AS domingo,
  irpf_cent AS irpf, ss_cent AS ss FROM sueldos WHERE usuario_id = $1`;

const router = express.Router();
router.use('/sueldo', protegerApp);

router.get('/sueldo', async (req, res, next) => {
  try {
    const { rows } = await pool.query(SELECT, [req.usuario.id]);
    if (!rows.length) return res.json(null);
    const { rows: jornadas } = await pool.query(
      `SELECT jornada_id::text AS "jornadaId", modo, base_cent AS base, domingo_cent AS domingo, domingo_por AS "domingoPor"
       FROM sueldos_jornadas WHERE usuario_id = $1`, [req.usuario.id]);
    res.json({ ...rows[0], jornadas });
  } catch (err) {
    next(err);
  }
});

router.put('/sueldo', async (req, res, next) => {
  try {
    const t = tarifas(req.body);
    if (t.jornadas.length) {
      const { rows: [{ n }] } = await pool.query('SELECT count(*)::int AS n FROM jornadas WHERE usuario_id = $1 AND id = ANY($2::bigint[])',
        [req.usuario.id, t.jornadas.map((j) => j.jornadaId)]);
      if (n !== new Set(t.jornadas.map((j) => j.jornadaId)).size) throw new Invalido('jornada: no existe');
    }
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query('DELETE FROM sueldos_jornadas WHERE usuario_id = $1', [req.usuario.id]);
      for (const j of t.jornadas) {
        await cliente.query('INSERT INTO sueldos_jornadas (usuario_id, jornada_id, modo, base_cent, domingo_cent, domingo_por) VALUES ($1, $2, $3, $4, $5, $6)',
          [req.usuario.id, j.jornadaId, j.modo, j.base, j.domingo, j.domingoPor]);
      }
      await cliente.query(
      `INSERT INTO sueldos (usuario_id, modo, base_cent, extra_cent, nocturna_cent, domingo_cent, irpf_cent, ss_cent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (usuario_id) DO UPDATE SET modo = EXCLUDED.modo, base_cent = EXCLUDED.base_cent, extra_cent = EXCLUDED.extra_cent,
         nocturna_cent = EXCLUDED.nocturna_cent, domingo_cent = EXCLUDED.domingo_cent, irpf_cent = EXCLUDED.irpf_cent,
         ss_cent = EXCLUDED.ss_cent, actualizado_en = now()`,
        [req.usuario.id, t.modo, t.base, t.extra, t.nocturna, t.domingo, t.irpf, t.ss]
      );
      await cliente.query('COMMIT');
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw err;
    } finally {
      cliente.release();
    }
    res.json(t);
  } catch (err) {
    if (err instanceof Invalido) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.delete('/sueldo', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sueldos WHERE usuario_id = $1', [req.usuario.id]);
    await pool.query('DELETE FROM sueldos_jornadas WHERE usuario_id = $1', [req.usuario.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
