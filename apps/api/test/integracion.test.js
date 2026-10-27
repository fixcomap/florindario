// Integración: la API de verdad contra Postgres (el pipeline levanta uno y aplica las
// migraciones). Sin DATABASE_URL (en local, normalmente) se salta.
const test = require('node:test');
const assert = require('node:assert');

const conBase = Boolean(process.env.DATABASE_URL);
process.env.DEV_USER = `prueba-${Date.now()}@ejemplo.com`;
const FRONT = 'http://localhost:5173';

test('API contra Postgres', { skip: !conBase && 'sin DATABASE_URL' }, async (t) => {
  const app = require('../src/index');
  const pool = require('../src/db');
  const servidor = app.listen(0);
  const base = `http://localhost:${servidor.address().port}`;
  t.after(async () => { servidor.close(); await pool.end(); });

  const login = await fetch(`${base}/auth/login`, { redirect: 'manual' });
  const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  assert.ok(cookie.includes('='), 'el login de desarrollo da cookie de sesión');
  const pedir = async (ruta, { method = 'GET', body, headers = {} } = {}) => {
    const r = await fetch(`${base}${ruta}`, {
      method,
      headers: { cookie, Origin: FRONT, ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };

  await t.test('salud: la API ve la base', async () => {
    assert.strictEqual((await pedir('/salud')).status, 200);
  });

  await t.test('alta y ajustes de vacaciones', async () => {
    await pedir('/cuenta/alta', { method: 'POST', body: { nombre: 'Prueba', acepto: true } });
    const ok = await pedir('/cuenta/ajustes', { method: 'PUT', body: { vacacionesAnuales: 22, vacacionesComputo: 'habiles', diasDisposicion: 1 } });
    assert.strictEqual(ok.status, 200);
    assert.deepStrictEqual(ok.json, { bolsa: 'jornadas', vacacionesAnuales: 22, vacacionesComputo: 'habiles', diasDisposicion: 1 });
    assert.strictEqual((await pedir('/cuenta/ajustes', { method: 'PUT', body: { vacacionesAnuales: 99 } })).status, 400);
  });

  await t.test('días y resumen del año: hábiles o naturales', async () => {
    const jornada = await pedir('/jornadas', { method: 'POST', body: { nombre: 'Jornada prueba', minutosDia: 240 } });
    assert.strictEqual(jornada.status, 201);
    const lote = await pedir('/dias', {
      method: 'PUT',
      body: {
        dias: [
          { fecha: '2026-03-02', tipo: 'trabajo', tramos: [{ inicio: '09:00', fin: '13:00' }], jornadaId: jornada.json.id },
          { fecha: '2026-03-03', tipo: 'vacaciones', tramos: [] },
          { fecha: '2026-03-07', tipo: 'vacaciones', tramos: [] }, // sábado: no gasta en hábiles
          { fecha: '2026-03-04', tipo: 'disposicion', tramos: [] },
        ],
      },
    });
    assert.strictEqual(lote.status, 200);
    let r = await pedir('/resumen?anio=2026');
    assert.strictEqual(r.json.dias.vacaciones, 1);
    assert.strictEqual(r.json.dias.disposicion, 1);
    assert.strictEqual(r.json.meses[2].minutos, 240);
    await pedir('/cuenta/ajustes', { method: 'PUT', body: { vacacionesComputo: 'naturales' } });
    r = await pedir('/resumen?anio=2026');
    assert.strictEqual(r.json.dias.vacaciones, 2);
    assert.strictEqual((await pedir('/resumen?anio=abc')).status, 400);
  });

  await t.test('CSRF: otro origen 403, cuerpo que no es JSON 415', async () => {
    const nota = { texto: 'x', mes: '2026-03' };
    assert.strictEqual((await pedir('/notas', { method: 'POST', body: nota, headers: { Origin: 'https://evil.example' } })).status, 403);
    assert.strictEqual((await pedir('/notas', { method: 'POST', body: 'texto=x', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status, 415);
    assert.strictEqual((await pedir('/notas', { method: 'POST', body: nota })).status, 201);
  });

  await t.test('borrar la cuenta deja la base limpia', async () => {
    assert.strictEqual((await pedir('/cuenta', { method: 'DELETE' })).status, 200);
    assert.strictEqual((await pedir('/resumen?anio=2026')).status, 401);
  });
});
