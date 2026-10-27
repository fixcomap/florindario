const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const pool = require('./db');
const auth = require('./auth');
const dias = require('./dias');
const cuentas = require('./cuentas');
const plantillas = require('./plantillas');
const notas = require('./notas');
const jornadas = require('./jornadas');
const sueldo = require('./sueldo');

const app = express();

// Cloud Run: un solo proxy (Google) delante; sin esto req.ip sería el del proxy.
if (process.env.K_SERVICE) app.set('trust proxy', 1);

app.use(helmet());
// El front vive en otro subdominio (Pages): solo ese origen, con cookies.
app.use(cors({ origin: [config.frontUrl], credentials: true }));
// Límite por IP para todo (lecturas incluidas: leer la sesión ya consulta la base);
// las escrituras tienen además su límite por usuario (cuentas.js).
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 900,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones seguidas. Esperá unos minutos.' },
}));
// CSRF: una escritura desde un navegador trae Origin; si no es el front, se rechaza.
// Además: cookies SameSite=lax, CORS solo para el front y cuerpos solo en JSON.
app.use((req, res, next) => {
  const origen = req.get('Origin');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (origen && origen !== config.frontUrl) return res.status(403).json({ error: 'Origen no permitido' });
  // Segunda capa: un formulario de otro sitio no puede mandar JSON sin pasar por CORS.
  if (req.headers['content-length'] > 0 && !req.is('application/json')) return res.status(415).json({ error: 'Solo se acepta JSON' });
  next();
});
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(auth.leerSesion);

// Cloud Run y el smoke test del pipeline: la API ve la base.
app.get('/salud', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    console.error(`salud: ${err.message}`);
    res.status(503).json({ ok: false });
  }
});

app.use('/auth', auth.router);
app.use(cuentas.router);
app.use(dias);
app.use(plantillas);
app.use(notas);
app.use(jornadas);
app.use(sueldo);

app.use((req, res) => res.status(404).json({ error: 'No existe' }));

// Nunca el detalle al cliente: va al log de Cloud Run.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Algo salió mal. Probá de nuevo en un rato.' });
});

app.listen(config.puerto, () => {
  console.log(`API escuchando en el puerto ${config.puerto}`);
});
