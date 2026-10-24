import { useState } from 'react';
import { pedir } from '../api.js';
import { diaLargo } from '../fechas.js';
import Tramos from './Tramos.jsx';
import TiposDia from './TiposDia.jsx';

const TRAMO = { inicio: '09:00', fin: '13:00' };

// Hoja inferior para cargar uno o varios días con lo mismo: tipo, tramos y nota.
export default function EditorDia({ fechas, dia, cerrar, guardado }) {
  const [tipoDia, setTipoDia] = useState(dia?.tipo || 'trabajo');
  const [tramos, setTramos] = useState(dia?.tramos?.length ? dia.tramos : [TRAMO]);
  const [nota, setNota] = useState(dia?.nota || '');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const titulo = fechas.length === 1 ? diaLargo(fechas[0]) : `${fechas.length} días`;

  async function enviar(cuerpo) {
    setError('');
    setEnviando(true);
    try {
      guardado(await pedir('/dias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      }));
      cerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const guardar = () => enviar({ dias: fechas.map((fecha) => ({ fecha, tipo: tipoDia, tramos: tipoDia === 'trabajo' ? tramos : [], nota })) });

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-label={`Editar ${titulo}`} onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <TiposDia valor={tipoDia} cambiar={setTipoDia} />
        {tipoDia === 'trabajo' && <Tramos tramos={tramos} cambiar={setTramos} />}
        <label>Nota<input value={nota} maxLength={200} placeholder="Opcional: cambio de turno, cubro a alguien…" onChange={(e) => setNota(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <div className="acciones">
          <button className="boton" disabled={enviando} onClick={guardar}>Guardar</button>
          {(dia || fechas.length > 1) && <button className="boton secundario" disabled={enviando} onClick={() => enviar({ borrar: fechas })}>Dejar sin cargar</button>}
          <button className="enlace" onClick={cerrar}>Cancelar</button>
        </div>
      </section>
    </div>
  );
}
