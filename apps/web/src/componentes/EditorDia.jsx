import { useState } from 'react';
import { pedir } from '../api.js';
import { desdeIso, diaLargo } from '../fechas.js';
import { TIPOS, aspecto } from '../datos/tipos.js';
import Tramos from './Tramos.jsx';
import Personaje from './Personaje.jsx';
import Duracion from './Duracion.jsx';
import { horas, minutosDelDia, tramoCorto } from '../horas.js';
import { saldoEnDias } from '../jornadas.js';
import CantidadDias from './CantidadDias.jsx';

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
export default function EditorDia({ fechas, dia, plantillas = [], jornadas = [], modoBolsa = 'jornadas', bolsa, cerrar, guardado, notas, notasCambiadas }) {
  const todos = turnosDePlantillas(plantillas, fechas[0]);
  // Paso 1: la jornada (solo las que tienen turnos; "Sin jornada" si hay plantillas sueltas).
  const grupos = [
    ...jornadas,
    ...(todos.some((t) => !jornadas.some((j) => j.id === t.jornadaId)) ? [{ id: null, nombre: 'Sin jornada' }] : []),
  ];
  const deGrupo = (g) => todos.filter((t) => (g.id ? t.jornadaId === g.id : !jornadas.some((j) => j.id === t.jornadaId)));
  const actual = dia?.tipo === 'trabajo' ? todos.find((t) => clave(t.tramos) === clave(dia.tramos)) : null;
  const [grupoId, setGrupoId] = useState(() => {
    if (dia?.jornadaId && grupos.some((g) => g.id === dia.jornadaId)) return dia.jornadaId;
    if (actual) return grupos.find((g) => deGrupo(g).includes(actual))?.id ?? null;
    return (grupos.find((g) => deGrupo(g).length) || grupos[0])?.id ?? null;
  });
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
    if (eleccion.startsWith('p:') || eleccion === 'otro') setEleccion(primero ? `p:${primero.id}` : 'otro');
  };
  const tipoDia = turno || eleccion === 'otro' ? 'trabajo' : eleccion;
  const [propios, setPropios] = useState(dia?.tipo === 'trabajo' ? dia.tramos : [TRAMO]);
  const tramos = turno ? turno.tramos : propios;
  const [extra, setExtra] = useState(dia?.extra || null);
  const [compensa, setCompensa] = useState(dia?.compensa || jornadas[0]?.minutosDia || 480);
  const [compensaJornadaId, setCompensaJornadaId] = useState(dia?.compensaJornadaId || jornadas[0]?.id || null);
  const enJornadas = modoBolsa === 'jornadas' && jornadas.length > 0;
  const jornadaDe = (id) => jornadas.find((j) => j.id === id);
  // Jornada del día que se carga (paso 1), para contar la extra en días de esa jornada.
  const jornadaDelDia = jornadaDe(grupo?.id) || jornadas[0];
  const extraEnDias = enJornadas && extra?.pago === 'horas';
  const jornadaExtra = jornadaDe(extra?.jornadaId) || jornadaDelDia;
  const compensaJornada = jornadaDe(compensaJornadaId) || jornadas[0];
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
      jornadaId: tipoDia === 'trabajo' ? (jornadaDe(grupo?.id)?.id ?? null) : null,
      extra: tipoDia === 'trabajo' && extra
        ? (extraEnDias ? { ...extra, jornadaId: jornadaExtra.id } : { ...extra, jornadaId: null, minutos: Math.min(extra.minutos, trabajadas) })
        : null,
      compensa: tipoDia === 'compensado' ? compensa : 0,
      compensaJornadaId: tipoDia === 'compensado' && enJornadas ? compensaJornada.id : null,
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
                <button key={g.id ?? 'sin'} type="button" className={g === grupo ? 'activo' : ''} aria-pressed={g === grupo} onClick={() => elegirGrupo(g)}><Personaje tipo={aspecto({ tipo: 'trabajo', jornadaId: g.id }, jornadas).personaje} className="miniatura" />{g.nombre}</button>
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
              onClick={() => setEleccion(t.id)}>{t.personaje ? <Personaje tipo={t.personaje} className="miniatura" /> : <span className="miniatura sin-dibujo" aria-hidden="true">{t.icono}</span>}{t.nombre}</button>
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
                {modoBolsa !== 'ninguna' && <div className="tipos">
                  {[['dinero', '💶 Me las pagan'], ['horas', enJornadas ? '🗓 Días compensatorios' : '🕒 Horas libres']].map(([id, texto]) => (
                    <button key={id} type="button" className={extra.pago === id ? 'activo' : ''} aria-pressed={extra.pago === id}
                      onClick={() => setExtra({
                        ...extra, pago: id, cobrada: id === 'dinero' && extra.cobrada,
                        ...(id === 'horas' && enJornadas ? { minutos: jornadaExtra.minutosDia, jornadaId: jornadaExtra.id } : {}),
                      })}>{texto}</button>
                  ))}
                </div>}
                {modoBolsa === 'jornadas' && !jornadas.length && extra.pago === 'horas' && (
                  <p className="tenue pista">Creá tus jornadas en <a href="/plantillas">Plantillas</a> para contarlos en días compensatorios.</p>
                )}
                {extraEnDias ? (
                  <CantidadDias jornadas={jornadas} jornada={jornadaExtra} minutos={extra.minutos} cambiar={(v) => setExtra({ ...extra, ...v })} />
                ) : (
                  <div className="fila-extra">
                    <Duracion etiqueta="¿Cuántas?" valor={extra.minutos} cambiar={(minutos) => setExtra({ ...extra, minutos })} />
                    <button type="button" className="chip" onClick={() => setExtra({ ...extra, minutos: trabajadas })}>Todo el día ({horas(trabajadas)})</button>
                  </div>
                )}
                {extra.pago === 'dinero' && (
                  <label className="casilla"><input type="checkbox" checked={extra.cobrada} onChange={(e) => setExtra({ ...extra, cobrada: e.target.checked })} /><span>Ya las cobré</span></label>
                )}
                {!extraEnDias && extra.minutos > trabajadas && <p className="error">No pueden ser más que las {horas(trabajadas)} trabajadas.</p>}
              </>
            )}
          </div>
        )}

        {tipoDia === 'compensado' && (
          <div className="extra">
            {enJornadas ? (
              <>
                <p className="paso">Días compensatorios que usás</p>
                <CantidadDias jornadas={jornadas} jornada={compensaJornada} minutos={compensa}
                  cambiar={({ minutos, jornadaId }) => { setCompensa(minutos); setCompensaJornadaId(jornadaId); }} />
              </>
            ) : (
              <Duracion etiqueta="Horas libres que usás" valor={compensa} cambiar={setCompensa} />
            )}
            {bolsa && (
              <p className="tenue">Te deben: <strong>{enJornadas ? saldoEnDias(bolsa.saldo + (dia?.compensa || 0), bolsa.porJornada, jornadas) : horas(bolsa.saldo + (dia?.compensa || 0))}</strong></p>
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
