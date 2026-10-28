// Service worker: la app se instala y abre sin conexión con lo último que se vio
// (solo lectura: guardar necesita red). La URL de la API llega en ?api= al registrarlo.
const APP = 'app-v1';
const DATOS = 'datos'; // respuestas GET de la API; se borra al salir (api.js)
const API = new URL(self.location).searchParams.get('api') || '/api';
const esApi = (url) => (API.startsWith('http') ? url.href.startsWith(`${API}/`) : url.origin === self.location.origin && url.pathname.startsWith(`${API}/`));

// Al instalar: la página y los archivos que carga (JS, CSS), para abrir sin red desde la primera vez.
self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(APP);
    const pagina = await fetch('/', { cache: 'no-cache' });
    if (!pagina.ok) return;
    const html = await pagina.clone().text();
    await cache.put('/', pagina);
    await cache.addAll([...new Set(html.match(/\/assets\/[^"']+/g) || [])]);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nombre of await caches.keys()) if (![APP, DATOS].includes(nombre)) await caches.delete(nombre);
    await self.clients.claim();
  })());
});

// Red primero y, si no hay, lo guardado. Solo se guardan respuestas buenas: nunca un
// 401 ni la redirección de Cloudflare Access.
async function redOCache(peticion, cacheNombre, clave = peticion) {
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok && !respuesta.redirected) (await caches.open(cacheNombre)).put(clave, respuesta.clone());
    return respuesta;
  } catch (err) {
    const guardada = await caches.match(clave, { cacheName: cacheNombre });
    if (guardada) return guardada;
    throw err;
  }
}

// Los archivos de /assets llevan hash en el nombre: lo guardado no cambia nunca.
async function cacheORed(peticion) {
  const guardada = await caches.match(peticion, { cacheName: APP });
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  if (respuesta.ok) (await caches.open(APP)).put(peticion, respuesta.clone());
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  // Cualquier ruta de la app es la misma página (React decide qué mostrar).
  if (peticion.mode === 'navigate') evento.respondWith(redOCache(peticion, APP, '/'));
  else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) evento.respondWith(cacheORed(peticion));
  else if (esApi(url)) evento.respondWith(redOCache(peticion, DATOS));
});
