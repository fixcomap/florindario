// Tipos de día: los mismos que acepta la API (apps/api/src/validar.js).
export const TIPOS = [
  { id: 'trabajo', nombre: 'Trabajo', color: '#5f8a66', fondo: '#e6efe4', icono: '💼' },
  { id: 'libre', nombre: 'Libre', color: '#8f8794', fondo: '#f0edf1', icono: '🌿' },
  { id: 'vacaciones', nombre: 'Vacaciones', color: '#c98a12', fondo: '#fcefd2', icono: '🌻' },
  { id: 'festivo', nombre: 'Festivo', color: '#7d6db7', fondo: '#ebe7f7', icono: '🎉' },
  { id: 'baja', nombre: 'Baja', color: '#c4566a', fondo: '#fbe4e8', icono: '🩹' },
  { id: 'compensado', nombre: 'Libre compensado', color: '#2f8f8a', fondo: '#dff1ef', icono: '🔄' },
];

export const tipo = (id) => TIPOS.find((t) => t.id === id);
