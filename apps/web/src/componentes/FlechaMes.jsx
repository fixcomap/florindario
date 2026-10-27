// Flecha para cambiar de mes: círculo de acento con el chevron en blanco; la de
// "siguiente" es la misma en espejo.
export default function FlechaMes({ siguiente = false, onClick, etiqueta }) {
  return (
    <button className="flecha" onClick={onClick} aria-label={etiqueta || (siguiente ? 'Mes siguiente' : 'Mes anterior')}>
      <svg viewBox="0 0 40 40" aria-hidden="true" style={siguiente ? { transform: 'scaleX(-1)' } : undefined}>
        <circle cx="20" cy="20" r="17" fill="var(--acento)" />
        <path d="M23 12.5 L15.5 20 L23 27.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
