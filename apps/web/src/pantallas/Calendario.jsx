import { useCallback, useEffect, useMemo, useState } from 'react';
import { pedir } from '../api.js';
import { DIAS_CORTOS, desdeIso, hoy, nombreMes, semanasDelMes } from '../fechas.js';
import { horas, horasCortas, minutosDelDia, tramoCorto } from '../horas.js';
import { agrupar } from '../notas.js';
import { saldoEnDias, sumaEnDias } from '../jornadas.js';
import Tablero from '../componentes/Tablero.jsx';
import SueldoMes from '../componentes/SueldoMes.jsx';
import HojaNota from '../componentes/HojaNota.jsx';
import { TIPOS, tipo } from '../datos/tipos.js';
import EditorDia from '../componentes/EditorDia.jsx';
import AplicarPlantilla from '../componentes/AplicarPlantilla.jsx';

// Mes de lunes a domingo: cada día con su tipo y su horario, las horas de cada
// semana a la derecha y el total del mes abajo. Tocar un día lo edita; en modo
// "Elegir días" se marcan varios (o semanas enteras) y se cargan de una vez.
export default function Calendario({ usuario }) {
  const modoBolsa = usuario?.bolsa || 'jornadas';
  const ahora = new Date();
  const [mes, setMes] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
  const [dias, setDias] = useState({}); // fecha -> día
  const [plantillas, setPlantillas] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [eligiendo, setEligiendo] = useState(false);
  const [elegidos, setElegidos] = useState(() => new Set());
  const [hoja, setHoja] = useState(null); // { tipo: 'editar' | 'plantilla', fechas }
  const [error, setError] = useState('');
  const [extras, setExtras] = useState(null);
  const [notas, setNotas] = useState([]);
  const [tarifas, setTarifas] = useState(undefined);
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
  const claveMes = `${mes.anio}-${String(mes.mes + 1).padStart(2, '0')}`;
  const cargarNotas = useCallback(() => {
    pedir(`/notas?desde=${desde}&hasta=${hasta}&mes=${claveMes}`).then(setNotas).catch((err) => setError(err.message));
  }, [desde, hasta, claveMes]);
  useEffect(cargarNotas, [cargarNotas]);
  const notasPorFecha = useMemo(() => {
    const m = {};
    notas.forEach((n) => n.fechas.forEach((f) => { (m[f] ||= []).push(n); }));
    return m;
  }, [notas]);
  useEffect(() => {
    pedir('/plantillas').then(setPlantillas).catch(() => {});
    pedir('/jornadas').then(setJornadas).catch(() => {});
    pedir('/sueldo').then(setTarifas).catch(() => setTarifas(null));
  }, []);

  const mover = (n) => setMes(({ anio, mes: m }) => ({ anio: anio + Math.floor((m + n) / 12), mes: (m + n + 12) % 12 }));
  const delMes = (f) => desdeIso(f).getMonth() === mes.mes;
  const gruposMes = agrupar(notas.filter((n) => n.fijada || !n.fechas.length || n.fechas.some(delMes)));
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
          <Semana key={semana[0]} semana={semana} dias={dias} delMes={delMes} tocar={tocar} notasPorFecha={notasPorFecha} modoBolsa={modoBolsa} jornadas={jornadas}
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
          {modoBolsa !== 'ninguna' && (extraMes.bolsa > 0 || usadasMes > 0) && (
            modoBolsa === 'jornadas' && jornadas.length ? (
              <p>🗓 Días compensatorios este mes: <strong>{sumaEnDias(delMesCargados.filter((d) => d.extra?.pago === 'horas').map((d) => d.extra), jornadas) || '—'}</strong>
                {usadasMes > 0 && <> · devueltos {sumaEnDias(delMesCargados.filter((d) => d.compensa).map((d) => ({ minutos: d.compensa, jornadaId: d.compensaJornadaId })), jornadas)}</>}</p>
            ) : (
              <p>🕒 A libres este mes: <strong>{horas(extraMes.bolsa)}</strong>{usadasMes > 0 && <> · devueltas {horas(usadasMes)}</>}</p>
            )
          )}
          {modoBolsa !== 'ninguna' && extras && (extras.bolsa.generadas > 0 || extras.bolsa.usadas > 0) && (
            <p className="tenue">{modoBolsa === 'jornadas' ? 'Te deben' : 'Bolsa de horas libres'}: <strong className={extras.bolsa.saldo < 0 ? 'aviso' : ''}>{extras.bolsa.saldo < 0 ? '−' : ''}{modoBolsa === 'jornadas' ? saldoEnDias(Math.abs(extras.bolsa.saldo), extras.porJornada, jornadas) : horas(Math.abs(extras.bolsa.saldo))}</strong></p>
          )}
          {extras?.dinero.sinCobrar > 0 && <p className="tenue">Sin cobrar en total: {horas(extras.dinero.sinCobrar)}</p>}
        </section>
      ) : null}
      {tarifas !== undefined && <SueldoMes tarifas={tarifas} dias={delMesCargados} jornadas={jornadas} />}

      <Tablero grupos={gruposMes} mes={claveMes} cambiado={cargarNotas} />

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
          <button className="boton secundario" disabled={!elegidos.size} onClick={() => setHoja({ tipo: 'nota', fechas: ordenados })}>Nota</button>
          <button className="cerrar-barra" aria-label="Cancelar" onClick={terminar}>×</button>
        </div>
      )}

      {hoja?.tipo === 'editar' && (
        <EditorDia fechas={hoja.fechas} dia={hoja.fechas.length === 1 ? dias[hoja.fechas[0]] : undefined}
          plantillas={plantillas} jornadas={jornadas} modoBolsa={modoBolsa} bolsa={extras && { ...extras.bolsa, porJornada: extras.porJornada }} cerrar={() => setHoja(null)} guardado={guardado}
          notas={hoja.fechas.length === 1 ? notasPorFecha[hoja.fechas[0]] || [] : null} notasCambiadas={cargarNotas} />
      )}
      {hoja?.tipo === 'nota' && (
        <HojaNota fechas={hoja.fechas} cerrar={() => setHoja(null)} cambiado={() => { cargarNotas(); terminar(); }} />
      )}
      {hoja?.tipo === 'plantilla' && (
        <AplicarPlantilla fechas={hoja.fechas} plantillas={plantillas} jornadas={jornadas} cerrar={() => setHoja(null)} guardado={guardado} />
      )}
    </main>
  );
}

function Semana({ semana, dias, delMes, tocar, notasPorFecha, modoBolsa, jornadas, elegidos, eligiendo, elegirSemana }) {
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
            <span className="numero">{desdeIso(f).getDate()}{notasPorFecha[f] && <span className="marca-nota" title={notasPorFecha[f].map((n) => n.texto).join(' · ')} />}</span>
            {t && (
              <span className="contenido" style={{ color: t.color }}>
                {d.tipo === 'trabajo' ? d.tramos.map((tr) => <span key={tr.inicio}>{tramoCorto(tr)}</span>) : <span>{t.icono}</span>}
              </span>
            )}
            {minutosDelDia(d) > 0 && <span className="horas-dia">{horasCortas(minutosDelDia(d))}</span>}
            {d?.extra && (
              <span className={`marca-extra ${d.extra.pago}${d.extra.pago === 'dinero' && !d.extra.cobrada ? ' pendiente' : ''}`}>
                +{modoBolsa === 'jornadas' && d.extra.pago === 'horas' && jornadas.find((j) => j.id === d.extra.jornadaId)
                  ? `${String(Math.round((d.extra.minutos / jornadas.find((j) => j.id === d.extra.jornadaId).minutosDia) * 10) / 10).replace('.', ',')}d`
                  : horasCortas(d.extra.minutos)}
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
