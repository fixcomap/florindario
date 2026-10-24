import { useEffect, useState } from 'react';
import { pedir } from './api.js';

// Fase 1: confirma que front, API y base están conectados.
export default function App() {
  const [estado, setEstado] = useState('comprobando…');
  useEffect(() => {
    pedir('/salud')
      .then((r) => setEstado(r.ok ? 'API y base de datos funcionando' : 'la API no ve la base'))
      .catch(() => setEstado('no se pudo conectar con la API'));
  }, []);
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '15vh auto', padding: 16, textAlign: 'center' }}>
      <h1>Florindario</h1>
      <p>Tu calendario de turnos.</p>
      <p><small>{estado}</small></p>
    </main>
  );
}
