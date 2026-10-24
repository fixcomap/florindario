import { horas, minutosDelDia } from '../horas.js';

// Tramos de un día de trabajo: 1 a 3 (jornada partida); fin antes que inicio = noche.
export default function Tramos({ tramos, cambiar, compacto }) {
  const cambiarTramo = (i, campo, valor) => cambiar(tramos.map((t, k) => (k === i ? { ...t, [campo]: valor } : t)));
  return (
    <div className="tramos">
      {tramos.map((t, i) => (
        <div key={i} className="tramo">
          <label>{compacto ? '' : 'Entrada'}<input type="time" aria-label="Entrada" value={t.inicio} onChange={(e) => cambiarTramo(i, 'inicio', e.target.value)} /></label>
          <label>{compacto ? '' : 'Salida'}<input type="time" aria-label="Salida" value={t.fin} onChange={(e) => cambiarTramo(i, 'fin', e.target.value)} /></label>
          {tramos.length > 1 && <button type="button" className="quitar" aria-label="Quitar tramo" onClick={() => cambiar(tramos.filter((_, k) => k !== i))}>×</button>}
        </div>
      ))}
      <p className="tenue pie-tramos">
        {tramos.length < 3 && <button type="button" className="enlace" onClick={() => cambiar([...tramos, { inicio: '17:00', fin: '21:00' }])}>+ Jornada partida</button>}
        <span>{horas(minutosDelDia({ tipo: 'trabajo', tramos }))}{tramos.some((t) => t.fin <= t.inicio) && ' · noche'}</span>
      </p>
    </div>
  );
}
