import { useState } from 'react';
import { pedir } from '../api.js';

const JSON_ = { 'Content-Type': 'application/json' };
const dos = (n) => String(n).padStart(2, '0');

// Exportar el mes o el año a .ics (calendario del móvil) o el mes a PDF. Los genera la
// API: el front pide un enlace firmado de pocos minutos y lo abre. Así funciona también
// en el iPhone con la app instalada, donde iOS ignora window.print() y las descargas
// hechas en el navegador.
export default function Exportar({ anio, mes, nombreMes, cerrar }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState('');
  const delMes = { desde: `${anio}-${dos(mes + 1)}-01`, hasta: `${anio}-${dos(mes + 1)}-${dos(new Date(anio, mes + 1, 0).getDate())}` };

  async function abrir(clave, cuerpo) {
    setEnviando(clave);
    setError('');
    try {
      const { url } = await pedir('/exportar/enlace', { method: 'POST', headers: JSON_, body: JSON.stringify(cuerpo) });
      window.location.assign(url);
      cerrar();
    } catch (err) {
      setError(err.message);
      setEnviando('');
    }
  }

  return (
    <div className="fondo-hoja" onClick={cerrar}>
      <section className="hoja" role="dialog" aria-label="Exportar" onClick={(e) => e.stopPropagation()}>
        <h2>Exportar</h2>
        <p className="paso">Al calendario del móvil (.ics)</p>
        <p className="tenue pista">Google Calendar, Apple o Outlook: se agregan tus días. Si lo volvés a importar, se actualizan.</p>
        <div className="acciones">
          <button className="boton" disabled={!!enviando} onClick={() => abrir('mes', { formato: 'ics', ...delMes })}>{enviando === 'mes' ? 'Preparando…' : nombreMes}</button>
          <button className="boton secundario" disabled={!!enviando} onClick={() => abrir('anio', { formato: 'ics', desde: `${anio}-01-01`, hasta: `${anio}-12-31` })}>{enviando === 'anio' ? 'Preparando…' : `Todo ${anio}`}</button>
        </div>
        <p className="paso">PDF</p>
        <div className="acciones">
          <button className="boton secundario" disabled={!!enviando} onClick={() => abrir('pdf', { formato: 'pdf', ...delMes })}>{enviando === 'pdf' ? 'Preparando…' : `${nombreMes} en PDF`}</button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="acciones"><button className="enlace" onClick={cerrar}>Cancelar</button></div>
      </section>
    </div>
  );
}
