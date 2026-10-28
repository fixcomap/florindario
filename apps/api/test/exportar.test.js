const test = require('node:test');
const assert = require('node:assert');
const { PassThrough } = require('node:stream');
const { firmar, verificar, pedido, calendarioIcs, semanasDelMes, pdfMes } = require('../src/exportar');

test('enlace firmado: vale 5 minutos y no se puede alterar', () => {
  const ahora = Date.parse('2026-10-28T10:00:00Z');
  const token = firmar({ usuarioId: 7, formato: 'ics', desde: '2026-01-01', hasta: '2026-12-31' }, ahora);
  assert.deepStrictEqual(verificar(token, ahora + 60000), { usuarioId: 7, formato: 'ics', desde: '2026-01-01', hasta: '2026-12-31' });
  assert.strictEqual(verificar(token, ahora + 5 * 60000 + 1), null);
  const [datos, firma] = token.split('.');
  const otro = Buffer.from(JSON.stringify([8, 'ics', '2026-01-01', '2026-12-31', ahora + 300000])).toString('base64url');
  assert.strictEqual(verificar(`${otro}.${firma}`, ahora), null);
  assert.strictEqual(verificar(`${datos}.x${firma.slice(1)}`, ahora), null);
  assert.strictEqual(verificar('basura', ahora), null);
});

test('pedido: formato y rango acotados; el PDF es un mes entero', () => {
  assert.deepStrictEqual(pedido({ formato: 'ics', desde: '2026-01-01', hasta: '2026-12-31' }), { formato: 'ics', desde: '2026-01-01', hasta: '2026-12-31' });
  assert.ok(pedido({ formato: 'pdf', desde: '2026-02-01', hasta: '2026-02-28' }));
  assert.throws(() => pedido({ formato: 'csv', desde: '2026-01-01', hasta: '2026-01-02' }), /formato/);
  assert.throws(() => pedido({ formato: 'ics', desde: '2026-01-01', hasta: '2027-01-02' }), /rango/);
  assert.throws(() => pedido({ formato: 'ics', desde: '2026-02-01', hasta: '2026-01-01' }), /rango/);
  assert.throws(() => pedido({ formato: 'pdf', desde: '2026-02-03', hasta: '2026-02-28' }), /mes entero/);
  assert.throws(() => pedido({ formato: 'pdf', desde: '2026-01-15', hasta: '2026-02-01' }), /mes entero/);
});

test('ics: un evento por tramo o día, de noche cruza al día siguiente, texto escapado', () => {
  const lineas = calendarioIcs([
    { fecha: '2026-03-03', tipo: 'vacaciones', tramos: [] },
    { fecha: '2026-03-02', tipo: 'trabajo', jornadaId: '2', tramos: [{ inicio: '09:00', fin: '13:00' }, { inicio: '22:00', fin: '06:00' }] },
    { fecha: '2026-03-04', tipo: 'trabajo', tramos: [{ inicio: '08:00', fin: '15:00' }] },
    { fecha: '2026-03-05', tipo: 'desconocido', tramos: [] },
  ], [{ id: '2', nombre: 'Turno; noche, extra' }], new Date('2026-10-28T10:00:00Z')).split('\r\n');
  assert.strictEqual(lineas.filter((l) => l === 'BEGIN:VEVENT').length, 4);
  for (const l of ['DTSTAMP:20261028T100000Z', 'DTSTART:20260302T090000', 'DTEND:20260302T130000', 'DTEND:20260303T060000',
    'SUMMARY:Turno\\; noche\\, extra', 'SUMMARY:Trabajo', 'DTSTART;VALUE=DATE:20260303', 'DTEND;VALUE=DATE:20260304', 'SUMMARY:Vacaciones', 'TRANSP:TRANSPARENT']) {
    assert.ok(lineas.includes(l), l);
  }
  assert.ok(lineas.indexOf('UID:2026-03-02-0@florindario.fixcomap.com') < lineas.indexOf('UID:2026-03-03-0@florindario.fixcomap.com'));
  assert.strictEqual(lineas.at(-2), 'END:VCALENDAR');
});

test('semanas del mes: de lunes a domingo', () => {
  const s = semanasDelMes(2026, 1); // febrero 2026 empieza en domingo
  assert.strictEqual(s[0][0], '2026-01-26');
  assert.strictEqual(s.at(-1)[6], '2026-03-01');
  assert.strictEqual(s.length, 5);
});

test('pdf del mes: genera un PDF', async () => {
  const salida = new PassThrough();
  const partes = [];
  salida.on('data', (b) => partes.push(b));
  const fin = new Promise((r) => salida.on('end', r));
  pdfMes(salida, {
    anio: 2026, mes: 9, jornadas: [{ id: '1', nombre: 'J20' }],
    dias: [{ fecha: '2026-10-01', tipo: 'trabajo', jornadaId: '1', tramos: [{ inicio: '08:45', fin: '12:00' }] }, { fecha: '2026-10-02', tipo: 'libre', tramos: [] }],
  });
  await fin;
  const pdf = Buffer.concat(partes);
  assert.strictEqual(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 1000);
});
