import { useState } from 'react';
import { pedir } from '../api.js';
import { diaLargo } from '../fechas.js';
import Tramos from './Tramos.jsx';
import TiposDia from './TiposDia.jsx';
import Duracion from './Duracion.jsx';
import { horas, minutosDelDia } from '../horas.js';

const TRAMO = { inicio: '09:00', fin: '13:00' };

// Hoja inferior para cargar uno o varios días con lo mismo: tipo, tramos, horas
// extra (pagadas o a la bolsa de horas libres), horas de bolsa usadas y nota.
export default function EditorDia({ fechas, dia, bolsa, cerrar, guardado }) {
  const [tipoDia, setTipoDia] = useState(dia?.tipo || 'trabajo');
  const [tramos, setTramos] = useState(dia?.tramos?.length ? dia.tramos : [TRAMO]);
  const [nota, setNota] = useState(dia?.nota || '');
  const [extra, setExtra] = useState(dia?.extra || null);
  const [compensa, setCompensa] = useState(dia?.compensa || 480);
  const trabajadas = minutosDelDia({ tipo: 'trabajo', tramos });
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

  const guardar = () => enviar({
    dias: fechas.map((fecha) => ({
      fecha,
      tipo: tipoDia,
      tramos: tipoDia === 'trabajo' ? tramos : [],
      nota,
      extra: tipoDia === 'trabajo' && extra ? { ...extra, minutos: Math.min(extra.minutos, trabajadas) } : null,
      compensa: tipoDia === 'compensado' ? compensa : 0,
    })),
  });

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-label={`Editar ${titulo}`} onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <TiposDia valor={tipoDia} cambiar={setTipoDia} />
        {tipoDia === 'trabajo' && <Tramos tramos={tramos} cambiar={setTramos} />}

        {tipoDia === 'trabajo' && (
          <div className="extra">
            <label className="casilla">
              <input type="checkbox" checked={!!extra} onChange={(e) => setExtra(e.target.checked ? { minutos: Math.min(60, trabajadas), pago: 'dinero', cobrada: false } : null)} />
              <span>Hice horas extra</span>
            </label>
            {extra && (
              <>
                <div className="fila-extra">
                  <Duracion etiqueta="¿Cuántas?" valor={extra.minutos} cambiar={(minutos) => setExtra({ ...extra, minutos })} />
                  <button type="button" className="chip" onClick={() => setExtra({ ...extra, minutos: trabajadas })}>Todo el día ({horas(trabajadas)})</button>
                </div>
                <div className="tipos">
                  {[['dinero', '💶 Me las pagan'], ['horas', '🕒 Horas libres']].map(([id, texto]) => (
                    <button key={id} type="button" className={extra.pago === id ? 'activo' : ''} aria-pressed={extra.pago === id}
                      onClick={() => setExtra({ ...extra, pago: id, cobrada: id === 'dinero' && extra.cobrada })}>{texto}</button>
                  ))}
                </div>
                {extra.pago === 'dinero' && (
                  <label className="casilla"><input type="checkbox" checked={extra.cobrada} onChange={(e) => setExtra({ ...extra, cobrada: e.target.checked })} /><span>Ya las cobré</span></label>
                )}
                {extra.minutos > trabajadas && <p className="error">No pueden ser más que las {horas(trabajadas)} trabajadas.</p>}
              </>
            )}
          </div>
        )}

        {tipoDia === 'compensado' && (
          <div className="extra">
            <Duracion etiqueta="Horas libres que usás" valor={compensa} cambiar={setCompensa} />
            {bolsa && <p className="tenue">En tu bolsa: <strong>{horas(bolsa.saldo + (dia?.compensa || 0))}</strong></p>}
          </div>
        )}
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
