import { useState } from 'react';
import { pedir } from '../api.js';
import { colorDe, etiquetaFechas, fechasTexto } from '../notas.js';

const JSON_ = { 'Content-Type': 'application/json' };

// Crear una nota (para fechas o general del mes) o editar un post-it (todas sus notas).
export default function HojaNota({ grupo, fechas, mes, cerrar, cambiado }) {
  const [texto, setTexto] = useState(grupo?.texto || '');
  const [fijada, setFijada] = useState(grupo?.fijada || false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const lasFechas = grupo ? grupo.fechas : fechas || [];
  const destino = lasFechas.length ? fechasTexto(lasFechas) : 'Nota general del mes';
  const etiqueta = etiquetaFechas(lasFechas);

  async function hacer(fn) {
    setError('');
    setEnviando(true);
    try {
      await fn();
      cambiado();
      cerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const guardar = () => hacer(async () => {
    if (grupo) await Promise.all(grupo.ids.map((id) => pedir(`/notas/${id}`, { method: 'PUT', headers: JSON_, body: JSON.stringify({ texto, fijada, mes }) })));
    else await pedir('/notas', { method: 'POST', headers: JSON_, body: JSON.stringify(fechas?.length ? { texto, fechas, fijada } : { texto, mes, fijada }) });
  });
  const borrar = () => window.confirm('¿Borrar esta nota de todos sus días?')
    && hacer(() => Promise.all(grupo.ids.map((id) => pedir(`/notas/${id}`, { method: 'DELETE' }))));

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja hoja-nota" role="dialog" aria-label={grupo ? 'Editar nota' : 'Nueva nota'} style={{ '--color-nota': colorDe(texto || grupo?.texto || '') }} onClick={(e) => e.stopPropagation()}>
        <header className="cabecera-nota">
          <span className={`nota-fecha tam-${etiqueta.tam}${lasFechas.length ? '' : ' general'}`}>
            <span className="grande">{etiqueta.grande}</span>
            <span className="chico">{etiqueta.chico}</span>
          </span>
          <span className="titulo-nota">
            <h2>{grupo ? 'Nota' : 'Nueva nota'}</h2>
            <small>{destino}</small>
          </span>
          <button type="button" className="cerrar-hoja" aria-label="Cerrar" onClick={cerrar}>✕</button>
        </header>
        <textarea className="texto-nota" value={texto} maxLength={500} rows={4} autoFocus placeholder="Escribí tu nota…" aria-label="Texto de la nota" onChange={(e) => setTexto(e.target.value)} />
        <button type="button" className="interruptor-fijar" role="switch" aria-checked={fijada} onClick={() => setFijada(!fijada)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4.2L6 21V4.5a1 1 0 0 1 1-1Z" /></svg>
          <span><strong>Fijar en los meses siguientes</strong><small>Se sigue viendo hasta que la quites</small></span>
          <span className="pista" aria-hidden="true" />
        </button>
        {error && <p className="error">{error}</p>}
        <button className="boton" disabled={enviando || !texto.trim()} onClick={guardar}>Guardar</button>
        <div className="pie-nota">
          {grupo ? (
            <button type="button" className="borrar-nota" disabled={enviando} onClick={borrar}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" /></svg>
              Borrar
            </button>
          ) : <span />}
          <button type="button" className="enlace" onClick={cerrar}>Cancelar</button>
        </div>
      </section>
    </div>
  );
}
