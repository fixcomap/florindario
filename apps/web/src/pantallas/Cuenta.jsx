import { useState } from 'react';
import { pedir } from '../api.js';

export default function Cuenta({ usuario }) {
  const [error, setError] = useState('');

  async function borrar() {
    if (!window.confirm('Se borra tu cuenta y todo tu calendario, sin vuelta atrás. ¿Seguro?')) return;
    try {
      await pedir('/cuenta', { method: 'DELETE' });
      window.location.assign('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="cuenta">
      <h1>Tu cuenta</h1>
      <p><strong>{usuario.nombre}</strong><br /><span className="tenue">{usuario.email}</span></p>
      <p><a href="/terminos">Términos de uso</a> · <a href="/privacidad">Política de privacidad</a></p>
      <button className="boton secundario peligro" onClick={borrar}>Borrar mi cuenta</button>
      {error && <p className="error">{error}</p>}
      <p><a href="/">← Volver al calendario</a></p>
    </main>
  );
}
