import { desdeIso } from './fechas.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const COLORES = ['#fff1a6', '#ffd9e2', '#d9f2dc', '#d9ebff', '#e9defc', '#ffe3c4'];
const normal = (t) => t.trim().toLowerCase().replace(/\s+/g, ' ');

// Mismo texto = un solo post-it, con todas sus fechas (y los ids para editar o borrar).
export function agrupar(notas) {
  const grupos = new Map();
  for (const n of notas) {
    const k = normal(n.texto);
    const g = grupos.get(k) || { texto: n.texto, ids: [], fechas: [], general: false };
    g.ids.push(n.id);
    g.fechas.push(...n.fechas);
    g.general ||= !n.fechas.length;
    grupos.set(k, g);
  }
  return [...grupos.values()].map((g) => ({ ...g, fechas: [...new Set(g.fechas)].sort() }));
}

export const colorDe = (texto) => COLORES[[...normal(texto)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 997, 7) % COLORES.length];

// ["2026-10-27", "2026-10-28", "2026-11-03"] -> "27 y 28 oct, 3 nov"
export function fechasTexto(fechas) {
  const porMes = [];
  for (const f of fechas) {
    const d = desdeIso(f);
    const etiqueta = `${MESES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
    const ultimo = porMes.at(-1);
    if (ultimo?.etiqueta === etiqueta) ultimo.dias.push(d.getDate());
    else porMes.push({ etiqueta, dias: [d.getDate()] });
  }
  const lista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : String(xs[0]));
  return porMes.map((m) => `${lista(m.dias)} ${m.etiqueta}`).join(', ');
}
