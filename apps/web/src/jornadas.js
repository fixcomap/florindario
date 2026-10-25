import { horas } from './horas.js';

// Saldo de la bolsa expresado en jornadas: "2 de Jornada 20 h · o 1 de Jornada 40 h".
export function enJornadas(minutos, jornadas) {
  if (!jornadas.length) return horas(minutos);
  const n = (j) => {
    const x = Math.round((minutos / j.minutosDia) * 10) / 10;
    return String(x).replace('.', ',');
  };
  return jornadas.map((j) => `${n(j)} ${n(j) === '1' ? 'jornada' : 'jornadas'} de ${j.nombre}`).join(' · o ');
}
