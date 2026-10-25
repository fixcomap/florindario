import { useState } from 'react';
import { pedir } from '../api.js';

const BOLSA = [
  ['jornadas', 'Días compensatorios', 'Te las devuelven en días de una jornada: p. ej. 1 día en Jornada 20 h.'],
  ['horas', 'Bolsa de horas', 'Las extras que no te pagan suman horas libres que después usás.'],
  ['ninguna', 'No me las devuelven', 'Las extras solo se pagan.'],
];

export default function Cuenta({ usuario, cambiar }) {
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
      <section className="ajustes">
        <h2>Horas extra</h2>
        <p className="tenue">¿Cómo te devuelven las horas extra que no te pagan?</p>
        {BOLSA.map(([id, nombre, detalle]) => (
          <label key={id} className="opcion">
            <input type="radio" name="bolsa" checked={usuario.bolsa === id}
              onChange={() => pedir('/cuenta/ajustes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bolsa: id }) })
                .then(({ bolsa }) => cambiar({ ...usuario, bolsa })).catch((err) => setError(err.message))} />
            <span><strong>{nombre}</strong><small>{detalle}</small></span>
          </label>
        ))}
        {usuario.bolsa === 'jornadas' && <p className="tenue">Configurá tus jornadas en <a href="/plantillas">Plantillas</a>.</p>}
      </section>
      <p><a href="/terminos">Términos de uso</a> · <a href="/privacidad">Política de privacidad</a></p>
      <button className="boton secundario peligro" onClick={borrar}>Borrar mi cuenta</button>
      {error && <p className="error">{error}</p>}
      <p><a href="/">← Volver al calendario</a></p>
    </main>
  );
}
