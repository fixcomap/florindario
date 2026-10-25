import { useState } from 'react';
import { pedir } from '../api.js';
import { desdeIso, diaLargo } from '../fechas.js';
import { TIPOS } from '../datos/tipos.js';
import Tramos from './Tramos.jsx';
import Duracion from './Duracion.jsx';
import { horas, minutosDelDia, tramoCorto } from '../horas.js';

const TRAMO = { inicio: '09:00', fin: '13:00' };
const SIN_HORARIO = TIPOS.filter((t) => t.id !== 'trabajo');
const clave = (tramos) => tramos.map((t) => `${t.inicio}-${t.fin}`).join(',');

// Turnos que ofrecen las plantillas para ese día de la semana (o, si ese día no
// trabaja, el primer día de trabajo de la plantilla); sin repetir horarios.
function turnosDePlantillas(plantillas, fecha) {
  const dia = (desdeIso(fecha).getDay() + 6) % 7;
  const vistos = new Set();
  return plantillas.flatMap((p) => {
    const d = p.dias[dia]?.tipo === 'trabajo' ? p.dias[dia] : p.dias.find((x) => x?.tipo === 'trabajo');
    if (!d || vistos.has(clave(d.tramos))) return [];
    vistos.add(clave(d.tramos));
    return [{ id: p.id, nombre: p.nombre, tramos: d.tramos }];
  });
}

// Hoja inferior para cargar uno o varios días con lo mismo: tipo, tramos, horas
// extra (pagadas o a la bolsa de horas libres), horas de bolsa usadas y nota.
export default function EditorDia({ fechas, dia, plantillas = [], bolsa, cerrar, guardado }) {
  const turnos = turnosDePlantillas(plantillas, fechas[0]);
  // Elección: 'p:<id>' (turno de plantilla), 'otro' (horario a mano) o un tipo sin horario.
  const [eleccion, setEleccion] = useState(() => {
    if (dia && dia.tipo !== 'trabajo') return dia.tipo;
    if (dia) return turnos.find((t) => clave(t.tramos) === clave(dia.tramos)) ? `p:${turnos.find((t) => clave(t.tramos) === clave(dia.tramos)).id}` : 'otro';
    return turnos.length ? `p:${turnos[0].id}` : 'otro';
  });
  const turno = turnos.find((t) => `p:${t.id}` === eleccion);
  const tipoDia = turno || eleccion === 'otro' ? 'trabajo' : eleccion;
  const [propios, setPropios] = useState(dia?.tipo === 'trabajo' ? dia.tramos : [TRAMO]);
  const tramos = turno ? turno.tramos : propios;
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
        <div className="turnos">
          {turnos.map((t) => (
            <button key={t.id} type="button" className={`turno${eleccion === `p:${t.id}` ? ' activo' : ''}`} aria-pressed={eleccion === `p:${t.id}`} onClick={() => setEleccion(`p:${t.id}`)}>
              <strong>{t.nombre}</strong>
              <span>{t.tramos.map(tramoCorto).join(' y ')} · {horas(minutosDelDia({ tipo: 'trabajo', tramos: t.tramos }))}</span>
            </button>
          ))}
          <button type="button" className={`turno otro${eleccion === 'otro' ? ' activo' : ''}`} aria-pressed={eleccion === 'otro'} onClick={() => setEleccion('otro')}>
            <strong>✎ Otro horario</strong>
            <span>{eleccion === 'otro' ? 'elegí las horas abajo' : 'entrada y salida a mano'}</span>
          </button>
        </div>
        {!turnos.length && <p className="tenue pista">Creá <a href="/plantillas">plantillas</a> y tus turnos aparecen acá para cargarlos con un toque.</p>}
        {eleccion === 'otro' && <Tramos tramos={propios} cambiar={setPropios} />}

        <div className="tipos sin-horario">
          {SIN_HORARIO.map((t) => (
            <button key={t.id} type="button" className={eleccion === t.id ? 'activo' : ''} aria-pressed={eleccion === t.id}
              style={eleccion === t.id ? { background: t.fondo, borderColor: t.color, color: t.color } : undefined}
              onClick={() => setEleccion(t.id)}>{t.icono} {t.nombre}</button>
          ))}
        </div>

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
