// Personajes del calendario: una ilustración por tipo de día (y por jornada en los
// días de trabajo). Decorativas: el día ya lleva su aria-label.
import jornada1 from '../assets/personajes/jornada1.jpg';
import jornada2 from '../assets/personajes/jornada2.jpg';
import libre from '../assets/personajes/libre.jpg';
import vacaciones from '../assets/personajes/vacaciones.jpg';
import baja from '../assets/personajes/baja.jpg';
import festivo from '../assets/personajes/festivo.jpg';
import compensado from '../assets/personajes/compensado.jpg';

// Libre disposición: la de vacaciones, pasada a verde por CSS (.personaje-disposicion).
const IMAGENES = { j1: jornada1, j2: jornada2, libre, vacaciones, baja, festivo, compensado, disposicion: vacaciones };

export default function Personaje({ tipo, className }) {
  const src = IMAGENES[tipo];
  if (!src) return null;
  return <img className={`${className || ''} personaje-${tipo}`} src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
}
