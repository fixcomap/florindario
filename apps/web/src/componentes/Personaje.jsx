// Personajes del calendario: uno por tipo de día (y uno por jornada en los días
// de trabajo). Dibujo propio en SVG, 120×120; decorativo: el día ya lleva su aria-label.
const DIBUJOS = {
  j1: (
    <>
      <circle cx="102" cy="18" r="9" fill="#f5c542" />
      <g stroke="#2f2a33" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 106 Q60 98 120 106 V120 H0 Z" fill="#9cc97a" />
        <circle cx="14" cy="98" r="10" fill="#6aa55a" />
        <circle cx="26" cy="96" r="9" fill="#7bb86a" />
        <circle cx="10" cy="90" r="7" fill="#7bb86a" />
        <circle cx="106" cy="98" r="9" fill="#6aa55a" />
        <circle cx="114" cy="92" r="7" fill="#7bb86a" />
        <path d="M47 76 H66 L67 102 H59.5 L57 86 L55 102 H47.5 Z" fill="#4b5f7a" />
        <path d="M44.5 101 H55.5 V107 H43.5 Q43.5 103 44.5 101 Z" fill="#7a4b2a" />
        <path d="M59 101 H70 Q71 103 71 107 H59 Z" fill="#7a4b2a" />
        <path d="M44 51 Q56 44 69 51 L70 78 H43 Z" fill="#f2c230" />
        <path d="M50 51 V77 M63 51 V77" stroke="#c9961a" strokeWidth="2.5" />
        <path d="M44 74 H69" />
        <path d="M45 56 L39 71" strokeWidth="9" />
        <path d="M45 56 L39 71" stroke="#f2c230" strokeWidth="5.5" />
        <circle cx="38.5" cy="73" r="3.6" fill="#f2c6a0" />
        <path d="M85 26 L76 108" strokeWidth="5.5" />
        <path d="M85 26 L76 108" stroke="#b07a45" strokeWidth="3" />
        <path d="M67 54 L78 66" strokeWidth="9" />
        <path d="M67 54 L78 66" stroke="#f2c230" strokeWidth="5.5" />
        <circle cx="80" cy="67" r="3.8" fill="#f2c6a0" />
        <path d="M65 107 H88" strokeWidth="4" />
        <path d="M67 107 V113 M71.5 107 V113 M76 107 V113 M80.5 107 V113 M85 107 V113" />
        <path d="M52 47 H61 V52 H52 Z" fill="#f2c6a0" />
        <circle cx="56.5" cy="38" r="12" fill="#f2c6a0" />
        <circle cx="52.5" cy="39" r="1.7" fill="#2f2a33" />
        <circle cx="60.5" cy="39" r="1.7" fill="#2f2a33" />
        <circle cx="49.5" cy="43" r="2.3" fill="#f4a3a3" stroke="none" />
        <circle cx="63.5" cy="43" r="2.3" fill="#f4a3a3" stroke="none" />
        <path d="M53 44.5 Q56.5 48 60 44.5" fill="none" />
        <ellipse cx="56.5" cy="29" rx="21" ry="5" fill="#e9c46a" />
        <path d="M45 29 Q46 16 56.5 16 Q67 16 68 29 Z" fill="#e9c46a" />
        <path d="M45.6 25 H67.4" stroke="#b8862b" strokeWidth="3.5" />
      </g>
      <circle cx="24" cy="89" r="2.4" fill="#f28fb0" />
      <circle cx="13" cy="97" r="2.2" fill="#fff07a" />
      <circle cx="30" cy="99" r="2.2" fill="#f28fb0" />
      <circle cx="108" cy="95" r="2.2" fill="#fff07a" />
    </>
  ),
  j2: (
    <>
      <g stroke="#2f2a33" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 106 Q60 100 120 106 V120 H0 Z" fill="#c9a27a" />
        <path d="M86 107 Q98 88 114 107 Z" fill="#a9825a" />
        <circle cx="96" cy="99" r="1.5" fill="#7a5a3a" stroke="none" />
        <circle cx="104" cy="102" r="1.5" fill="#7a5a3a" stroke="none" />
        <path d="M77 22 V94" strokeWidth="5.5" />
        <path d="M77 22 V94" stroke="#b07a45" strokeWidth="3" />
        <path d="M70 22 H84" strokeWidth="5" />
        <path d="M69 92 H85 L83 106 Q77 111 71 106 Z" fill="#9aa3ad" />
        <path d="M43 76 H60 L62 102 H54.5 L51.5 86 L50 102 H42.5 Z" fill="#4b5f7a" />
        <path d="M39.5 101 H50.5 V107 H38.5 Q38.5 103 39.5 101 Z" fill="#7a4b2a" />
        <path d="M54 101 H65 Q66 103 66 107 H54 Z" fill="#7a4b2a" />
        <path d="M40 52 Q51 45 63 51 L65 78 H39 Z" fill="#d9473a" />
        <path d="M40 74 H65" />
        <path d="M60 55 L74 50" strokeWidth="9" />
        <path d="M60 55 L74 50" stroke="#d9473a" strokeWidth="5.5" />
        <circle cx="76" cy="49.5" r="3.8" fill="#f2c6a0" />
        <path d="M44 57 L74 62" strokeWidth="9" />
        <path d="M44 57 L74 62" stroke="#d9473a" strokeWidth="5.5" />
        <circle cx="76" cy="62.5" r="3.8" fill="#f2c6a0" />
        <path d="M46 47 H55 V52 H46 Z" fill="#f2c6a0" />
        <circle cx="50.5" cy="38.5" r="12" fill="#f2c6a0" />
        <circle cx="44" cy="43.5" r="2.6" fill="#f08a8a" stroke="none" />
        <circle cx="57" cy="43.5" r="2.6" fill="#f08a8a" stroke="none" />
        <circle cx="46.5" cy="40.2" r="1.6" fill="#2f2a33" />
        <circle cx="54.5" cy="40.2" r="1.6" fill="#2f2a33" />
        <path d="M44 38.6 H49 M52 38.6 H57" strokeWidth="2.2" />
        <path d="M47.5 46 Q49.5 44.5 51.5 46 Q53.5 47.5 55.5 46" fill="none" />
        <path d="M38.5 36 Q38.5 22 50.5 22 Q62.5 22 62.5 36 Z" fill="#d9473a" />
        <path d="M61 34 Q69 33 72 37 H61 Z" fill="#b3261e" />
        <path d="M35 25 Q31.5 31 35 33 Q38.5 31 35 25 Z" fill="#8cc4e6" />
        <path d="M66 18 Q63.5 22.5 66 24 Q68.5 22.5 66 18 Z" fill="#8cc4e6" />
      </g>
    </>
  ),
  libre: (
    <>
      <g stroke="#2f2a33" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <rect x="78" y="10" width="32" height="28" rx="3" fill="#33406b" />
        <path d="M94 10 V38 M78 24 H110" strokeWidth="1.5" />
        <path d="M100 14 A7 7 0 1 0 104 27 A6 6 0 1 1 100 14 Z" fill="#f5e6a8" stroke="none" />
        <circle cx="84" cy="15" r="1" fill="#ffffff" stroke="none" />
        <circle cx="88" cy="31" r="1" fill="#ffffff" stroke="none" />
        <rect x="6" y="48" width="12" height="60" rx="3" fill="#b07a45" />
        <rect x="8" y="98" width="6" height="12" fill="#8a5a2b" />
        <rect x="104" y="98" width="6" height="12" fill="#8a5a2b" />
        <rect x="6" y="88" width="108" height="11" rx="3" fill="#b07a45" />
        <rect x="18" y="79" width="95" height="10" rx="3" fill="#ffffff" />
        <rect x="20" y="60" width="28" height="18" rx="9" fill="#ffffff" />
        <circle cx="35" cy="63" r="11" fill="#f2c6a0" />
        <path d="M29 64 Q31.5 66.5 34 64 M37 64 Q39.5 66.5 42 64" fill="none" />
        <circle cx="36" cy="70.5" r="1.6" fill="#8a3b3b" />
        <circle cx="29" cy="68" r="2.2" fill="#f4a3a3" stroke="none" />
        <path d="M24 60 Q26 46 40 49 Q49 51 55 43 L58 46 Q52 56 44 57 Z" fill="#7fbf8a" />
        <circle cx="57" cy="44" r="3.2" fill="#ffffff" />
        <path d="M42 70 Q74 59 113 72 V89 H40 Z" fill="#5f9a6b" />
        <path d="M58 70 Q60 80 58 89 M80 67 Q82 78 80 89 M100 68 Q102 79 100 89" stroke="#4c8457" fill="none" />
      </g>
      <text x="56" y="34" fontFamily="Fraunces, Georgia, serif" fontSize="11" fontWeight="600" fill="#2f2a33">z</text>
      <text x="63" y="24" fontFamily="Fraunces, Georgia, serif" fontSize="15" fontWeight="600" fill="#2f2a33">Z</text>
    </>
  ),
  vacaciones: (
    <>
      <circle cx="104" cy="16" r="9" fill="#f5c542" />
      <path d="M0 62 H120 V82 H0 Z" fill="#7fd3dc" />
      <path d="M70 68 Q74 65 78 68 Q82 71 86 68 M92 74 Q96 71 100 74 Q104 77 108 74" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <g stroke="#2f2a33" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 80 Q60 74 120 80 V120 H0 Z" fill="#f3e3b8" />
        <path d="M22 112 Q13 72 30 30" strokeWidth="8" fill="none" />
        <path d="M22 112 Q13 72 30 30" stroke="#a0703c" strokeWidth="5" fill="none" />
        <path d="M17 95 H22 M15 80 H20 M17 64 H22 M21 48 H26" strokeWidth="1.5" />
        <path d="M30 30 Q14 15 0 25 Q16 21 30 30 Z" fill="#5aa469" />
        <path d="M30 30 Q15 34 9 54 Q19 38 30 30 Z" fill="#4f9560" />
        <path d="M30 30 Q46 13 62 21 Q46 21 30 30 Z" fill="#5aa469" />
        <path d="M30 30 Q46 32 52 50 Q42 36 30 30 Z" fill="#4f9560" />
        <path d="M30 30 Q28 12 40 4 Q34 18 30 30 Z" fill="#5aa469" />
        <circle cx="28.5" cy="33" r="3" fill="#8a5a2b" />
        <circle cx="33.5" cy="34" r="3" fill="#8a5a2b" />
        <path d="M65 96 L61 110 M104 96 L108 110" strokeWidth="3" />
        <path d="M61 92 H109 V97 H61 Z" fill="#2a9aa8" />
        <path d="M61 97 L51 66 L58 63 L68 92 Z" fill="#2a9aa8" />
        <path d="M55.5 81 L62.5 79 M73 92 V97 M85 92 V97 M97 92 V97" stroke="#ffffff" strokeWidth="2.5" />
        <path d="M78 90 L92 83 L107 89" strokeWidth="9" fill="none" />
        <path d="M78 90 L92 83 L107 89" stroke="#f2c6a0" strokeWidth="5.5" fill="none" />
        <path d="M55 70 Q62 65 67 71 L73 89 L63 93 Z" fill="#f28c38" />
        <circle cx="61" cy="75" r="1.8" fill="#fff07a" stroke="none" />
        <circle cx="66" cy="83" r="1.8" fill="#ffffff" stroke="none" />
        <path d="M63 87 L74 84 L81 91 L67 95 Z" fill="#33406b" />
        <path d="M60 71 L49 62 L54 54" strokeWidth="8" fill="none" />
        <path d="M60 71 L49 62 L54 54" stroke="#f2c6a0" strokeWidth="5" fill="none" />
        <path d="M66 77 L76 82" strokeWidth="8" />
        <path d="M66 77 L76 82" stroke="#f28c38" strokeWidth="5" />
        <path d="M78 71 H86 L84.5 83 H79.5 Z" fill="#f28fb0" />
        <path d="M83 71 L87 63" strokeWidth="1.5" />
        <path d="M85 64 L92 62 L89 67 Z" fill="#f5c542" strokeWidth="1.2" />
        <circle cx="78" cy="82" r="3.4" fill="#f2c6a0" />
        <circle cx="57" cy="57" r="10" fill="#f2c6a0" />
        <rect x="50" y="53" width="6.5" height="4.5" rx="2" fill="#2f2a33" />
        <rect x="58" y="53" width="6.5" height="4.5" rx="2" fill="#2f2a33" />
        <path d="M56.5 55 H58" />
        <path d="M53 62 Q56.5 65 60 62" fill="none" />
        <ellipse cx="56" cy="48" rx="14" ry="3.6" fill="#e9c46a" transform="rotate(-12 56 48)" />
        <path d="M48 49 Q47 38 55 37 Q63 36 64 46 Z" fill="#e9c46a" />
        <path d="M48.3 45.5 L63.6 43" stroke="#2a9aa8" strokeWidth="3" />
      </g>
    </>
  ),
  baja: (
    <>
      <g stroke="#2f2a33" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M0 106 Q60 100 120 106 V120 H0 Z" fill="#d9d2ee" />
        <ellipse cx="60" cy="108" rx="26" ry="3" fill="#c3b9e4" stroke="none" />
        <path d="M43 46 L33 107" strokeWidth="5.5" />
        <path d="M43 46 L33 107" stroke="#9aa3ad" strokeWidth="3" />
        <path d="M77 46 L87 107" strokeWidth="5.5" />
        <path d="M77 46 L87 107" stroke="#9aa3ad" strokeWidth="3" />
        <path d="M32 106 H36 M84 106 H88" strokeWidth="4" />
        <path d="M50 74 H59 L58.5 102 H50.5 Z" fill="#4b5f7a" />
        <path d="M47.5 101 H59 V107 H46.5 Q46.5 103 47.5 101 Z" fill="#7a4b2a" />
        <path d="M61 74 H70.5 V88 H61 Z" fill="#4b5f7a" />
        <path d="M60.5 87 H71 L71.5 98 Q66 103 60 98 Z" fill="#ffffff" />
        <path d="M60.8 91 H71.2 M60.9 95 H71.4" stroke="#8a7bc8" strokeWidth="2.2" />
        <path d="M73.5 92 L77 90 M73.5 96 L77.5 96" strokeWidth="1.5" />
        <path d="M47 46 Q60 39 73 46 L74 76 H46 Z" fill="#8a7bc8" />
        <path d="M46 72 H74" />
        <rect x="37" y="42" width="13" height="6" rx="3" fill="#6b7280" />
        <rect x="70" y="42" width="13" height="6" rx="3" fill="#6b7280" />
        <path d="M49 51 L40.5 66" strokeWidth="9" />
        <path d="M49 51 L40.5 66" stroke="#8a7bc8" strokeWidth="5.5" />
        <path d="M71 51 L79.5 66" strokeWidth="9" />
        <path d="M71 51 L79.5 66" stroke="#8a7bc8" strokeWidth="5.5" />
        <path d="M35 68 H44 M76 68 H85" strokeWidth="4" />
        <circle cx="40" cy="68" r="3.8" fill="#f2c6a0" />
        <circle cx="80" cy="68" r="3.8" fill="#f2c6a0" />
        <path d="M55.5 40 H64.5 V46 H55.5 Z" fill="#f2c6a0" />
        <circle cx="60" cy="29" r="12" fill="#f2c6a0" />
        <path d="M48 28 Q49 15 60 15 Q71 15 72 28 Q67 21 60 21 Q53 21 48 28 Z" fill="#5a3a28" />
        <rect x="62" y="20.5" width="10" height="4.5" rx="2.2" fill="#f4d0a0" transform="rotate(-25 67 22.7)" />
        <path d="M53.5 26.5 L57.5 28 M66.5 26.5 L62.5 28" />
        <circle cx="56" cy="30.5" r="1.7" fill="#2f2a33" />
        <circle cx="64" cy="30.5" r="1.7" fill="#2f2a33" />
        <circle cx="52.5" cy="34.5" r="2.3" fill="#f4a3a3" stroke="none" />
        <circle cx="67.5" cy="34.5" r="2.3" fill="#f4a3a3" stroke="none" />
        <path d="M56.5 37 Q60 34.5 63.5 37" fill="none" />
      </g>
    </>
  ),
};

export default function Personaje({ tipo, className }) {
  const dibujo = DIBUJOS[tipo];
  if (!dibujo) return null;
  return (
    <svg className={className} viewBox="0 0 120 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {dibujo}
    </svg>
  );
}
