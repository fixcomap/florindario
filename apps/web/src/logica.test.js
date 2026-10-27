import { describe, expect, it } from 'vitest';
import { corta, duracion, horas, horasCortas, minutosDelDia, tramoCorto } from './horas.js';
import { desdeIso, diaLargo, iso, nombreMes, semanasDelMes } from './fechas.js';
import { agrupar, colorDe, etiquetaFechas, fechasTexto } from './notas.js';
import { enDias, saldoEnDias, sumaEnDias } from './jornadas.js';
import { resumen } from './plantillas.js';
import { aspecto, tipo } from './datos/tipos.js';

const J20 = { id: '1', nombre: 'Jornada 20 h', minutosDia: 240 };
const J40 = { id: '2', nombre: 'Jornada 40 h', minutosDia: 480 };
const trabajo = (...tramos) => ({ tipo: 'trabajo', tramos: tramos.map(([inicio, fin]) => ({ inicio, fin })) });

describe('horas', () => {
  it('duración de un tramo, también de noche', () => {
    expect(duracion({ inicio: '09:00', fin: '13:00' })).toBe(240);
    expect(duracion({ inicio: '22:00', fin: '06:00' })).toBe(480);
  });
  it('minutos de un día: solo cuenta el trabajo', () => {
    expect(minutosDelDia(trabajo(['09:00', '13:00'], ['17:00', '21:00']))).toBe(480);
    expect(minutosDelDia({ tipo: 'libre', tramos: [] })).toBe(0);
    expect(minutosDelDia(undefined)).toBe(0);
  });
  it('formatos', () => {
    expect(horas(1230)).toBe('20 h 30');
    expect(horas(1200)).toBe('20 h');
    expect(horas(0)).toBe('—');
    expect(horasCortas(210)).toBe('3:30h');
    expect(horasCortas(480)).toBe('8h');
    expect(corta('09:00')).toBe('9');
    expect(tramoCorto({ inicio: '08:45', fin: '12:00' })).toBe('8:45–12');
  });
});

describe('fechas', () => {
  it('ida y vuelta ISO en hora local', () => {
    expect(iso(desdeIso('2026-02-28'))).toBe('2026-02-28');
    expect(nombreMes(2026, 9)).toBe('octubre 2026');
    expect(diaLargo('2026-10-27')).toBe('martes 27 de octubre');
  });
  it('semanas de lunes a domingo que cubren el mes', () => {
    const oct = semanasDelMes(2026, 9);
    expect(oct).toHaveLength(5);
    expect(oct[0][0]).toBe('2026-09-28');
    expect(oct.at(-1)[6]).toBe('2026-11-01');
    expect(semanasDelMes(2027, 1)).toHaveLength(4); // febrero de 2027 empieza en lunes
  });
});

describe('notas', () => {
  it('agrupa por texto, sin repetir fechas, fijadas primero', () => {
    const g = agrupar([
      { id: '1', texto: 'Reunión', fijada: false, fechas: ['2026-10-15'] },
      { id: '2', texto: ' reunión ', fijada: false, fechas: ['2026-10-14', '2026-10-15'] },
      { id: '3', texto: 'Uniforme', fijada: true, fechas: [] },
    ]);
    expect(g.map((x) => x.texto)).toEqual(['Uniforme', 'Reunión']);
    expect(g[1].fechas).toEqual(['2026-10-14', '2026-10-15']);
    expect(g[1].ids).toEqual(['1', '2']);
    expect(g[0].general).toBe(true);
  });
  it('mismo texto, mismo color', () => {
    expect(colorDe('Reunión')).toBe(colorDe('  reunión '));
  });
  it('fechas en texto', () => {
    expect(fechasTexto(['2026-10-27', '2026-10-28', '2026-11-03'])).toMatch(/^27 y 28 oct, 3 nov/);
  });
  it('etiqueta: días listados y letra más pequeña cuantos más', () => {
    expect(etiquetaFechas([])).toMatchObject({ grande: 'General', tam: 'normal' });
    expect(etiquetaFechas(['2026-10-05'])).toEqual({ grande: '5', chico: 'OCT', tam: 'normal' });
    expect(etiquetaFechas(['2026-11-11', '2026-11-12', '2026-11-13'])).toEqual({ grande: '11, 12, 13', chico: 'NOV', tam: 'chica' });
    expect(etiquetaFechas(['2026-10-28', '2026-10-30', '2026-11-03'])).toEqual({ grande: '28, 30 · 3', chico: 'OCT · NOV', tam: 'chica' });
    expect(etiquetaFechas(['2026-10-03', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29']).tam).toBe('mini');
  });
});

describe('jornadas', () => {
  it('minutos en días de una jornada', () => {
    expect(enDias(240, J20)).toBe('1 día en Jornada 20 h');
    expect(enDias(600, J20)).toBe('2,5 días en Jornada 20 h');
  });
  it('suma por jornada y sin jornada en horas', () => {
    expect(sumaEnDias([{ minutos: 240, jornadaId: '1' }, { minutos: 480, jornadaId: '2' }, { minutos: 30, jornadaId: null }], [J20, J40]))
      .toBe('1 día en Jornada 20 h · 1 día en Jornada 40 h · 0 h 30');
  });
  it('saldo en la jornada con más extras', () => {
    expect(saldoEnDias(480, [{ jornadaId: '2', generadas: 600 }, { jornadaId: '1', generadas: 60 }], [J20, J40]))
      .toBe('1 día en Jornada 40 h · o 2 días en Jornada 20 h');
    expect(saldoEnDias(240, [], [J20])).toBe('1 día en Jornada 20 h');
  });
});

describe('plantillas', () => {
  it('resumen agrupa días seguidos iguales', () => {
    const t = trabajo(['09:00', '13:00']);
    const libre = { tipo: 'libre', tramos: [] };
    expect(resumen({ dias: [t, t, t, t, t, libre, null] })).toBe('L–V 9–13 · S libre · 20 h');
  });
});

describe('tipos', () => {
  it('trabajo: personaje y color según el orden de la jornada', () => {
    expect(aspecto({ tipo: 'trabajo', jornadaId: '1' }, [J20, J40]).personaje).toBe('j1');
    expect(aspecto({ tipo: 'trabajo', jornadaId: '2' }, [J20, J40]).personaje).toBe('j2');
    expect(aspecto({ tipo: 'trabajo', jornadaId: 'x' }, [J20, J40]).personaje).toBe('j1');
  });
  it('los demás tipos, tal cual', () => {
    expect(aspecto({ tipo: 'vacaciones' })).toBe(tipo('vacaciones'));
    expect(tipo('disposicion').personaje).toBe('disposicion');
  });
});
