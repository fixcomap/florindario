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
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    pedir('/sueldo').then((t) => setValores(t
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
      <div className="tipos">
        {[['mensual', 'Sueldo fijo al mes'], ['hora', 'Cobro por hora']].map(([id, texto]) => (
          <button key={id} type="button" className={valores.modo === id ? 'activo' : ''} aria-pressed={valores.modo === id} onClick={() => poner('modo', id)}>{texto}</button>
        ))}
      </div>
      <div className="campos-sueldo">
        <label>{valores.modo === 'mensual' ? 'Bruto mensual' : 'Precio por hora'}
          <span className="campo-unidad"><input inputMode="decimal" value={valores.base} placeholder="0,00" onChange={(e) => poner('base', e.target.value)} /><span>{valores.modo === 'mensual' ? '€' : '€/h'}</span></span>
        </label>
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
