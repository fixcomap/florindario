import { horas } from '../horas.js';
import { estimar, euros } from '../sueldo.js';

// Estimación del sueldo del mes con las tarifas de Cuenta y los días cargados.
export default function SueldoMes({ tarifas, dias }) {
  if (!tarifas) {
    return <p className="tenue pista">💶 <a href="/cuenta">Cargá tu sueldo</a> para ver cuánto cobrarías este mes.</p>;
  }
  const r = estimar(tarifas, dias);
  return (
    <section className="panel-extra sueldo">
      <h2>Sueldo estimado</h2>
      <ul className="lineas-sueldo">
        {r.lineas.map((l) => (
          <li key={l.concepto}><span>{l.concepto}{l.minutos ? <small className="tenue"> · {horas(l.minutos)}</small> : null}</span><span>{euros(l.cent)}</span></li>
        ))}
        <li className="total"><span>Bruto</span><span>{euros(r.bruto)}</span></li>
        {r.descuentos > 0 && <li><span>IRPF y Seguridad Social</span><span>−{euros(r.descuentos)}</span></li>}
        {r.descuentos > 0 && <li className="total neto"><span>Neto aproximado</span><span>{euros(r.neto)}</span></li>}
      </ul>
      {r.sinPrecioExtra && <p className="aviso">Tenés extras pagadas sin precio: cargalo en Cuenta.</p>}
      <p className="tenue letra-chica">Estimación según tu calendario; no incluye pagas extra, pluses de convenio ni otros conceptos de tu nómina.</p>
    </section>
  );
}
