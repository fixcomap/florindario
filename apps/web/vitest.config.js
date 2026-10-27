import { defineConfig } from 'vitest/config';

// Tests de la lógica pura del front (sin navegador). La cobertura se exige sobre
// esos módulos: si baja del mínimo, el pipeline falla.
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/horas.js', 'src/fechas.js', 'src/notas.js', 'src/jornadas.js', 'src/plantillas.js', 'src/datos/tipos.js'],
      reporter: ['text-summary'],
      thresholds: { lines: 90, functions: 90, branches: 80 },
    },
  },
});
