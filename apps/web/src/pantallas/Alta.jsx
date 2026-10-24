import { useState } from 'react';
import { pedir } from '../api.js';

// Primera vez: nombre visible y aceptar términos y privacidad (cuenta -> activa).
export default function Alta({ usuario, listo }) {
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    try {
      listo(await pedir('/cuenta/alta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: f.get('nombre'), acepto: f.get('acepto') === 'si' }),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="alta">
      <h1>¡Bienvenida, bienvenido!</h1>
      <p className="tenue">Un último paso antes de empezar.</p>
      <form onSubmit={enviar}>
        <label>¿Cómo te llamamos?<input name="nombre" defaultValue={usuario.nombre} required minLength={2} maxLength={40} /></label>
        <label className="casilla">
          <input type="checkbox" name="acepto" value="si" required />
          <span>Acepto los <a href="/terminos" target="_blank">términos de uso</a> y la <a href="/privacidad" target="_blank">política de privacidad</a>.</span>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="boton">Empezar</button>
      </form>
    </main>
  );
}
