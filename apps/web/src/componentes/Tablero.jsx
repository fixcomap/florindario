import { useState } from 'react';
import { pedir } from '../api.js';
import { colorDe, etiquetaFechas } from '../notas.js';
import HojaNota from './HojaNota.jsx';

// Marcador para fijar una nota en los meses siguientes (relleno = fijada).
function Fijar({ g, mes, cambiado }) {
  const titulo = g.fijada ? 'Quitar de los meses siguientes' : 'Fijar en los meses siguientes';
  return (
    <button className="fijar" aria-pressed={g.fijada} aria-label={titulo} title={titulo}
      onClick={() => Promise.all(g.ids.map((id) => pedir(`/notas/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fijada: !g.fijada, mes }) }))).then(cambiado)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.5a1 1 0 0 1 1-1Z" /></svg>
    </button>
  );
}

function Fecha({ g }) {
  const e = etiquetaFechas(g.fechas);
  return (
    <span className={`nota-fecha${g.fechas.length ? '' : ' general'}`}>
      <span className="grande">{e.grande}</span>
      <span className="chico">{e.chico}</span>
    </span>
  );
}

// Notas del mes como tarjetas: fecha en grande a la izquierda (o GENERAL), texto a la
// derecha y el marcador para fijarla en los meses siguientes. "+ Nota" crea una general.
export default function Tablero({ grupos, mes, cambiado }) {
  const [hoja, setHoja] = useState(null); // { grupo } | { nueva: true }
  return (
    <section className="tablero">
      <h2>Notas del mes</h2>
      <div className="notas">
        {grupos.map((g) => (
          <div key={g.ids.join('-')} className={`nota${g.fijada ? ' fijada' : ''}`} style={{ '--color-nota': colorDe(g.texto) }}>
            <button className="nota-cuerpo" onClick={() => setHoja({ grupo: g })}>
              <Fecha g={g} />
              <span className="nota-texto">{g.texto}</span>
            </button>
            <Fijar g={g} mes={mes} cambiado={cambiado} />
          </div>
        ))}
        <button className="nota-nueva" onClick={() => setHoja({ nueva: true })}>+ Nota</button>
      </div>
      {hoja && <HojaNota grupo={hoja.grupo} mes={mes} cerrar={() => setHoja(null)} cambiado={cambiado} />}
    </section>
  );
}
