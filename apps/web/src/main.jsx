import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { URL_API } from './api.js';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/anton/latin-400.css';
import '@fontsource/pacifico/latin-400.css';
import './estilos.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Instalable y sin conexión (public/sw.js). Solo en el build: en local estorbaría a Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`/sw.js?api=${encodeURIComponent(URL_API)}`).catch(() => {});
}
