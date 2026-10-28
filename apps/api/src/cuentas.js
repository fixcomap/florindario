// Cuentas en modo abierto (estándar de fixcomap): cualquiera entra con Google y
// la protección es automática, sin aprobar a nadie a mano:
//   - alta: el primer login crea la cuenta "pendiente"; para usar la app hay que
//     aceptar términos y privacidad (-> "activa").
//   - tope global de altas por hora: frena una avalancha de registros.
//   - límite de escrituras por usuario (por instancia) y, si una cuenta supera
//     un umbral por hora, suspensión automática con alerta en el log.
//   - "borrar mi cuenta": se borra todo lo suyo (ON DELETE CASCADE).
const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('./db');
const { requiereSesion, cerrarSesion, vacaciones: verVacaciones } = require('./auth');

const LIMITES = {
  altasPorHora: Number(process.env.ALTAS_POR_HORA || 30),
  escriturasPorHora: Number(process.env.ESCRITURAS_POR_HORA || 1500),
};

class AltasCerradas extends Error {}

// Antes de crear una cuenta nueva: ¿quedan altas esta hora?
async function comprobarAltas() {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM usuarios WHERE creado_en > now() - interval '1 hour'");
  if (rows[0].n >= LIMITES.altasPorHora) {
    console.error(JSON.stringify({ alerta: 'tope_altas', altas_ultima_hora: rows[0].n }));
    throw new AltasCerradas();
  }
}

// Alerta estructurada: la recoge el log de Cloud Run (y Grafana, cuando se monte).
const alerta = (tipo, datos) => console.error(JSON.stringify({ alerta: tipo, ...datos }));

// Para las rutas de la app: sesión y cuenta activa.
function requiereActiva(req, res, next) {
  requiereSesion(req, res, () => {
    if (req.usuario.estado === 'activa') return next();
    if (req.usuario.estado === 'pendiente') return res.status(403).json({ error: 'Terminá el alta para usar la app', codigo: 'alta_pendiente' });
    return res.status(403).json({ error: 'Tu cuenta está suspendida. Escribinos a contacto@fixcomap.com.', codigo: 'suspendida' });
  });
}

// Límite por usuario para lo que crea o cambia datos (además del de cada ruta).
const limitadorEscrituras = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  keyGenerator: (req) => `u${req.usuario?.id}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados cambios seguidos. Esperá unos minutos.' },
});

// Cuenta cada escritura por hora; pasado el umbral, suspende la cuenta.
async function contarEscritura(req, res, next) {
  if (req.method === 'GET' || !req.usuario) return next();
  try {
    const { rows } = await pool.query(
      `INSERT INTO actividad (usuario_id, hora, escrituras) VALUES ($1, date_trunc('hour', now()), 1)
       ON CONFLICT (usuario_id, hora) DO UPDATE SET escrituras = actividad.escrituras + 1
       RETURNING escrituras`,
      [req.usuario.id]
    );
    if (rows[0].escrituras > LIMITES.escriturasPorHora) {
      await pool.query(
        "UPDATE usuarios SET estado = 'suspendida', suspendida_motivo = 'actividad anómala' WHERE id = $1 AND estado <> 'suspendida'",
        [req.usuario.id]
      );
      alerta('cuenta_suspendida', { usuario_id: req.usuario.id, escrituras_hora: rows[0].escrituras });
      return res.status(403).json({ error: 'Tu cuenta está suspendida. Escribinos a contacto@fixcomap.com.', codigo: 'suspendida' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Middleware para las rutas de datos de la app.
const protegerApp = [requiereActiva, limitadorEscrituras, contarEscritura];

const router = express.Router();

// Terminar el alta: nombre visible y aceptar términos y privacidad.
router.post('/cuenta/alta', requiereSesion, async (req, res, next) => {
  try {
    if (req.usuario.estado !== 'pendiente') return res.status(409).json({ error: 'Tu cuenta ya está dada de alta' });
    const nombre = String(req.body?.nombre ?? '').replace(/\s+/g, ' ').trim();
    if (nombre.length < 2 || nombre.length > 40) return res.status(400).json({ error: 'nombre: entre 2 y 40 caracteres' });
    if (req.body?.acepto !== true) return res.status(400).json({ error: 'Tenés que aceptar los términos y la política de privacidad' });
    await pool.query(
      "UPDATE usuarios SET estado = 'activa', nombre = $2, terminos_aceptados_en = now() WHERE id = $1",
      [req.usuario.id, nombre]
    );
    res.json({ nombre, email: req.usuario.email, estado: 'activa', bolsa: req.usuario.bolsa, ...verVacaciones(req.usuario) });
  } catch (err) {
    next(err);
  }
});

// Ajustes: cómo le devuelven las horas extra y cuántos días de vacaciones tiene al año.
// Se manda solo lo que cambia; lo que no viene se queda como está.
router.put('/cuenta/ajustes', requiereActiva, async (req, res, next) => {
  try {
    const bolsa = req.body?.bolsa ?? req.usuario.bolsa;
    if (!['horas', 'jornadas', 'ninguna'].includes(bolsa)) return res.status(400).json({ error: 'bolsa: horas, jornadas o ninguna' });
    const u = {
      vacaciones_anuales: req.body?.vacacionesAnuales ?? req.usuario.vacaciones_anuales,
      vacaciones_computo: req.body?.vacacionesComputo ?? req.usuario.vacaciones_computo,
      dias_disposicion: req.body?.diasDisposicion ?? req.usuario.dias_disposicion,
    };
    const entero = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
    if (!entero(u.vacaciones_anuales, 60)) return res.status(400).json({ error: 'vacaciones al año: entre 0 y 60 días' });
    if (!['habiles', 'naturales'].includes(u.vacaciones_computo)) return res.status(400).json({ error: 'vacaciones: hábiles o naturales' });
    if (!entero(u.dias_disposicion, 10)) return res.status(400).json({ error: 'libre disposición: entre 0 y 10 días' });
    await pool.query(
      'UPDATE usuarios SET bolsa = $2, vacaciones_anuales = $3, vacaciones_computo = $4, dias_disposicion = $5 WHERE id = $1',
      [req.usuario.id, bolsa, u.vacaciones_anuales, u.vacaciones_computo, u.dias_disposicion]
    );
    res.json({ bolsa, ...verVacaciones(u) });
  } catch (err) {
    next(err);
  }
});

// Borrar la cuenta y todo lo suyo (calendario, semanas tipo, sesiones).
router.delete('/cuenta', requiereSesion, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.usuario.id]);
    cerrarSesion(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = { router, protegerApp, requiereActiva, comprobarAltas, AltasCerradas, LIMITES };
