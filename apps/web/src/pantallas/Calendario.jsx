import { useCallback, useEffect, useMemo, useState } from 'react';
import { pedir } from '../api.js';
import { DIAS_CORTOS, desdeIso, hoy, nombreMes, semanasDelMes } from '../fechas.js';
import { horas, minutosDelDia, tramoCorto } from '../horas.js';
import { TIPOS, tipo } from '../datos/tipos.js';
import EditorDia from '../componentes/EditorDia.jsx';
import AplicarPlantilla from '../componentes/AplicarPlantilla.jsx';

// Mes de lunes a domingo: cada día con su tipo y su horario, las horas de cada
// semana a la derecha y el total del mes abajo. Tocar un día lo edita; en modo
// "Elegir días" se marcan varios (o semanas enteras) y se cargan de una vez.
export default function Calendario() {
  const ahora = new Date();
  const [mes, setMes] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
  const [dias, setDias] = useState({}); // fecha -> día
  const [plantillas, setPlantillas] = useState([]);
  const [eligiendo, setEligiendo] = useState(false);
  const [elegidos, setElegidos] = useState(() => new Set());
  const [hoja, setHoja] = useState(null); // { tipo: 'editar' | 'plantilla', fechas }
  const [error, setError] = useState('');
  const [extras, setExtras] = useState(null);
  const cargarExtras = () => pedir('/extras').then(setExtras).catch(() => {});
  useEffect(() => { cargarExtras(); }, []);

  const semanas = useMemo(() => semanasDelMes(mes.anio, mes.mes), [mes]);
  const desde = semanas[0][0];
  const hasta = semanas.at(-1)[6];

  const cargar = useCallback(() => {
    pedir(`/dias?desde=${desde}&hasta=${hasta}`)
      .then((lista) => setDias(Object.fromEntries(lista.map((d) => [d.fecha, d]))))
      .catch((err) => setError(err.message));
  }, [desde, hasta]);
  useEffect(cargar, [cargar]);
  useEffect(() => { pedir('/plantillas').then(setPlantillas).catch(() => {}); }, []);

  const mover = (n) => setMes(({ anio, mes: m }) => ({ anio: anio + Math.floor((m + n) / 12), mes: (m + n + 12) % 12 }));
  const delMes = (f) => desdeIso(f).getMonth() === mes.mes;
  const delMesCargados = Object.values(dias).filter((d) => delMes(d.fecha));
  const totalMes = delMesCargados.reduce((s, d) => s + minutosDelDia(d), 0);
  const suma = (filtro) => delMesCargados.filter((d) => d.extra && filtro(d.extra)).reduce((s, d) => s + d.extra.minutos, 0);
  const extraMes = { pagadas: suma((e) => e.pago === 'dinero'), sinCobrar: suma((e) => e.pago === 'dinero' && !e.cobrada), bolsa: suma((e) => e.pago === 'horas') };
  const usadasMes = delMesCargados.reduce((s, d) => s + (d.compensa || 0), 0);
  const primero = semanas.flat().find(delMes);
  const ultimo = semanas.flat().filter(delMes).at(-1);

  async function cobrarMes() {
    if (!window.confirm(`¿Marcar como cobradas las ${horas(extraMes.sinCobrar)} extra de este mes?`)) return;
    try {
      await pedir('/extras/cobrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ desde: primero, hasta: ultimo }) });
      cargar();
      cargarExtras();
    } catch (err) {
      setError(err.message);
    }
  }

  const alternar = (fechas) => setElegidos((actual) => {
    const nuevo = new Set(actual);
    const todas = fechas.every((f) => nuevo.has(f));
    fechas.forEach((f) => (todas ? nuevo.delete(f) : nuevo.add(f)));
    return nuevo;
  });
  const terminar = () => { setEligiendo(false); setElegidos(new Set()); };
  const tocar = (f) => (eligiendo ? alternar([f]) : setHoja({ tipo: 'editar', fechas: [f] }));
  const ordenados = [...elegidos].sort();

  const guardado = ({ guardados, borrados }) => {
    setDias((todos) => {
      const copia = { ...todos };
      borrados.forEach((f) => delete copia[f]);
      guardados.forEach((d) => { copia[d.fecha] = d; });
      return copia;
    });
    cargarExtras();
    terminar();
  };

  return (
    <main className="con-barra">
      <div className="mes">
        <button className="flecha" onClick={() => mover(-1)} aria-label="Mes anterior">‹</button>
        <h1>{nombreMes(mes.anio, mes.mes)}</h1>
        <button className="flecha" onClick={() => mover(1)} aria-label="Mes siguiente">›</button>
      </div>
      {eligiendo && (
        <div className="herramientas">
          <span className="tenue">Tocá días o el ☑ de una semana</span>
          <button className="chip" onClick={() => alternar(semanas.flat().filter(delMes))}>Todo el mes</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <div className="cuadricula" role="grid" aria-label={nombreMes(mes.anio, mes.mes)}>
        {DIAS_CORTOS.map((d) => <div key={d} className="cabeza">{d}</div>)}
        <div className="cabeza">h</div>
        {semanas.map((semana) => (
          <Semana key={semana[0]} semana={semana} dias={dias} delMes={delMes} tocar={tocar}
            elegidos={elegidos} eligiendo={eligiendo} elegirSemana={() => alternar(semana)} />
        ))}
      </div>

      <p className="total-mes">Este mes: <strong>{horas(totalMes)}</strong></p>

      {(extraMes.pagadas > 0 || extraMes.bolsa > 0 || usadasMes > 0 || extras?.bolsa.saldo) ? (
        <section className="panel-extra">
          <h2>Horas extra</h2>
          {extraMes.pagadas > 0 && (
            <p>💶 Pagadas este mes: <strong>{horas(extraMes.pagadas)}</strong>
              {extraMes.sinCobrar > 0 ? <> · <span className="aviso">{horas(extraMes.sinCobrar)} sin cobrar</span> <button className="enlace" onClick={cobrarMes}>Ya las cobré</button></> : ' · cobradas ✓'}
            </p>
          )}
          {(extraMes.bolsa > 0 || usadasMes > 0) && (
            <p>🕒 A horas libres este mes: <strong>{horas(extraMes.bolsa)}</strong>{usadasMes > 0 && <> · usadas {horas(usadasMes)}</>}</p>
          )}
          {extras && (extras.bolsa.generadas > 0 || extras.bolsa.usadas > 0) && (
            <p className="tenue">Bolsa de horas libres: <strong className={extras.bolsa.saldo < 0 ? 'aviso' : ''}>{extras.bolsa.saldo < 0 ? '−' : ''}{horas(Math.abs(extras.bolsa.saldo))}</strong>
              {extras.dinero.sinCobrar > 0 && <> · sin cobrar en total: {horas(extras.dinero.sinCobrar)}</>}</p>
          )}
        </section>
      ) : null}
      <ul className="leyenda">
        {TIPOS.map((t) => <li key={t.id}><span style={{ background: t.color }} /> {t.nombre}</li>)}
      </ul>

      {!eligiendo && (
        <nav className="barra-acciones">
          <button className="capsula" onClick={() => setEligiendo(true)}>☑ Elegir días</button>
          <a className="capsula principal" href="/plantillas">✿ Plantillas</a>
        </nav>
      )}
      {eligiendo && (
        <div className="barra-eleccion">
          <span><strong>{elegidos.size}</strong> {elegidos.size === 1 ? 'día' : 'días'}</span>
          <button className="boton" disabled={!elegidos.size} onClick={() => setHoja({ tipo: 'plantilla', fechas: ordenados })}>Plantilla</button>
          <button className="boton secundario" disabled={!elegidos.size} onClick={() => setHoja({ tipo: 'editar', fechas: ordenados })}>Horario</button>
          <button className="enlace" onClick={terminar}>Cancelar</button>
        </div>
      )}

      {hoja?.tipo === 'editar' && (
        <EditorDia fechas={hoja.fechas} dia={hoja.fechas.length === 1 ? dias[hoja.fechas[0]] : undefined}
          plantillas={plantillas} bolsa={extras?.bolsa} cerrar={() => setHoja(null)} guardado={guardado} />
      )}
      {hoja?.tipo === 'plantilla' && (
        <AplicarPlantilla fechas={hoja.fechas} plantillas={plantillas} cerrar={() => setHoja(null)} guardado={guardado} />
      )}
    </main>
  );
}

function Semana({ semana, dias, delMes, tocar, elegidos, eligiendo, elegirSemana }) {
  const total = semana.reduce((s, f) => s + minutosDelDia(dias[f]), 0);
  return (
    <>
      {semana.map((f) => {
        const d = dias[f];
        const t = d && tipo(d.tipo);
        const elegido = elegidos.has(f);
        return (
          <button
            key={f}
            role="gridcell"
            className={`dia${delMes(f) ? '' : ' fuera'}${f === hoy() ? ' hoy' : ''}${elegido ? ' elegido' : ''}`}
            style={t ? { background: t.fondo, borderColor: t.color } : undefined}
            onClick={() => tocar(f)}
            aria-pressed={eligiendo ? elegido : undefined}
            aria-label={`${f}${t ? `, ${t.nombre}` : ', sin cargar'}`}
          >
            <span className="numero">{desdeIso(f).getDate()}</span>
            {t && (
              <span className="contenido" style={{ color: t.color }}>
                {d.tipo === 'trabajo' ? d.tramos.map((tr) => <span key={tr.inicio}>{tramoCorto(tr)}</span>) : <span>{t.icono}</span>}
              </span>
            )}
            {minutosDelDia(d) > 0 && <span className="horas-dia">{horas(minutosDelDia(d)).replace(' h ', ':').replace(' h', 'h')}</span>}
            {d?.extra && (
              <span className={`marca-extra ${d.extra.pago}${d.extra.pago === 'dinero' && !d.extra.cobrada ? ' pendiente' : ''}`}>
                +{horas(d.extra.minutos).replace(' h ', ':').replace(' h', 'h')}
              </span>
            )}
          </button>
        );
      })}
      {eligiendo ? (
        <button className="semana-total elegir" onClick={elegirSemana} aria-label="Elegir la semana">☑</button>
      ) : (
        <div className="semana-total" role="gridcell">{total ? horas(total).replace(' h ', ':').replace(' h', '') : ''}</div>
      )}
    </>
  );
}
