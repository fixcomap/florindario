import { useState } from 'react';
import { pedir } from '../api.js';
import { diaLargo } from '../fechas.js';
import { horas, minutosDelDia } from '../horas.js';
import { TIPOS } from '../datos/tipos.js';

const TRAMO = { inicio: '09:00', fin: '13:00' };

// Hoja inferior para cargar un día: tipo, tramos (1 a 3: jornada partida; fin
// antes que inicio = turno de noche) y nota.
export default function EditorDia({ fecha, dia, cerrar, guardado }) {
  const [tipoDia, setTipoDia] = useState(dia?.tipo || 'trabajo');
  const [tramos, setTramos] = useState(dia?.tramos?.length ? dia.tramos : [TRAMO]);
  const [nota, setNota] = useState(dia?.nota || '');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiarTramo = (i, campo, valor) => setTramos(tramos.map((t, k) => (k === i ? { ...t, [campo]: valor } : t)));
  const borde = (minutos) => (minutos ? horas(minutos) : '');

  async function guardar() {
    setError('');
    setEnviando(true);
    try {
      const d = await pedir(`/dias/${fecha}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tipoDia, tramos: tipoDia === 'trabajo' ? tramos : [], nota }),
      });
      guardado(fecha, d);
      cerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  async function borrar() {
    setEnviando(true);
    try {
      await pedir(`/dias/${fecha}`, { method: 'DELETE' });
      guardado(fecha, null);
      cerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-label={`Editar ${diaLargo(fecha)}`} onClick={(e) => e.stopPropagation()}>
        <h2>{diaLargo(fecha)}</h2>

        <div className="tipos">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tipoDia === t.id ? 'activo' : ''}
              style={tipoDia === t.id ? { background: t.fondo, borderColor: t.color, color: t.color } : undefined}
              aria-pressed={tipoDia === t.id}
              onClick={() => setTipoDia(t.id)}
            >
              {t.icono} {t.nombre}
            </button>
          ))}
        </div>

        {tipoDia === 'trabajo' && (
          <div className="tramos">
            {tramos.map((t, i) => (
              <div key={i} className="tramo">
                <label>Entrada<input type="time" value={t.inicio} onChange={(e) => cambiarTramo(i, 'inicio', e.target.value)} /></label>
                <label>Salida<input type="time" value={t.fin} onChange={(e) => cambiarTramo(i, 'fin', e.target.value)} /></label>
                {tramos.length > 1 && <button type="button" className="quitar" aria-label="Quitar tramo" onClick={() => setTramos(tramos.filter((_, k) => k !== i))}>×</button>}
              </div>
            ))}
            {tramos.length < 3 && (
              <button type="button" className="enlace" onClick={() => setTramos([...tramos, { inicio: '17:00', fin: '21:00' }])}>+ Jornada partida</button>
            )}
            <p className="tenue">Total del día: <strong>{borde(minutosDelDia({ tipo: 'trabajo', tramos }))}</strong>
              {tramos.some((t) => t.fin <= t.inicio) && ' · turno de noche (termina al día siguiente)'}</p>
          </div>
        )}

        <label>Nota<input value={nota} maxLength={200} placeholder="Opcional: cambio de turno, cubro a alguien…" onChange={(e) => setNota(e.target.value)} /></label>

        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <button className="boton" disabled={enviando} onClick={guardar}>Guardar</button>
          {dia && <button className="boton secundario" disabled={enviando} onClick={borrar}>Dejar sin cargar</button>}
          <button className="enlace" onClick={cerrar}>Cancelar</button>
        </div>
      </section>
    </div>
  );
}
