import { useState } from 'react';
import { pedir } from '../api.js';
import { desdeIso } from '../fechas.js';
import { resumen } from '../plantillas.js';

// Aplica una plantilla a los días elegidos: a cada día, lo que la plantilla dice
// para ese día de la semana (los que la plantilla deja vacíos no se tocan).
export default function AplicarPlantilla({ fechas, plantillas, cerrar, guardado }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aplicar(p) {
    const dias = fechas
      .map((fecha) => ({ fecha, d: p.dias[(desdeIso(fecha).getDay() + 6) % 7] }))
      .filter(({ d }) => d)
      .map(({ fecha, d }) => ({ fecha, tipo: d.tipo, tramos: d.tramos }));
    if (!dias.length) return setError('Esa plantilla no tiene nada para los días elegidos.');
    setEnviando(true);
    try {
      guardado(await pedir('/dias', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dias }) }));
      cerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-label="Aplicar plantilla" onClick={(e) => e.stopPropagation()}>
        <h2>Aplicar plantilla a {fechas.length} {fechas.length === 1 ? 'día' : 'días'}</h2>
        {!plantillas.length && <p className="tenue">Todavía no tenés plantillas.</p>}
        <ul className="lista-plantillas">
          {plantillas.map((p) => (
            <li key={p.id}>
              <button disabled={enviando} onClick={() => aplicar(p)}>
                <strong>{p.nombre}</strong>
                <span className="tenue">{resumen(p)}</span>
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <a className="boton secundario" href="/plantillas">Crear o editar plantillas</a>
          <button className="enlace" onClick={cerrar}>Cancelar</button>
        </div>
      </section>
    </div>
  );
}
