import { useState } from 'react';
import { pedir } from '../api.js';
import { desdeIso } from '../fechas.js';
import { resumen } from '../plantillas.js';

// Aplica una plantilla a los días elegidos: primero la jornada, después una de sus
// plantillas. A cada día, lo que la plantilla dice para ese día de la semana (los
// que deja vacíos no se tocan); los días de trabajo quedan en la jornada elegida.
export default function AplicarPlantilla({ fechas, plantillas, jornadas = [], cerrar, guardado }) {
  const sueltas = plantillas.filter((p) => !jornadas.some((j) => j.id === p.jornadaId));
  const grupos = [
    ...jornadas.filter((j) => plantillas.some((p) => p.jornadaId === j.id)),
    ...(sueltas.length ? [{ id: null, nombre: 'Sin jornada' }] : []),
  ];
  const [grupoId, setGrupoId] = useState(grupos[0]?.id ?? null);
  const grupo = grupos.find((g) => g.id === grupoId) || grupos[0];
  const lista = !grupo ? [] : grupo.id ? plantillas.filter((p) => p.jornadaId === grupo.id) : sueltas;
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aplicar(p) {
    const dias = fechas
      .map((fecha) => ({ fecha, d: p.dias[(desdeIso(fecha).getDay() + 6) % 7] }))
      .filter(({ d }) => d)
      .map(({ fecha, d }) => ({ fecha, tipo: d.tipo, tramos: d.tramos, jornadaId: d.tipo === 'trabajo' ? grupo?.id ?? null : null }));
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
        {grupos.length > 1 && (
          <>
            <p className="paso">Jornada</p>
            <div className="selector-jornada">
              {grupos.map((g) => (
                <button key={g.id ?? 'sin'} type="button" className={g === grupo ? 'activo' : ''} aria-pressed={g === grupo} onClick={() => setGrupoId(g.id)}>{g.nombre}</button>
              ))}
            </div>
          </>
        )}
        {grupo && <p className="paso">{grupos.length > 1 ? 'Plantilla' : `Plantilla · ${grupo.nombre}`}</p>}
        <ul className="lista-plantillas">
          {lista.map((p) => (
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
