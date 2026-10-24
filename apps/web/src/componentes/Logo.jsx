// Flor de Florindario: cinco pétalos y el centro; decorativa junto al nombre.
export default function Logo({ className }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="20" cy="10.5" rx="6.2" ry="9.5" fill="#e9a3b8" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="5.2" fill="#f2c14e" />
      <circle cx="20" cy="20" r="5.2" fill="none" stroke="#d9a325" strokeWidth="1" />
    </svg>
  );
}
