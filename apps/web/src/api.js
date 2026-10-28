// Único sitio del front que habla con la API. En local, /api (proxy de Vite);
// en Pages, VITE_API_URL (https://api-florindario[.dev].fixcomap.com).
export const URL_API = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(URL_API + ruta, { credentials: 'include', ...opciones });
  } catch {
    // Sin red: las lecturas salen de lo guardado (sw.js); lo que llega aquí es una escritura o algo nunca visto.
    throw new Error('Sin conexión: no se pudo guardar. Probá cuando vuelvas a tener red.');
  }
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw Object.assign(new Error(cuerpo?.error || `Error ${respuesta.status}`), { status: respuesta.status });
  return cuerpo;
}

// Lo que sw.js guardó de la API para verla sin conexión: fuera al salir o sin sesión.
export const borrarDatosLocales = () => window.caches?.delete('datos').catch(() => {});
