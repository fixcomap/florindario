import { useEffect, useState } from 'react';
import { pedir, URL_API } from './api.js';
import Logo from './componentes/Logo.jsx';
import Calendario from './pantallas/Calendario.jsx';
import Alta from './pantallas/Alta.jsx';
import Cuenta from './pantallas/Cuenta.jsx';
import Plantillas from './pantallas/Plantillas.jsx';
import { Privacidad, Terminos } from './pantallas/Legal.jsx';

export default function App() {
  const ruta = window.location.pathname;
  const [usuario, setUsuario] = useState(undefined); // undefined = cargando, null = sin sesión
  useEffect(() => {
    pedir('/auth/yo').then(setUsuario).catch(() => setUsuario(null));
  }, []);

  const salir = () => pedir('/auth/salir', { method: 'POST' }).finally(() => window.location.assign('/'));

  return (
    <div className="app">
      <header className="cabecera">
        <a href="/" className="marca"><Logo className="logo" /> Florindario</a>
        {usuario && (
          <nav className="menu">
            {usuario.estado === 'activa' && <a href="/cuenta">Cuenta</a>}
            <button className="enlace" onClick={salir}>Salir</button>
          </nav>
        )}
      </header>
      {ruta === '/terminos' ? <Terminos /> : ruta === '/privacidad' ? <Privacidad /> : (
        <>
          {usuario === undefined && <p className="centro tenue">Cargando…</p>}
          {usuario === null && <Bienvenida />}
          {usuario?.estado === 'pendiente' && <Alta usuario={usuario} listo={setUsuario} />}
          {usuario?.estado === 'suspendida' && (
            <p className="centro">Tu cuenta está suspendida por actividad anómala. Escribinos a contacto@fixcomap.com.</p>
          )}
          {usuario?.estado === 'activa' && (ruta === '/cuenta' ? <Cuenta usuario={usuario} cambiar={setUsuario} /> : ruta === '/plantillas' ? <Plantillas /> : <Calendario usuario={usuario} />)}
        </>
      )}
    </div>
  );
}

function Bienvenida() {
  const error = new URLSearchParams(window.location.search).get('error');
  return (
    <main className="bienvenida">
      <Logo className="logo-grande" />
      <h1>Tu calendario de turnos</h1>
      <p>Cargá tus jornadas de mañana, tarde o noche, tus libres y vacaciones, y mirá cuántas horas suma cada semana.</p>
      {error === 'login' && <p className="error">No se pudo entrar con Google. Probá de nuevo.</p>}
      {error === 'altas' && <p className="error">Ahora mismo hay muchas altas nuevas. Probá de nuevo en un rato.</p>}
      <a className="boton" href={`${URL_API}/auth/login`}>Entrar con Google</a>
      <p className="legal-pie"><a href="/terminos">Términos</a> · <a href="/privacidad">Privacidad</a></p>
    </main>
  );
}
