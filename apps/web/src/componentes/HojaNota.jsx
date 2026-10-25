import { useState } from 'react';
import { pedir } from '../api.js';
import { fechasTexto } from '../notas.js';

const JSON_ = { 'Content-Type': 'application/json' };

// Crear una nota (para fechas o general del mes) o editar un post-it (todas sus notas).
export default function HojaNota({ grupo, fechas, mes, cerrar, cambiado }) {
  const [texto, setTexto] = useState(grupo?.texto || '');
  const [fijada, setFijada] = useState(grupo?.fijada || false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const destino = grupo ? (grupo.fechas.length ? fechasTexto(grupo.fechas) : 'General')
    : fechas?.length ? fechasTexto(fechas) : 'General';

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
      <section className="hoja" role="dialog" aria-label={grupo ? 'Editar nota' : 'Nueva nota'} onClick={(e) => e.stopPropagation()}>
        <h2>{grupo ? 'Nota' : 'Nueva nota'}</h2>
        <p className="tenue">📅 {destino}</p>
        <textarea className="texto-nota" value={texto} maxLength={500} rows={4} autoFocus placeholder="Escribí tu nota…" onChange={(e) => setTexto(e.target.value)} />
        <label className="casilla fijar">
          <input type="checkbox" checked={fijada} onChange={(e) => setFijada(e.target.checked)} />
          <span>📌 Fijar: se ve también en los meses siguientes, hasta que le quites el pin</span>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <button className="boton" disabled={enviando || !texto.trim()} onClick={guardar}>Guardar</button>
          {grupo && <button className="boton secundario peligro" disabled={enviando} onClick={borrar}>Borrar nota</button>}
          <button className="enlace" onClick={cerrar}>Cancelar</button>
        </div>
      </section>
    </div>
  );
}
