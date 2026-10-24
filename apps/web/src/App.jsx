import { useEffect, useState } from 'react';
import { pedir, URL_API } from './api.js';
import Logo from './componentes/Logo.jsx';
import Calendario from './pantallas/Calendario.jsx';

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = cargando, null = sin sesión
  useEffect(() => {
    pedir('/auth/yo').then(setUsuario).catch(() => setUsuario(null));
  }, []);

  const salir = () => pedir('/auth/salir', { method: 'POST' }).finally(() => window.location.assign('/'));

  return (
    <div className="app">
      <header className="cabecera">
        <a href="/" className="marca"><Logo className="logo" /> Florindario</a>
        {usuario && <button className="enlace" onClick={salir}>Salir</button>}
      </header>
      {usuario === undefined && <p className="centro tenue">Cargando…</p>}
      {usuario === null && <Bienvenida />}
      {usuario && <Calendario />}
    </div>
  );
}

function Bienvenida() {
  const errorLogin = new URLSearchParams(window.location.search).get('error') === 'login';
  return (
    <main className="bienvenida">
      <Logo className="logo-grande" />
      <h1>Tu calendario de turnos</h1>
      <p>Cargá tus jornadas de mañana, tarde o noche, tus libres y vacaciones, y mirá cuántas horas suma cada semana.</p>
      {errorLogin && <p className="error">No se pudo entrar con Google. Probá de nuevo.</p>}
      <a className="boton" href={`${URL_API}/auth/login`}>Entrar con Google</a>
    </main>
  );
}
