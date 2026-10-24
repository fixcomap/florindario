import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { resumen } from '../plantillas.js';
import { TIPOS } from '../datos/tipos.js';
import Tramos from '../componentes/Tramos.jsx';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const trabajo = (inicio, fin) => ({ tipo: 'trabajo', tramos: [{ inicio, fin }] });
const semana = (laborable, finde = { tipo: 'libre', tramos: [] }) => [...Array(5).fill(laborable), finde, finde];

// Bases para no empezar de cero: se cargan en el editor y se retocan.
const BASES = [
  { nombre: 'Mañana', dias: semana(trabajo('07:00', '15:00')) },
  { nombre: 'Tarde', dias: semana(trabajo('15:00', '23:00')) },
  { nombre: 'Noche', dias: semana(trabajo('23:00', '07:00')) },
  { nombre: 'Partida', dias: semana({ tipo: 'trabajo', tramos: [{ inicio: '09:00', fin: '14:00' }, { inicio: '17:00', fin: '20:00' }] }) },
  { nombre: 'Media jornada', dias: semana(trabajo('09:00', '13:00')) },
];

export default function Plantillas() {
  const [lista, setLista] = useState(null);
  const [editando, setEditando] = useState(null); // { id?, nombre, dias }
  const [error, setError] = useState('');

  const cargar = () => pedir('/plantillas').then(setLista).catch((err) => setError(err.message));
  useEffect(() => { cargar(); }, []);

  async function borrar(p) {
    if (!window.confirm(`¿Borrar la plantilla «${p.nombre}»? Los días ya cargados no cambian.`)) return;
    await pedir(`/plantillas/${p.id}`, { method: 'DELETE' }).catch((err) => setError(err.message));
    cargar();
  }

  if (editando) return <EditorPlantilla inicial={editando} cerrar={() => { setEditando(null); cargar(); }} />;

  return (
    <main className="plantillas">
      <h1>Plantillas</h1>
      <p className="tenue">Una semana tipo que aplicás de una vez a los días que elijas en el calendario.</p>
      {error && <p className="error">{error}</p>}
      <ul className="lista-plantillas">
        {lista?.map((p) => (
          <li key={p.id}>
            <button onClick={() => setEditando(p)}>
              <strong>{p.nombre}</strong>
              <span className="tenue">{resumen(p)}</span>
            </button>
            <button className="quitar" aria-label={`Borrar ${p.nombre}`} onClick={() => borrar(p)}>×</button>
          </li>
        ))}
      </ul>
      <h2>Nueva plantilla</h2>
      <div className="bases">
        {BASES.map((b) => <button key={b.nombre} className="chip" onClick={() => setEditando(b)}>{b.nombre}</button>)}
        <button className="chip" onClick={() => setEditando({ nombre: '', dias: Array(7).fill(null) })}>En blanco</button>
      </div>
      <p><a href="/">← Volver al calendario</a></p>
    </main>
  );
}

function EditorPlantilla({ inicial, cerrar }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [dias, setDias] = useState(inicial.dias);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, dias }),
      });
      cerrar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="plantillas">
      <h1>{inicial.id ? 'Editar plantilla' : 'Nueva plantilla'}</h1>
      <label>Nombre<input value={nombre} maxLength={40} placeholder="Ej.: Mañana 40 h" onChange={(e) => setNombre(e.target.value)} /></label>
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
