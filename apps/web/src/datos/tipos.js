// Tipos de día: los mismos que acepta la API (apps/api/src/validar.js).
export const TIPOS = [
  { id: 'trabajo', nombre: 'Trabajo', color: '#8a6500', fondo: '#fdf0c4', icono: '💼' },
  { id: 'libre', nombre: 'Libre', color: '#3f7a4b', fondo: '#e2f0e2', icono: '🌿', personaje: 'libre' },
  { id: 'vacaciones', nombre: 'Vacaciones', color: '#16737f', fondo: '#dbf0f2', icono: '🌻', personaje: 'vacaciones' },
  { id: 'festivo', nombre: 'Festivo', color: '#7d6db7', fondo: '#ebe7f7', icono: '🎉' },
  { id: 'baja', nombre: 'Baja', color: '#6a5aa8', fondo: '#ece8f8', icono: '🩹', personaje: 'baja' },
  { id: 'compensado', nombre: 'Libre compensado', color: '#2f8f8a', fondo: '#dff1ef', icono: '🔄' },
];

export const tipo = (id) => TIPOS.find((t) => t.id === id);

// Días de trabajo: personaje y color según el orden de la jornada (1.ª amarilla,
// 2.ª roja, y se alternan si hay más). Sin jornada, la primera.
const POR_JORNADA = [
  { personaje: 'j1', color: '#8a6500', fondo: '#fdf0c4' },
  { personaje: 'j2', color: '#b3261e', fondo: '#fbe1dd' },
];

export function aspecto(d, jornadas = []) {
  const t = tipo(d.tipo);
  if (d.tipo !== 'trabajo') return t;
  const i = Math.max(0, jornadas.findIndex((j) => j.id === d.jornadaId));
  return { ...t, ...POR_JORNADA[i % POR_JORNADA.length] };
}
