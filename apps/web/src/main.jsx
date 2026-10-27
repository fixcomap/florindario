import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/anton/latin-400.css';
import '@fontsource/pacifico/latin-400.css';
import './estilos.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
