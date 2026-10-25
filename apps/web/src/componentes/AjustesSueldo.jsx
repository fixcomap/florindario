import { useEffect, useState } from 'react';
import { pedir } from '../api.js';
import { aCent, deCent } from '../sueldo.js';

const CAMPOS = [
  ['extra', 'Hora extra pagada', '€/h'],
  ['nocturna', 'Plus nocturnidad (22–6 h)', '€/h'],
  ['domingo', 'Plus domingo', '€/h'],
  ['irpf', 'Retención IRPF', '%'],
  ['ss', 'Seguridad Social', '%'],
];

// Tarifas para estimar el sueldo del mes: se cargan a mano, mirando una nómina.
export default function AjustesSueldo() {
  const [valores, setValores] = useState(null);
  const [jornadas, setJornadas] = useState([]);
  const [porJornada, setPorJornada] = useState({}); // jornadaId -> { modo, base (texto) }
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([pedir('/sueldo'), pedir('/jornadas')]).then(([t, js]) => {
      setJornadas(js);
      setPorJornada(Object.fromEntries(js.map((j) => {
        const x = t?.jornadas?.find((y) => y.jornadaId === j.id);
        return [j.id, { modo: x?.modo || 'mensual', base: deCent(x?.base) }];
      })));
      return t;
    }).then((t) => setValores(t
      ? { modo: t.modo, ...Object.fromEntries(['base', ...CAMPOS.map(([c]) => c)].map((c) => [c, deCent(t[c])])) }
      : { modo: 'mensual', base: '', extra: '', nocturna: '', domingo: '', irpf: '', ss: '' })).catch((err) => setError(err.message));
  }, []);
  if (!valores) return null;

  const poner = (campo, v) => { setValores({ ...valores, [campo]: v }); setAviso(''); };
  async function guardar() {
    setError('');
    const cuerpo = { modo: valores.modo };
    for (const c of ['base', ...CAMPOS.map(([x]) => x)]) {
      const v = aCent(valores[c]);
      if (v === null) return setError('Revisá los importes: solo números, con coma para los decimales.');
      cuerpo[c] = v;
    }
    cuerpo.jornadas = [];
    for (const j of jornadas) {
      const v = aCent(porJornada[j.id]?.base);
      if (v === null) return setError('Revisá los importes: solo números, con coma para los decimales.');
      if (v > 0) cuerpo.jornadas.push({ jornadaId: j.id, modo: porJornada[j.id].modo, base: v });
    }
    try {
      await pedir('/sueldo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      setAviso('Guardado ✓');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="ajustes">
      <h2>Sueldo</h2>
      <p className="tenue">Para estimar cuánto cobrás cada mes según tu calendario. Copiá los datos de una nómina; es una estimación, no sustituye a la nómina.</p>
      {jornadas.length > 0 ? (
        <>
          <p className="paso">Lo que cobrás en cada jornada</p>
          {jornadas.map((j) => {
            const v = porJornada[j.id] || { modo: 'mensual', base: '' };
            const cambiar = (x) => { setPorJornada({ ...porJornada, [j.id]: { ...v, ...x } }); setAviso(''); };
            return (
              <div key={j.id} className="tarifa-jornada">
                <strong>{j.nombre}</strong>
                <div className="tipos">
                  {[['mensual', 'Fijo al mes'], ['hora', 'Por hora']].map(([id, texto]) => (
                    <button key={id} type="button" className={v.modo === id ? 'activo' : ''} aria-pressed={v.modo === id} onClick={() => cambiar({ modo: id })}>{texto}</button>
                  ))}
                </div>
                <label>{v.modo === 'mensual' ? 'Bruto mensual en esta jornada' : 'Precio por hora'}
                  <span className="campo-unidad"><input inputMode="decimal" value={v.base} placeholder="0,00" onChange={(e) => cambiar({ base: e.target.value })} /><span>{v.modo === 'mensual' ? '€' : '€/h'}</span></span>
                </label>
              </div>
            );
          })}
          <p className="tenue letra-chica">En un mes mixto, el sueldo fijo de cada jornada se reparte según los días trabajados en ella.</p>
        </>
      ) : (
        <div className="tipos">
          {[['mensual', 'Sueldo fijo al mes'], ['hora', 'Cobro por hora']].map(([id, texto]) => (
            <button key={id} type="button" className={valores.modo === id ? 'activo' : ''} aria-pressed={valores.modo === id} onClick={() => poner('modo', id)}>{texto}</button>
          ))}
        </div>
      )}
      <div className="campos-sueldo">
        {!jornadas.length && (
          <label>{valores.modo === 'mensual' ? 'Bruto mensual' : 'Precio por hora'}
            <span className="campo-unidad"><input inputMode="decimal" value={valores.base} placeholder="0,00" onChange={(e) => poner('base', e.target.value)} /><span>{valores.modo === 'mensual' ? '€' : '€/h'}</span></span>
          </label>
        )}
        {CAMPOS.map(([c, etiqueta, unidad]) => (
          <label key={c}>{etiqueta}
            <span className="campo-unidad"><input inputMode="decimal" value={valores[c]} placeholder={unidad === '%' ? '0' : '0,00'} onChange={(e) => poner(c, e.target.value)} /><span>{unidad}</span></span>
          </label>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <button className="boton" onClick={guardar}>Guardar sueldo</button>
      {aviso && <p className="tenue centro-texto">{aviso}</p>}
    </section>
  );
}
