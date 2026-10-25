import { useState } from 'react';
import { pedir } from '../api.js';
import { desdeIso, diaLargo } from '../fechas.js';
import { TIPOS } from '../datos/tipos.js';
import Tramos from './Tramos.jsx';
import Duracion from './Duracion.jsx';
import { horas, minutosDelDia, tramoCorto } from '../horas.js';
import { enJornadas } from '../jornadas.js';

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
    return [{ id: p.id, nombre: p.nombre, tramos: d.tramos, jornadaId: p.jornadaId || null }];
  });
}

// Hoja inferior para cargar uno o varios días con lo mismo: tipo, tramos, horas
// extra (pagadas o a la bolsa de horas libres), horas de bolsa usadas y nota.
// modoBolsa: 'horas' (bolsa de horas), 'jornadas' (se devuelven por jornadas) o 'ninguna' (solo se pagan).
export default function EditorDia({ fechas, dia, plantillas = [], jornadas = [], modoBolsa = 'horas', bolsa, cerrar, guardado, notas, notasCambiadas }) {
  const todos = turnosDePlantillas(plantillas, fechas[0]);
  // Paso 1: la jornada (solo las que tienen turnos; "Sin jornada" si hay plantillas sueltas).
  const grupos = [
    ...jornadas.filter((j) => todos.some((t) => t.jornadaId === j.id)),
    ...(todos.some((t) => !jornadas.some((j) => j.id === t.jornadaId)) ? [{ id: null, nombre: 'Sin jornada' }] : []),
  ];
  const deGrupo = (g) => todos.filter((t) => (g.id ? t.jornadaId === g.id : !jornadas.some((j) => j.id === t.jornadaId)));
  const actual = dia?.tipo === 'trabajo' ? todos.find((t) => clave(t.tramos) === clave(dia.tramos)) : null;
  const [grupoId, setGrupoId] = useState(() => (actual ? (grupos.find((g) => deGrupo(g).includes(actual))?.id ?? null) : grupos[0]?.id ?? null));
  const grupo = grupos.find((g) => g.id === grupoId) || grupos[0];
  const turnos = grupo ? deGrupo(grupo) : [];
  // Elección: 'p:<id>' (turno de plantilla), 'otro' (horario a mano) o un tipo sin horario.
  const [eleccion, setEleccion] = useState(() => {
    if (dia && dia.tipo !== 'trabajo') return dia.tipo;
    if (dia) return actual ? `p:${actual.id}` : 'otro';
    return turnos.length ? `p:${turnos[0].id}` : 'otro';
  });
  const turno = todos.find((t) => `p:${t.id}` === eleccion);
  const elegirGrupo = (g) => {
    setGrupoId(g.id);
    const primero = deGrupo(g)[0];
    if (primero && (eleccion.startsWith('p:') || eleccion === 'otro')) setEleccion(`p:${primero.id}`);
  };
  const tipoDia = turno || eleccion === 'otro' ? 'trabajo' : eleccion;
  const [propios, setPropios] = useState(dia?.tipo === 'trabajo' ? dia.tramos : [TRAMO]);
  const tramos = turno ? turno.tramos : propios;
  const [extra, setExtra] = useState(dia?.extra || null);
  const [compensa, setCompensa] = useState(dia?.compensa || jornadas[0]?.minutosDia || 480);
  const sinHorario = SIN_HORARIO.filter((t) => t.id !== 'compensado' || modoBolsa !== 'ninguna');
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
      extra: tipoDia === 'trabajo' && extra ? { ...extra, minutos: Math.min(extra.minutos, trabajadas) } : null,
      compensa: tipoDia === 'compensado' ? compensa : 0,
    })),
  });

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-label={`Editar ${titulo}`} onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {grupos.length > 1 && (
          <>
            <p className="paso">Jornada</p>
            <div className="selector-jornada">
              {grupos.map((g) => (
                <button key={g.id ?? 'sin'} type="button" className={g === grupo ? 'activo' : ''} aria-pressed={g === grupo} onClick={() => elegirGrupo(g)}>{g.nombre}</button>
              ))}
            </div>
          </>
        )}
        {grupos.length > 0 && <p className="paso">{grupos.length > 1 ? 'Turno' : `Turno · ${grupo.nombre}`}</p>}
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
          {sinHorario.map((t) => (
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
                {modoBolsa !== 'ninguna' && <div className="tipos">
                  {[['dinero', '💶 Me las pagan'], ['horas', modoBolsa === 'jornadas' ? '🕒 Me las devuelven en libres' : '🕒 Horas libres']].map(([id, texto]) => (
                    <button key={id} type="button" className={extra.pago === id ? 'activo' : ''} aria-pressed={extra.pago === id}
                      onClick={() => setExtra({ ...extra, pago: id, cobrada: id === 'dinero' && extra.cobrada })}>{texto}</button>
                  ))}
                </div>}
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
            {modoBolsa === 'jornadas' && jornadas.length > 0 && (
              <>
                <p className="paso">¿Qué jornada te devuelven?</p>
                <div className="selector-jornada">
                  {jornadas.map((j) => (
                    <button key={j.id} type="button" className={compensa === j.minutosDia ? 'activo' : ''} onClick={() => setCompensa(j.minutosDia)}>{j.nombre}</button>
                  ))}
                </div>
              </>
            )}
            <Duracion etiqueta={modoBolsa === 'jornadas' ? 'Equivale a' : 'Horas libres que usás'} valor={compensa} cambiar={setCompensa} />
            {bolsa && (
              <p className="tenue">Te deben: <strong>{modoBolsa === 'jornadas' ? enJornadas(bolsa.saldo + (dia?.compensa || 0), jornadas) : horas(bolsa.saldo + (dia?.compensa || 0))}</strong></p>
            )}
          </div>
        )}
        {notas && <NotasDelDia fecha={fechas[0]} notas={notas} cambiadas={notasCambiadas} />}
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

// Notas de un día: se guardan al momento (no dependen de "Guardar" el horario).
function NotasDelDia({ fecha, notas, cambiadas }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const hacer = (fn) => fn().then(cambiadas).catch((err) => setError(err.message));
  const agregar = () => texto.trim() && hacer(async () => {
    await pedir('/notas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, fechas: [fecha] }) });
    setTexto('');
  });
  return (
    <div className="notas-dia">
      <span className="tenue">Notas</span>
      {notas.map((n) => (
        <div key={n.id} className="nota-dia">
          <span>{n.texto}{n.fechas.length > 1 && <small className="tenue"> · en {n.fechas.length} días</small>}</span>
          <button type="button" className="quitar" aria-label="Quitar la nota de este día" onClick={() => hacer(() => pedir(`/notas/${n.id}/fechas/${fecha}`, { method: 'DELETE' }))}>×</button>
        </div>
      ))}
      <div className="nueva-nota">
        <input value={texto} maxLength={500} placeholder="Añadir nota: cambio de turno, cubro a alguien…" onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && agregar()} />
        <button type="button" className="chip" disabled={!texto.trim()} onClick={agregar}>Añadir</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
