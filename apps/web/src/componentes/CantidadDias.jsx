// Cantidad de días (de ½ en ½) en una jornada: [−] 1 día en Jornada 20 h [+].
export default function CantidadDias({ jornadas, jornada, minutos, cambiar }) {
  const dias = Math.round((minutos / jornada.minutosDia) * 2) / 2 || 1;
  const poner = (n, j = jornada) => cambiar({ minutos: Math.round(n * j.minutosDia), jornadaId: j.id });
  const texto = (n) => `${String(n).replace('.5', '½').replace(/^0½/, '½')} ${n > 1 ? 'días' : 'día'}`;
  return (
    <div className="cantidad-dias">
      <div className="selector-jornada">
        {jornadas.map((j) => (
          <button key={j.id} type="button" className={j.id === jornada.id ? 'activo' : ''} aria-pressed={j.id === jornada.id} onClick={() => poner(dias, j)}>{j.nombre}</button>
        ))}
      </div>
      <div className="contador">
        <button type="button" aria-label="Menos" disabled={dias <= 0.5} onClick={() => poner(dias - 0.5)}>−</button>
        <span><strong>{texto(dias)}</strong> en {jornada.nombre}</span>
        <button type="button" aria-label="Más" disabled={dias >= 5} onClick={() => poner(dias + 0.5)}>+</button>
      </div>
    </div>
  );
}
