// Login con Google (OAuth 2.0, flujo de código en el servidor).
// El front solo redirige a /auth/login; el secreto del cliente nunca sale de la API.
// Sesión: token al azar en una cookie httpOnly; en la base, solo su hash.
const crypto = require('crypto');
const express = require('express');
const config = require('./config');
const pool = require('./db');

const COOKIE_SESION = 'sesion';
const COOKIE_ESTADO = 'oauth_estado';
const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;
const URL_CALLBACK = `${config.apiUrl}/auth/callback`;

// Front (florindario.*) y API (api-florindario.*) son el mismo sitio (fixcomap.com):
// con SameSite=Lax la cookie viaja en los fetch del front y en la vuelta desde Google.
// Cookies: httpOnly, Secure siempre (los navegadores la aceptan en http://localhost) y
// SameSite=Lax; escritas en cada res.cookie para que el análisis estático las vea.

// Entorno restringido: solo los emails de ACCESO_EMAILS (sesiones viejas incluidas).
const puedeEntrar = (email) => !config.accesoEmails.length || config.accesoEmails.includes(String(email).toLowerCase());

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function abrirSesion(res, usuarioId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sesiones (token_hash, usuario_id, vence_en) VALUES ($1, $2, now() + $3 * interval '1 millisecond')`,
    [hash(token), usuarioId, DURACION_SESION_MS]
  );
  res.cookie(COOKIE_SESION, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: DURACION_SESION_MS });
}

// Cuenta existente: se actualiza el email (puede cambiar en Google), no el nombre
// (lo elige el usuario en el alta). Nueva: se crea "pendiente", si quedan altas.
async function entrar({ sub, email, nombre }) {
  const { rows } = await pool.query('UPDATE usuarios SET email = $2 WHERE google_sub = $1 RETURNING id', [sub, email]);
  if (rows.length) return rows[0].id;
  await require('./cuentas').comprobarAltas();
  const { rows: nuevos } = await pool.query(
    `INSERT INTO usuarios (google_sub, email, nombre) VALUES ($1, $2, $3)
     ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
    [sub, email, nombre]
  );
  return nuevos[0].id;
}

function cerrarSesion(res) {
  res.clearCookie(COOKIE_SESION, { path: '/' });
}

// Middleware: req.usuario si hay sesión válida (o null). requiereSesion corta con 401.
async function leerSesion(req, res, next) {
  req.usuario = null;
  const token = req.cookies?.[COOKIE_SESION];
  if (token && /^[0-9a-f]{64}$/.test(token)) {
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.email, u.nombre, u.estado, u.bolsa, u.vacaciones_anuales, u.vacaciones_computo, u.dias_disposicion FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
         WHERE s.token_hash = $1 AND s.vence_en > now()`,
        [hash(token)]
      );
      req.usuario = rows[0] && puedeEntrar(rows[0].email) ? rows[0] : null;
    } catch (err) {
      return next(err);
    }
  }
  next();
}

function requiereSesion(req, res, next) {
  if (!req.usuario) return res.status(401).json({ error: 'Tenés que entrar con tu cuenta de Google' });
  next();
}

const router = express.Router();

router.get('/login', async (req, res, next) => {
  try {
    // Desarrollo local sin cliente OAuth: entra directamente como DEV_USER.
    if (config.devUser && !config.googleClientId) {
      const id = await entrar({ sub: `dev:${config.devUser}`, email: config.devUser, nombre: config.devUser.split('@')[0] });
      await abrirSesion(res, id);
      return res.redirect(config.frontUrl);
    }
    const estado = crypto.randomBytes(16).toString('hex');
    res.cookie(COOKIE_ESTADO, estado, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 10 * 60 * 1000 });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: config.googleClientId,
      redirect_uri: URL_CALLBACK,
      response_type: 'code',
      scope: 'openid email profile',
      state: estado,
      prompt: 'select_account',
    });
    res.redirect(url.toString());
  } catch (err) {
    if (err instanceof require('./cuentas').AltasCerradas) return res.redirect(`${config.frontUrl}/?error=altas`);
    next(err);
  }
});

router.get('/callback', async (req, res, next) => {
  const volverConError = () => res.redirect(`${config.frontUrl}/?error=login`);
  try {
    const { code, state } = req.query;
    const esperado = req.cookies?.[COOKIE_ESTADO];
    res.clearCookie(COOKIE_ESTADO, { path: '/' });
    // El estado ata la vuelta de Google a este navegador (CSRF en el login).
    if (!code || !state || !esperado || typeof state !== 'string'
        || state.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(esperado))) {
      return volverConError();
    }

    const respToken = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: config.googleClientId,
        client_secret: config.googleClientSecret,
        redirect_uri: URL_CALLBACK,
        grant_type: 'authorization_code',
      }),
    });
    if (!respToken.ok) {
      console.error(`login: Google rechazó el código (${respToken.status})`);
      return volverConError();
    }
    const { access_token: accessToken } = await respToken.json();
    const respPerfil = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const perfil = respPerfil.ok ? await respPerfil.json() : null;
    if (!perfil?.sub || !perfil.email || perfil.email_verified !== true) return volverConError();
    if (!puedeEntrar(perfil.email)) {
      console.warn('login: email fuera de ACCESO_EMAILS');
      return res.redirect(`${config.frontUrl}/?error=acceso`);
    }

    const id = await entrar({ sub: perfil.sub, email: perfil.email, nombre: perfil.name || perfil.email.split('@')[0] });
    await abrirSesion(res, id);
    res.redirect(config.frontUrl);
  } catch (err) {
    if (err instanceof require('./cuentas').AltasCerradas) return res.redirect(`${config.frontUrl}/?error=altas`);
    next(err);
  }
});

// Ajustes de vacaciones tal como los ve el front.
const vacaciones = (u) => ({ vacacionesAnuales: u.vacaciones_anuales, vacacionesComputo: u.vacaciones_computo, diasDisposicion: u.dias_disposicion });

router.get('/yo', (req, res) => {
  if (!req.usuario) return res.status(401).json({ error: 'Sin sesión' });
  res.json({ nombre: req.usuario.nombre, email: req.usuario.email, estado: req.usuario.estado, bolsa: req.usuario.bolsa, ...vacaciones(req.usuario) });
});

router.post('/salir', async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_SESION];
    if (token) await pool.query('DELETE FROM sesiones WHERE token_hash = $1', [hash(token)]);
    cerrarSesion(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = { vacaciones, router, leerSesion, requiereSesion, cerrarSesion };
