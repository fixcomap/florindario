import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { resumen } from '../plantillas.js';
import { TIPOS, aspecto } from '../datos/tipos.js';
import Personaje from '../componentes/Personaje.jsx';
import { horas } from '../horas.js';
import { DIAS_CORTOS } from '../fechas.js';
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
  const [domingo, setDomingo] = useState(inicial.domingo || 'normal');
  const [domingoDias, setDomingoDias] = useState(Number(inicial.domingoDias) || 1);
  const [error, setError] = useState('');

  const hacer = (fn) => fn().then(cerrar).catch((err) => setError(err.message));
  const guardar = () => hacer(() => pedir(inicial.id ? `/jornadas/${inicial.id}` : '/jornadas', {
    method: inicial.id ? 'PUT' : 'POST', headers: JSON_, body: JSON.stringify({ nombre, minutosDia, domingo, domingoDias }),
  }));
  const borrar = () => window.confirm(`¿Borrar «${inicial.nombre}»? Sus plantillas quedan sin jornada.`)
    && hacer(() => pedir(`/jornadas/${inicial.id}`, { method: 'DELETE' }));

  return (
    <main className="plantillas">
      <h1>{inicial.id ? 'Editar jornada' : 'Nueva jornada'}</h1>
      <label>Nombre<input value={nombre} maxLength={40} placeholder="Ej.: Jornada 20 h" onChange={(e) => setNombre(e.target.value)} /></label>
      <Duracion etiqueta="Un día de trabajo dura" valor={minutosDia} cambiar={setMinutosDia} />
      <p className="tenue">Se usa para proponer los turnos y para contar las extras en jornadas.</p>
      <p className="paso">Si trabajás un domingo en esta jornada</p>
      {[['normal', 'Nada especial'], ['libres', 'Me dan días libres'], ['pago', 'Me lo pagan (a mes vencido)']].map(([id, texto]) => (
        <label key={id} className="opcion">
          <input type="radio" name="domingo" checked={domingo === id} onChange={() => setDomingo(id)} />
          <span><strong>{texto}</strong>{id === 'pago' && <small>Aparece en el sueldo del mes siguiente; el importe va en Cuenta → Sueldo.</small>}</span>
        </label>
      ))}
      {domingo === 'libres' && (
        <div className="contador">
          <button type="button" aria-label="Menos" disabled={domingoDias <= 0.5} onClick={() => setDomingoDias(domingoDias - 0.5)}>−</button>
          <span><strong>{String(domingoDias).replace('.5', '½').replace(/^0½/, '½')} {domingoDias > 1 ? 'días' : 'día'}</strong> libre por domingo</span>
          <button type="button" aria-label="Más" disabled={domingoDias >= 5} onClick={() => setDomingoDias(domingoDias + 0.5)}>+</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button className="boton" onClick={guardar}>Guardar jornada</button>
        {inicial.id && <button className="boton secundario peligro" onClick={borrar}>Borrar jornada</button>}
        <button className="enlace" onClick={cerrar}>Cancelar</button>
      </div>
    </main>
  );
}

// Días iguales de la plantilla juntos en un horario: [{ dias: [0..6], dia }]. Los
// días que no están en ningún horario no se tocan al aplicarla.
function agruparDias(dias) {
  const grupos = [];
  dias.forEach((d, i) => {
    if (!d) return;
    const clave = JSON.stringify(d);
    const g = grupos.find((x) => JSON.stringify(x.dia) === clave);
    if (g) g.dias.push(i);
    else grupos.push({ dias: [i], dia: d });
  });
  return grupos.length ? grupos : [{ dias: [], dia: { tipo: 'trabajo', tramos: [{ inicio: '09:00', fin: '13:00' }] } }];
}

function EditorPlantilla({ inicial, jornadas, cerrar }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [grupos, setGrupos] = useState(() => agruparDias(inicial.dias));
  const [jornadaId, setJornadaId] = useState(inicial.jornadaId || '');
  const [error, setError] = useState('');
  const dias = Array.from({ length: 7 }, (_, i) => grupos.find((g) => g.dias.includes(i))?.dia || null);
  const cambiarGrupo = (k, g) => setGrupos(grupos.map((x, n) => (n === k ? g : x)));

  // Un día está como mucho en un horario: al marcarlo en uno se quita de los demás.
  function alternarDia(k, i) {
    const marcado = grupos[k].dias.includes(i);
    setGrupos(grupos.map((g, n) => {
      if (n === k) return { ...g, dias: marcado ? g.dias.filter((x) => x !== i) : [...g.dias, i].sort() };
      return marcado ? g : { ...g, dias: g.dias.filter((x) => x !== i) };
    }));
  }

  function cambiarTipo(k, valor) {
    const g = grupos[k];
    const anterior = g.dia.tipo === 'trabajo' ? g.dia.tramos : null;
    cambiarGrupo(k, { ...g, dia: { tipo: valor, tramos: valor === 'trabajo' ? anterior || [{ inicio: '09:00', fin: '13:00' }] : [] } });
  }

  const libres = [0, 1, 2, 3, 4, 5, 6].filter((i) => !dias[i]);
  const otroHorario = () => setGrupos([...grupos, { dias: [], dia: { tipo: 'libre', tramos: [] } }]);

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
        {grupos.map((g, k) => (
          <li key={k}>
            <div className="dias-horario" role="group" aria-label={`Días del horario ${k + 1}`}>
              {DIAS_CORTOS.map((c, i) => (
                <button key={i} type="button" className={`dia-chip${g.dias.includes(i) ? ' activo' : ''}`}
                  aria-pressed={g.dias.includes(i)} aria-label={DIAS[i]} onClick={() => alternarDia(k, i)}>{c}</button>
              ))}
            </div>
            <div className="tipos" role="group" aria-label={`Tipo del horario ${k + 1}`}>
              {TIPOS.filter((t) => t.id !== 'compensado').map((t) => {
                const a = aspecto({ tipo: t.id, jornadaId }, jornadas);
                const activo = g.dia.tipo === t.id;
                return (
                  <button key={t.id} type="button" className={activo ? 'activo' : ''} aria-pressed={activo}
                    style={activo ? { background: a.fondo, borderColor: a.color, color: a.color } : undefined}
                    onClick={() => cambiarTipo(k, t.id)}><Personaje tipo={a.personaje} className="miniatura" />{t.nombre}</button>
                );
              })}
            </div>
            {grupos.length > 1 && <button type="button" className="enlace quitar-horario" onClick={() => setGrupos(grupos.filter((_, n) => n !== k))}>Quitar este horario</button>}
            {g.dia.tipo === 'trabajo' && <Tramos compacto tramos={g.dia.tramos} cambiar={(tramos) => cambiarGrupo(k, { ...g, dia: { ...g.dia, tramos } })} />}
          </li>
        ))}
      </ul>
      <button type="button" className="chip" onClick={otroHorario}>+ Otro horario</button>
      {libres.length > 0 && <p className="tenue">Sin tocar al aplicarla: {libres.map((i) => DIAS[i].toLowerCase()).join(', ')}.</p>}
      <p className="tenue">{resumen({ dias })}</p>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button className="boton" onClick={guardar}>Guardar plantilla</button>
        <button className="enlace" onClick={cerrar}>Cancelar</button>
      </div>
    </main>
  );
}
