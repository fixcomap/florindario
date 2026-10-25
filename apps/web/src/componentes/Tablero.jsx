import { useState } from 'react';
import { colorDe, fechasTexto } from '../notas.js';
import HojaNota from './HojaNota.jsx';

// Notas del mes como post-its: una por texto, con sus días debajo; "+ Nota" crea una general.
export default function Tablero({ grupos, mes, cambiado }) {
  const [hoja, setHoja] = useState(null); // { grupo } | { nueva: true }
  return (
    <section className="tablero">
      <h2>Notas del mes</h2>
      <div className="postits">
        {grupos.map((g, i) => (
          <button key={g.ids.join('-')} className="postit" style={{ background: colorDe(g.texto), '--giro': `${[-1.6, 1.2, -0.6, 1.8][i % 4]}deg` }} onClick={() => setHoja({ grupo: g })}>
            <span className="postit-texto">{g.texto}</span>
            <span className="postit-dias">{g.fechas.length ? `📅 ${fechasTexto(g.fechas)}` : '📌 General'}{g.general && g.fechas.length ? ' · y general' : ''}</span>
          </button>
        ))}
        <button className="postit nuevo" onClick={() => setHoja({ nueva: true })}>+ Nota</button>
      </div>
      {hoja && <HojaNota grupo={hoja.grupo} mes={mes} cerrar={() => setHoja(null)} cambiado={cambiado} />}
    </section>
  );
}
