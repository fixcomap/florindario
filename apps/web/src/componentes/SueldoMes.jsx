import { horas } from '../horas.js';
import { estimar, euros } from '../sueldo.js';

// Estimación del sueldo del mes con las tarifas de Cuenta y los días cargados;
// plegada hasta que se toca.
export default function SueldoMes({ tarifas, dias, jornadas, diasAnterior, mesAnterior }) {
  if (!tarifas) {
    return <p className="tenue pista">💶 <a href="/cuenta">Cargá tu sueldo</a> para ver cuánto cobrarías este mes.</p>;
  }
  const r = estimar(tarifas, dias, jornadas, diasAnterior, mesAnterior);
  return (
    <details className="panel-extra sueldo">
      <summary><h2>💶 Sueldo estimado</h2><span className="tenue">Ver</span></summary>
      <ul className="lineas-sueldo">
        {r.lineas.map((l) => (
          <li key={l.concepto}><span>{l.concepto}{l.sinImporte && <small className="aviso"> · importe sin cargar</small>}{l.minutos ? <small className="tenue"> · {horas(l.minutos)}</small> : null}</span><span>{euros(l.cent)}</span></li>
        ))}
        <li className="total"><span>Bruto</span><span>{euros(r.bruto)}</span></li>
        {r.descuentos > 0 && <li><span>IRPF y Seguridad Social</span><span>−{euros(r.descuentos)}</span></li>}
        {r.descuentos > 0 && <li className="total neto"><span>Neto aproximado</span><span>{euros(r.neto)}</span></li>}
      </ul>
      {r.sinPrecioExtra && <p className="aviso">Tenés extras pagadas sin precio: cargalo en Cuenta.</p>}
      {r.domingoSinImporte && <p className="aviso">Cargá cuánto te pagan por domingo en Cuenta → Sueldo (suele figurar en la nómina como plus de domingo o festivo).</p>}
      {r.sinTarifa && <p className="aviso">Hay días en una jornada sin tarifa: cargala en Cuenta.</p>}
      {r.asignados > 0 && <p className="tenue letra-chica">{r.asignados} {r.asignados === 1 ? 'día sin jornada se contó' : 'días sin jornada se contaron'} en la jornada con más días; abrilos y elegí su jornada para afinar.</p>}
      <p className="tenue letra-chica">Estimación según tu calendario; no incluye pagas extra, pluses de convenio ni otros conceptos de tu nómina.</p>
    </details>
  );
}
