import Personaje from './Personaje.jsx';

// Contadores del año: vacaciones (gastadas y, si hay total, las que quedan), bajas, festivos...
const CONTADOS = [['baja', 'Baja'], ['festivo', 'Festivos'], ['libre', 'Libres'], ['compensado', 'Compensados']];
export default function ResumenAnio({ resumen, usuario, enlace = true }) {
  const vacacionesAnuales = usuario?.vacacionesAnuales || 0;
  const disposicion = usuario?.diasDisposicion || 0;
  const vac = resumen.dias.vacaciones || 0;
  const quedan = vacacionesAnuales - vac;
  const usados = resumen.dias.disposicion || 0;
  const otros = CONTADOS.filter(([id]) => resumen.dias[id]);
  return (
    <section className="resumen-anio" aria-label={`Resumen de ${resumen.anio}`}>
      <h2>En {resumen.anio}{enlace && <a className="ver-anio" href={`/anio?${resumen.anio}`}>Ver el año →</a>}</h2>
      <div className="contador vacaciones">
        <Personaje tipo="vacaciones" className="miniatura" />
        <span>
          <strong>Vacaciones <span className="tenue">· {usuario?.vacacionesComputo === 'naturales' ? 'naturales' : 'hábiles'}</span></strong>
          {vacacionesAnuales
            ? <small>{vac} de {vacacionesAnuales} · {quedan >= 0 ? `te quedan ${quedan}` : `${-quedan} de más`}</small>
            : <small>{vac} {vac === 1 ? 'día' : 'días'} · <a href="/cuenta">poné tu total anual</a></small>}
        </span>
        {vacacionesAnuales > 0 && <span className="barra" aria-hidden="true"><span style={{ width: `${Math.min(100, (vac / vacacionesAnuales) * 100)}%` }} /></span>}
      </div>
      {(disposicion > 0 || usados > 0) && (
        <div className="contador">
          <Personaje tipo="disposicion" className="miniatura" />
          <span>
            <strong>Libre disposición</strong>
            <small>{disposicion ? `${usados} de ${disposicion} · ${disposicion - usados >= 0 ? `te quedan ${disposicion - usados}` : `${usados - disposicion} de más`}` : `${usados} ${usados === 1 ? 'día' : 'días'}`}</small>
          </span>
        </div>
      )}
      {otros.length > 0 && (
        <ul className="contadores">
          {otros.map(([id, nombre]) => (
            <li key={id}><Personaje tipo={id} className="miniatura" /><strong>{resumen.dias[id]}</strong> {nombre.toLowerCase()}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
