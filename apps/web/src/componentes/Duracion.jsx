// Duración en minutos como horas + minutos (sin el reloj AM/PM del móvil).
export default function Duracion({ valor, cambiar, etiqueta }) {
  const h = Math.floor(valor / 60);
  const m = valor % 60;
  return (
    <div className="duracion">
      <label>{etiqueta}
        <span className="duracion-campos">
          <input type="number" inputMode="numeric" min="0" max="24" value={h} aria-label="Horas"
            onChange={(e) => cambiar(Math.min(24, Math.max(0, Number(e.target.value) || 0)) * 60 + m)} />
          <span>h</span>
          <select value={m} aria-label="Minutos" onChange={(e) => cambiar(h * 60 + Number(e.target.value))}>
            {[0, 15, 30, 45].map((x) => <option key={x} value={x}>{String(x).padStart(2, '0')}</option>)}
          </select>
          <span>min</span>
        </span>
      </label>
    </div>
  );
}
