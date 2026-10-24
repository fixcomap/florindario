import { useCallback, useEffect, useMemo, useState } from 'react';
import { pedir } from '../api.js';
import { DIAS_CORTOS, desdeIso, hoy, nombreMes, semanasDelMes } from '../fechas.js';
import { horas, minutosDelDia, tramoCorto } from '../horas.js';
import { TIPOS, tipo } from '../datos/tipos.js';
import EditorDia from '../componentes/EditorDia.jsx';

// Mes de lunes a domingo: cada día con su tipo y su horario, las horas de cada
// semana a la derecha y el total del mes abajo. Tocar un día lo edita.
export default function Calendario() {
  const ahora = new Date();
  const [mes, setMes] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
  const [dias, setDias] = useState({}); // fecha -> día
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState('');

  const semanas = useMemo(() => semanasDelMes(mes.anio, mes.mes), [mes]);
  const desde = semanas[0][0];
  const hasta = semanas.at(-1)[6];

  const cargar = useCallback(() => {
    pedir(`/dias?desde=${desde}&hasta=${hasta}`)
      .then((lista) => setDias(Object.fromEntries(lista.map((d) => [d.fecha, d]))))
      .catch((err) => setError(err.message));
  }, [desde, hasta]);
  useEffect(cargar, [cargar]);

  const mover = (n) => setMes(({ anio, mes: m }) => ({ anio: anio + Math.floor((m + n) / 12), mes: (m + n + 12) % 12 }));
  const delMes = (f) => desdeIso(f).getMonth() === mes.mes;
  const totalMes = Object.values(dias).filter((d) => delMes(d.fecha)).reduce((s, d) => s + minutosDelDia(d), 0);

  const guardado = (fecha, d) => setDias((todos) => {
    const copia = { ...todos };
    if (d) copia[fecha] = d;
    else delete copia[fecha];
    return copia;
  });

  return (
    <main>
      <div className="mes">
        <button className="flecha" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
        <h1>{nombreMes(mes.anio, mes.mes)}</h1>
        <button className="flecha" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="cuadricula" role="grid" aria-label={nombreMes(mes.anio, mes.mes)}>
        {DIAS_CORTOS.map((d) => <div key={d} className="cabeza">{d}</div>)}
        <div className="cabeza">h</div>
        {semanas.map((semana) => (
          <Semana key={semana[0]} semana={semana} dias={dias} delMes={delMes} editar={setEditando} />
        ))}
      </div>

      <p className="total-mes">Este mes: <strong>{horas(totalMes)}</strong></p>
      <ul className="leyenda">
        {TIPOS.map((t) => <li key={t.id}><span style={{ background: t.color }} /> {t.nombre}</li>)}
      </ul>

      {editando && (
        <EditorDia fecha={editando} dia={dias[editando]} cerrar={() => setEditando(null)} guardado={guardado} />
      )}
    </main>
  );
}

function Semana({ semana, dias, delMes, editar }) {
  const total = semana.reduce((s, f) => s + minutosDelDia(dias[f]), 0);
  return (
    <>
      {semana.map((f) => {
        const d = dias[f];
        const t = d && tipo(d.tipo);
        return (
          <button
            key={f}
            role="gridcell"
            className={`dia${delMes(f) ? '' : ' fuera'}${f === hoy() ? ' hoy' : ''}`}
            style={t ? { background: t.fondo, borderColor: t.color } : undefined}
            onClick={() => editar(f)}
            aria-label={`${f}${t ? `, ${t.nombre}` : ', sin cargar'}`}
          >
            <span className="numero">{desdeIso(f).getDate()}</span>
            {t && (
              <span className="contenido" style={{ color: t.color }}>
                {d.tipo === 'trabajo' ? d.tramos.map((tr) => <span key={tr.inicio}>{tramoCorto(tr)}</span>) : <span>{t.icono}</span>}
              </span>
            )}
          </button>
        );
      })}
      <div className="semana-total" role="gridcell">{total ? horas(total).replace(' h ', ':').replace(' h', '') : ''}</div>
    </>
  );
}
