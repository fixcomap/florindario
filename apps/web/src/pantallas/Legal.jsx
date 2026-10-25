// BORRADOR: revisar antes de abrir la app al público. El titular responde de estos textos.
const ACTUALIZADO = '25 de octubre de 2026';

export function Terminos() {
  return (
    <main className="legal">
      <h1>Términos de uso</h1>
      <p className="tenue">Última actualización: {ACTUALIZADO}</p>
      <h2>Qué es Florindario</h2>
      <p>Una herramienta gratuita para organizar tu calendario de trabajo: turnos, días libres, vacaciones y horas.</p>
      <h2>Tu cuenta</h2>
      <p>Entrás con tu cuenta de Google. Sos responsable de lo que cargás. Podés borrar tu cuenta y todos tus datos cuando quieras desde «Tu cuenta».</p>
      <h2>Uso razonable</h2>
      <p>Para que el servicio funcione para todos hay límites de uso. Una cuenta con actividad anómala (automatizada o abusiva) se suspende automáticamente.</p>
      <h2>Sin garantías</h2>
      <p>Florindario se ofrece tal cual, sin garantía de disponibilidad. No es un registro oficial de jornada laboral.</p>
      <h2>Contacto</h2>
      <p>contacto@fixcomap.com</p>
    </main>
  );
}

export function Privacidad() {
  return (
    <main className="legal">
      <h1>Política de privacidad</h1>
      <p className="tenue">Última actualización: {ACTUALIZADO}</p>
      <h2>Qué datos guardamos</h2>
      <p>De tu cuenta de Google: tu email y tu nombre. Lo que cargás: tu calendario (turnos, horarios, notas), tus jornadas y plantillas y, si querés, las tarifas de tu sueldo (importes y porcentajes) para estimar cuánto cobrás. No pedimos ni guardamos nóminas, DNI, número de la Seguridad Social ni cuentas bancarias.</p>
      <h2>Para qué</h2>
      <p>Solo para que puedas usar Florindario. No los vendemos, no hacemos publicidad ni los compartimos con terceros salvo los proveedores que alojan el servicio.</p>
      <h2>Dónde</h2>
      <p>Google Cloud (servidores en la Unión Europea), Neon (base de datos) y Cloudflare (web).</p>
      <h2>Cuánto tiempo</h2>
      <p>Mientras tengas la cuenta. Al borrarla se eliminan todos tus datos.</p>
      <h2>Tus derechos</h2>
      <p>Podés acceder, corregir y borrar tus datos desde la app, o escribirnos a contacto@fixcomap.com.</p>
    </main>
  );
}
