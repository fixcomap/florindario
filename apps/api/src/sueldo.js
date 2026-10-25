// Tarifas del usuario para estimar el sueldo del mes (el cálculo lo hace el front
// con los días del mes). Importes en céntimos, porcentajes en centésimas.
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
  return t;
}

const SELECT = `SELECT modo, base_cent AS base, extra_cent AS extra, nocturna_cent AS nocturna, domingo_cent AS domingo,
  irpf_cent AS irpf, ss_cent AS ss FROM sueldos WHERE usuario_id = $1`;

const router = express.Router();
router.use('/sueldo', protegerApp);

router.get('/sueldo', async (req, res, next) => {
  try {
    const { rows } = await pool.query(SELECT, [req.usuario.id]);
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
});

router.put('/sueldo', async (req, res, next) => {
  try {
    const t = tarifas(req.body);
    await pool.query(
      `INSERT INTO sueldos (usuario_id, modo, base_cent, extra_cent, nocturna_cent, domingo_cent, irpf_cent, ss_cent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (usuario_id) DO UPDATE SET modo = EXCLUDED.modo, base_cent = EXCLUDED.base_cent, extra_cent = EXCLUDED.extra_cent,
         nocturna_cent = EXCLUDED.nocturna_cent, domingo_cent = EXCLUDED.domingo_cent, irpf_cent = EXCLUDED.irpf_cent,
         ss_cent = EXCLUDED.ss_cent, actualizado_en = now()`,
      [req.usuario.id, t.modo, t.base, t.extra, t.nocturna, t.domingo, t.irpf, t.ss]
    );
    res.json(t);
  } catch (err) {
    if (err instanceof Invalido) return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.delete('/sueldo', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sueldos WHERE usuario_id = $1', [req.usuario.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
