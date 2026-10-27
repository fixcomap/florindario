import { desdeIso } from './fechas.js';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const COLORES = ['#fff1a6', '#ffd9e2', '#d9f2dc', '#d9ebff', '#e9defc', '#ffe3c4'];
const normal = (t) => t.trim().toLowerCase().replace(/\s+/g, ' ');

// Mismo texto = un solo post-it, con todas sus fechas (y los ids para editar o borrar).
export function agrupar(notas) {
  const grupos = new Map();
  for (const n of notas) {
    const k = normal(n.texto);
    const g = grupos.get(k) || { texto: n.texto, ids: [], fechas: [], general: false, fijada: false };
    g.fijada ||= n.fijada;
    g.ids.push(n.id);
    g.fechas.push(...n.fechas);
    g.general ||= !n.fechas.length;
    grupos.set(k, g);
  }
  return [...grupos.values()].map((g) => ({ ...g, fechas: [...new Set(g.fechas)].sort() })).sort((a, b) => b.fijada - a.fijada);
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

// Fecha de un post-it en grande y pequeño: "5" + "OCT", "14–15" + "OCT", "3 días" + "5 y 9 oct, 3 nov", "General".
export function etiquetaFechas(fechas) {
  if (!fechas.length) return { grande: 'General', chico: 'del mes' };
  const ds = fechas.map(desdeIso);
  const mismoMes = ds.every((d) => d.getMonth() === ds[0].getMonth() && d.getFullYear() === ds[0].getFullYear());
  if (!mismoMes) return { grande: `${ds.length} días`, chico: fechasTexto(fechas) };
  const dias = ds.map((d) => d.getDate());
  const seguidos = dias.every((n, i) => i === 0 || n === dias[i - 1] + 1);
  const grande = dias.length === 1 ? String(dias[0])
    : seguidos ? `${dias[0]}–${dias.at(-1)}`
    : dias.length === 2 ? `${dias[0]} · ${dias[1]}` : `${dias.length} días`;
  return { grande, chico: MESES[ds[0].getMonth()].toUpperCase(), detalle: !seguidos && dias.length > 2 ? fechasTexto(fechas) : '' };
}
