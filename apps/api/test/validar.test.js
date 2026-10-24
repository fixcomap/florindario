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
