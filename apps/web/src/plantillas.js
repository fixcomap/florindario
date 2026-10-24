import { horas, minutosDelDia, tramoCorto } from './horas.js';
import { DIAS_CORTOS } from './fechas.js';
import { tipo } from './datos/tipos.js';

// "L–V 9–13 · S libre · 20 h": agrupa días seguidos iguales.
export function resumen(p) {
  const etiqueta = (d) => (!d ? null : d.tipo === 'trabajo' ? d.tramos.map(tramoCorto).join(' y ') : tipo(d.tipo).nombre.toLowerCase());
  const grupos = [];
  p.dias.forEach((d, i) => {
    const e = etiqueta(d);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.e === e) ultimo.fin = i;
    else grupos.push({ e, ini: i, fin: i });
  });
  const partes = grupos.filter((g) => g.e).map((g) => `${DIAS_CORTOS[g.ini]}${g.fin > g.ini ? `–${DIAS_CORTOS[g.fin]}` : ''} ${g.e}`);
  const total = p.dias.reduce((s, d) => s + minutosDelDia(d), 0);
  return `${partes.join(' · ')}${total ? ` · ${horas(total)}` : ''}`;
}
