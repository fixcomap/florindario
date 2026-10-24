const test = require('node:test');
const assert = require('node:assert');
const { fecha, duracion, dia, rango, minutosDelDia, ErrorValidacion: E } = require('../src/validar');

test('fecha válida y existente', () => {
  assert.strictEqual(fecha('2026-11-02'), '2026-11-02');
  assert.throws(() => fecha('2026-02-30'), E);
  assert.throws(() => fecha('02/11/2026'), E);
});

test('duración de tramos, también de noche', () => {
  assert.strictEqual(duracion({ inicio: '09:00', fin: '13:00' }), 240);
  assert.strictEqual(duracion({ inicio: '22:00', fin: '06:00' }), 480);
  assert.strictEqual(duracion({ inicio: '09:30', fin: '13:10' }), 220);
});

test('día de trabajo con jornada partida', () => {
  const d = dia({ tipo: 'trabajo', tramos: [{ inicio: '09:00', fin: '13:00' }, { inicio: '17:00', fin: '21:00' }], nota: '  cubro a Ana ' });
  assert.deepStrictEqual(d.tramos.length, 2);
  assert.strictEqual(d.nota, 'cubro a Ana');
  assert.strictEqual(minutosDelDia(d), 480);
});

test('día libre o de vacaciones: sin tramos aunque los manden', () => {
  assert.deepStrictEqual(dia({ tipo: 'vacaciones', tramos: [{ inicio: '09:00', fin: '13:00' }] }).tramos, []);
  assert.strictEqual(minutosDelDia(dia({ tipo: 'libre' })), 0);
});

test('días inválidos', () => {
  for (const malo of [
    { tipo: 'fiesta' },
    { tipo: 'trabajo', tramos: [] },
    { tipo: 'trabajo', tramos: [{ inicio: '9:00', fin: '13:00' }] },
    { tipo: 'trabajo', tramos: [{ inicio: '25:00', fin: '13:00' }] },
    { tipo: 'trabajo', tramos: [{ inicio: '09:00', fin: '09:00' }] },
    { tipo: 'trabajo', tramos: [1, 2, 3, 4].map(() => ({ inicio: '09:00', fin: '10:00' })) },
    { tipo: 'libre', nota: 'x'.repeat(201) },
  ]) assert.throws(() => dia(malo), E, JSON.stringify(malo));
});

test('rango de lectura', () => {
  assert.deepStrictEqual(rango('2026-10-26', '2026-12-06'), ['2026-10-26', '2026-12-06']);
  assert.throws(() => rango('2026-12-06', '2026-10-26'), E);
  assert.throws(() => rango('2026-01-01', '2026-12-31'), E);
});

test('cuota de fechas: de 3 años atrás a 2 adelante', () => {
  const { fechaEditable } = require('../src/validar');
  const hoy = new Date('2026-10-24T12:00:00Z');
  assert.strictEqual(fechaEditable('2023-10-24', hoy), '2023-10-24');
  assert.strictEqual(fechaEditable('2028-10-24', hoy), '2028-10-24');
  assert.throws(() => fechaEditable('2023-10-23', hoy), E);
  assert.throws(() => fechaEditable('2028-10-25', hoy), E);
});

test('plantilla: 7 días, null = no tocar, al menos uno cargado', () => {
  const { plantilla } = require('../src/validar');
  const m = { tipo: 'trabajo', tramos: [{ inicio: '09:00', fin: '13:00' }] };
  const p = plantilla({ nombre: ' Mañana  L–S ', dias: [m, m, m, m, m, m, { tipo: 'libre' }] });
  assert.strictEqual(p.nombre, 'Mañana L–S');
  assert.deepStrictEqual(p.dias[6], { tipo: 'libre', tramos: [] });
  assert.strictEqual(plantilla({ nombre: 'Finde', dias: [null, null, null, null, null, m, m] }).dias[0], null);
  assert.throws(() => plantilla({ nombre: 'Nada', dias: Array(7).fill(null) }), E);
  assert.throws(() => plantilla({ nombre: 'Corta', dias: [m] }), E);
});

test('lote: fechas válidas, sin repetir, máximo 93', () => {
  const { lote } = require('../src/validar');
  const hoy = new Date('2026-10-24T12:00:00Z');
  const l = lote({ dias: [{ fecha: '2026-10-26', tipo: 'libre' }], borrar: ['2026-10-27'] }, hoy);
  assert.strictEqual(l.dias[0].tipo, 'libre');
  assert.throws(() => lote({ dias: [{ fecha: '2026-10-26', tipo: 'libre' }], borrar: ['2026-10-26'] }, hoy), E);
  assert.throws(() => lote({}, hoy), E);
  assert.throws(() => lote({ borrar: Array.from({ length: 94 }, (_, i) => `2026-11-${String((i % 28) + 1).padStart(2, '0')}`) }, hoy), E);
});

test('horas extra y libre compensado', () => {
  const t8 = { tipo: 'trabajo', tramos: [{ inicio: '07:00', fin: '15:00' }] };
  assert.deepStrictEqual(dia({ ...t8, extra: { minutos: 120, pago: 'dinero', cobrada: true } }).extra, { minutos: 120, pago: 'dinero', cobrada: true });
  assert.strictEqual(dia({ ...t8, extra: { minutos: 60, pago: 'horas', cobrada: true } }).extra.cobrada, false);
  assert.throws(() => dia({ ...t8, extra: { minutos: 500, pago: 'horas' } }), E);
  assert.throws(() => dia({ ...t8, extra: { minutos: 60 } }), E);
  assert.strictEqual(dia({ tipo: 'libre', extra: { minutos: 60, pago: 'horas' } }).extra, null);
  assert.strictEqual(dia({ tipo: 'compensado', compensa: 480 }).compensa, 480);
  assert.throws(() => dia({ tipo: 'compensado' }), E);
});
