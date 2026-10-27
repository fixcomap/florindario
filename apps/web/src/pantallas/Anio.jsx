import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { horas } from '../horas.js';
import FlechaMes from '../componentes/FlechaMes.jsx';
import ResumenAnio from '../componentes/ResumenAnio.jsx';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// El año de un vistazo: horas por mes (barras), totales y los contadores de días.
// Tocar una barra muestra ese mes arriba; el año llega en la URL (/anio?2026).
export default function Anio({ usuario }) {
  const ahora = new Date();
  const [anio, setAnio] = useState(() => Number(window.location.search.slice(1)) || ahora.getFullYear());
  const [resumen, setResumen] = useState(null);
  const [elegido, setElegido] = useState(anio === ahora.getFullYear() ? ahora.getMonth() : 0);
  const [error, setError] = useState('');

  useEffect(() => {
    window.history.replaceState(null, '', `/anio?${anio}`);
    pedir(`/resumen?anio=${anio}`).then(setResumen).catch((err) => setError(err.message));
  }, [anio]);

  const cambiarAnio = (n) => { setResumen(null); setElegido(0); setAnio(anio + n); };
  const meses = resumen?.meses || [];
  const total = meses.reduce((s, m) => s + m.minutos, 0);
  const conHoras = meses.filter((m) => m.minutos > 0);
  const extraDinero = meses.reduce((s, m) => s + m.extraDinero, 0);
  const extraHoras = meses.reduce((s, m) => s + m.extraHoras, 0);
  const maximo = Math.max(1, ...meses.map((m) => m.minutos));
  const mes = meses[elegido];

  return (
    <main className="anio-pantalla">
      <div className="mes">
        <FlechaMes onClick={() => cambiarAnio(-1)} etiqueta="Año anterior" />
        <h1 className="anio-titulo">{anio}</h1>
        <FlechaMes siguiente onClick={() => cambiarAnio(1)} etiqueta="Año siguiente" />
      </div>
      {error && <p className="error">{error}</p>}
      {resumen && (
        <>
          <div className="cifras">
            <div><small>Horas en el año</small><strong>{horas(total)}</strong></div>
            <div><small>Media por mes</small><strong>{conHoras.length ? horas(Math.round(total / conHoras.length)) : '—'}</strong></div>
            <div><small>Extra pagadas</small><strong>{horas(extraDinero)}</strong></div>
            <div><small>Extra a la bolsa</small><strong>{horas(extraHoras)}</strong></div>
          </div>

          <section className="grafico-meses" aria-labelledby="titulo-meses">
            <h2 id="titulo-meses">Horas por mes</h2>
            <p className="dato-mes"><span>{MESES[elegido]}</span> <strong>{horas(mes?.minutos || 0)}</strong>
              {mes && (mes.extraDinero + mes.extraHoras) > 0 && <small> · {horas(mes.extraDinero + mes.extraHoras)} extra</small>}</p>
            <div className="barras">
              {meses.map((m) => (
                <button key={m.mes} type="button" className={`barra-mes${m.mes === elegido ? ' elegida' : ''}`}
                  aria-label={`${MESES[m.mes]}: ${horas(m.minutos)}`} aria-pressed={m.mes === elegido}
                  title={`${MESES[m.mes]}: ${horas(m.minutos)}`} onClick={() => setElegido(m.mes)}>
                  <span className="relleno" style={{ height: `${(m.minutos / maximo) * 100}%` }} />
                  <span className="letra">{MESES[m.mes][0].toUpperCase()}</span>
                </button>
              ))}
            </div>
            <table className="solo-lectores">
              <caption>Horas por mes en {anio}</caption>
              <tbody>{meses.map((m) => <tr key={m.mes}><th scope="row">{MESES[m.mes]}</th><td>{horas(m.minutos)}</td></tr>)}</tbody>
            </table>
          </section>

          <ResumenAnio resumen={resumen} usuario={usuario} enlace={false} />
        </>
      )}
      <p><a href="/">← Volver al calendario</a></p>
    </main>
  );
}
