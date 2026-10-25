import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { resumen } from '../plantillas.js';
import { TIPOS } from '../datos/tipos.js';
import { horas } from '../horas.js';
import Tramos from '../componentes/Tramos.jsx';
import Duracion from '../componentes/Duracion.jsx';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const JSON_ = { 'Content-Type': 'application/json' };
const dos = (n) => String(n).padStart(2, '0');
const mas = (hhmm, min) => {
  const t = (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) + min) % 1440;
  return `${dos(Math.floor(t / 60))}:${dos(t % 60)}`;
};

// Turnos base de una jornada, con la duración de su día: se cargan en el editor y se retocan.
function bases(j) {
  const turno = (inicio) => ({ tipo: 'trabajo', tramos: [{ inicio, fin: mas(inicio, j.minutosDia) }] });
  const libre = { tipo: 'libre', tramos: [] };
  const semana = (d) => [d, d, d, d, d, libre, libre];
  return [
    { nombre: 'Mañana', dias: semana(turno('07:00')) },
    { nombre: 'Tarde', dias: semana(turno('15:00')) },
    { nombre: 'Noche', dias: semana(turno('23:00')) },
  ];
}

const JORNADAS_BASE = [
  { nombre: 'Jornada 20 h', minutosDia: 240 },
  { nombre: 'Jornada 30 h', minutosDia: 360 },
  { nombre: 'Jornada 40 h', minutosDia: 480 },
];

// Primero las jornadas (cuánto dura un día de trabajo) y, dentro de cada una, sus plantillas.
export default function Plantillas() {
  const [jornadas, setJornadas] = useState([]);
  const [lista, setLista] = useState([]);
  const [plantilla, setPlantilla] = useState(null);
  const [jornada, setJornada] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => Promise.all([pedir('/jornadas'), pedir('/plantillas')])
    .then(([j, p]) => { setJornadas(j); setLista(p); })
    .catch((err) => setError(err.message));
  useEffect(() => { cargar(); }, []);

  async function borrar(p) {
    if (!window.confirm(`¿Borrar la plantilla «${p.nombre}»? Los días ya cargados no cambian.`)) return;
    await pedir(`/plantillas/${p.id}`, { method: 'DELETE' }).catch((err) => setError(err.message));
    cargar();
  }

  const cerrar = () => { setPlantilla(null); setJornada(null); cargar(); };
  if (plantilla) return <EditorPlantilla inicial={plantilla} jornadas={jornadas} cerrar={cerrar} />;
  if (jornada) return <EditorJornada inicial={jornada} cerrar={cerrar} />;

  const sinJornada = lista.filter((p) => !jornadas.some((j) => j.id === p.jornadaId));
  const Lista = ({ items }) => (
    <ul className="lista-plantillas">
      {items.map((p) => (
        <li key={p.id}>
          <button onClick={() => setPlantilla(p)}><strong>{p.nombre}</strong><span className="tenue">{resumen(p)}</span></button>
          <button className="quitar" aria-label={`Borrar ${p.nombre}`} onClick={() => borrar(p)}>×</button>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="plantillas">
      <h1>Jornadas y plantillas</h1>
      <p className="tenue">Primero tus jornadas (cuánto dura un día de trabajo); dentro de cada una, sus turnos: mañana, tarde, noche…</p>
      {error && <p className="error">{error}</p>}

      {!jornadas.length && (
        <section className="jornada vacia">
          <h2>Empezá por tu jornada</h2>
          <div className="bases">
            {JORNADAS_BASE.map((j) => <button key={j.nombre} className="chip" onClick={() => setJornada(j)}>{j.nombre} · {horas(j.minutosDia)}/día</button>)}
            <button className="chip" onClick={() => setJornada({ nombre: '', minutosDia: 480 })}>Otra</button>
          </div>
        </section>
      )}

      {jornadas.map((j) => (
        <section key={j.id} className="jornada">
          <header>
            <div><h2>{j.nombre}</h2><span className="tenue">{horas(j.minutosDia)} por día</span></div>
            <button className="enlace" onClick={() => setJornada(j)}>Editar</button>
          </header>
          <Lista items={lista.filter((p) => p.jornadaId === j.id)} />
          <div className="bases">
            {bases(j).map((b) => <button key={b.nombre} className="chip" onClick={() => setPlantilla({ ...b, jornadaId: j.id })}>+ {b.nombre}</button>)}
            <button className="chip" onClick={() => setPlantilla({ nombre: '', dias: Array(7).fill(null), jornadaId: j.id })}>+ Otra</button>
          </div>
        </section>
      ))}

      {sinJornada.length > 0 && (
        <section className="jornada">
          <header><div><h2>Sin jornada</h2><span className="tenue">Editalas para asignarles una jornada</span></div></header>
          <Lista items={sinJornada} />
        </section>
      )}

      {jornadas.length > 0 && <button className="boton secundario" onClick={() => setJornada({ nombre: '', minutosDia: 480 })}>+ Nueva jornada</button>}
      <p><a href="/">← Volver al calendario</a></p>
    </main>
  );
}

function EditorJornada({ inicial, cerrar }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [minutosDia, setMinutosDia] = useState(inicial.minutosDia);
  const [error, setError] = useState('');

  const hacer = (fn) => fn().then(cerrar).catch((err) => setError(err.message));
  const guardar = () => hacer(() => pedir(inicial.id ? `/jornadas/${inicial.id}` : '/jornadas', {
    method: inicial.id ? 'PUT' : 'POST', headers: JSON_, body: JSON.stringify({ nombre, minutosDia }),
  }));
  const borrar = () => window.confirm(`¿Borrar «${inicial.nombre}»? Sus plantillas quedan sin jornada.`)
    && hacer(() => pedir(`/jornadas/${inicial.id}`, { method: 'DELETE' }));

  return (
    <main className="plantillas">
      <h1>{inicial.id ? 'Editar jornada' : 'Nueva jornada'}</h1>
      <label>Nombre<input value={nombre} maxLength={40} placeholder="Ej.: Jornada 20 h" onChange={(e) => setNombre(e.target.value)} /></label>
      <Duracion etiqueta="Un día de trabajo dura" valor={minutosDia} cambiar={setMinutosDia} />
      <p className="tenue">Se usa para proponer los turnos y para contar las extras en jornadas.</p>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button className="boton" onClick={guardar}>Guardar jornada</button>
        {inicial.id && <button className="boton secundario peligro" onClick={borrar}>Borrar jornada</button>}
        <button className="enlace" onClick={cerrar}>Cancelar</button>
      </div>
    </main>
  );
}

function EditorPlantilla({ inicial, jornadas, cerrar }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [dias, setDias] = useState(inicial.dias);
  const [jornadaId, setJornadaId] = useState(inicial.jornadaId || '');
  const [error, setError] = useState('');
  const cambiarDia = (i, d) => setDias(dias.map((x, k) => (k === i ? d : x)));
  const copiarLunes = () => setDias(dias.map((d, i) => (i < 5 ? dias[0] : d)));

  function cambiarTipo(i, valor) {
    if (!valor) return cambiarDia(i, null);
    const anterior = dias[i]?.tipo === 'trabajo' ? dias[i].tramos : null;
    cambiarDia(i, { tipo: valor, tramos: valor === 'trabajo' ? anterior || [{ inicio: '09:00', fin: '13:00' }] : [] });
  }

  async function guardar() {
    setError('');
    try {
      await pedir(inicial.id ? `/plantillas/${inicial.id}` : '/plantillas', {
        method: inicial.id ? 'PUT' : 'POST',
        headers: JSON_,
        body: JSON.stringify({ nombre, dias, jornadaId: jornadaId || null }),
      });
      cerrar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="plantillas">
      <h1>{inicial.id ? 'Editar plantilla' : 'Nueva plantilla'}</h1>
      <label>Nombre<input value={nombre} maxLength={40} placeholder="Ej.: Mañana" onChange={(e) => setNombre(e.target.value)} /></label>
      <label>Jornada
        <select className="select" value={jornadaId} onChange={(e) => setJornadaId(e.target.value)}>
          <option value="">Sin jornada</option>
          {jornadas.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
        </select>
      </label>
      <ul className="semana-plantilla">
        {dias.map((d, i) => (
          <li key={i}>
            <div className="fila-dia">
              <strong>{DIAS[i]}</strong>
              <select value={d?.tipo || ''} onChange={(e) => cambiarTipo(i, e.target.value)} aria-label={`Tipo del ${DIAS[i]}`}>
                <option value="">— No tocar</option>
                {TIPOS.filter((t) => t.id !== 'compensado').map((t) => <option key={t.id} value={t.id}>{t.icono} {t.nombre}</option>)}
              </select>
            </div>
            {d?.tipo === 'trabajo' && <Tramos compacto tramos={d.tramos} cambiar={(tramos) => cambiarDia(i, { ...d, tramos })} />}
            {i === 0 && <button type="button" className="enlace" onClick={copiarLunes}>Copiar el lunes de martes a viernes</button>}
          </li>
        ))}
      </ul>
      <p className="tenue">{resumen({ dias })}</p>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button className="boton" onClick={guardar}>Guardar plantilla</button>
        <button className="enlace" onClick={cerrar}>Cancelar</button>
      </div>
    </main>
  );
}
