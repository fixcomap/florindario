import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { pedir } from '../api.js';
import { DIAS_CORTOS, desdeIso, hoy, iso, nombreMes, semanasDelMes } from '../fechas.js';
import { horas, horasCortas, minutosDelDia, tramoCorto } from '../horas.js';
import { agrupar } from '../notas.js';
import { saldoEnDias, sumaEnDias } from '../jornadas.js';
import Tablero from '../componentes/Tablero.jsx';
import SueldoMes from '../componentes/SueldoMes.jsx';
import HojaNota from '../componentes/HojaNota.jsx';
import { aspecto } from '../datos/tipos.js';
import Personaje from '../componentes/Personaje.jsx';
import FlechaMes from '../componentes/FlechaMes.jsx';
import ResumenAnio from '../componentes/ResumenAnio.jsx';
import EditorDia from '../componentes/EditorDia.jsx';
import AplicarPlantilla from '../componentes/AplicarPlantilla.jsx';

// Mes de lunes a domingo: cada día con su tipo y su horario, las horas de cada
// semana a la derecha y el total del mes abajo. Tocar un día lo edita; en modo
// "Elegir días" se marcan varios (o semanas enteras) y se cargan de una vez.
const MESES_NOMBRE = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Minutos de días libres que genera un domingo trabajado en una jornada que los devuelve (0 si no).
function domingoLibre(d, jornadas) {
  if (d?.tipo !== 'trabajo' || desdeIso(d.fecha).getDay() !== 0) return 0;
  const j = jornadas.find((x) => x.id === d.jornadaId);
  return j?.domingo === 'libres' ? Math.round(j.domingoDias * j.minutosDia) : 0;
}

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
  const [diasAnterior, setDiasAnterior] = useState([]);
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
  // Días de cada tipo en el año del mes visible; se recalcula al cargar o cambiar días.
  const [resumen, setResumen] = useState(null);
  useEffect(() => {
    pedir(`/resumen?anio=${mes.anio}`).then(setResumen).catch(() => setResumen(null));
  }, [mes.anio, dias]);
  // Mes anterior: sus domingos pagados a mes vencido entran en el sueldo de este mes.
  const anterior = new Date(mes.anio, mes.mes - 1, 1);
  const mesAnterior = MESES_NOMBRE[anterior.getMonth()];
  const desdeAnterior = iso(anterior);
  const hastaAnterior = iso(new Date(mes.anio, mes.mes, 0));
  useEffect(() => {
    if (!tarifas) return;
    pedir(`/dias?desde=${desdeAnterior}&hasta=${hastaAnterior}`).then(setDiasAnterior).catch(() => setDiasAnterior([]));
  }, [tarifas, desdeAnterior, hastaAnterior]);
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

  // Dirección del último cambio de mes: el nuevo entra desde ese lado.
  const [direccion, setDireccion] = useState(0);
  const mover = (n) => {
    setDireccion(n);
    setMes(({ anio, mes: m }) => ({ anio: anio + Math.floor((m + n) / 12), mes: (m + n + 12) % 12 }));
  };
  const ahoraMismo = new Date();
  const esMesActual = mes.anio === ahoraMismo.getFullYear() && mes.mes === ahoraMismo.getMonth();
  const irAHoy = () => {
    setDireccion(mes.anio * 12 + mes.mes < ahoraMismo.getFullYear() * 12 + ahoraMismo.getMonth() ? 1 : -1);
    setMes({ anio: ahoraMismo.getFullYear(), mes: ahoraMismo.getMonth() });
  };

  // Deslizar el mes en horizontal cambia de mes; un toque o un desplazamiento vertical no.
  const inicioToque = useRef(null);
  const tocarInicio = (e) => { const t = e.touches[0]; inicioToque.current = { x: t.clientX, y: t.clientY }; };
  const tocarFin = (e) => {
    const i = inicioToque.current;
    inicioToque.current = null;
    if (!i) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - i.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(t.clientY - i.y)) mover(dx < 0 ? 1 : -1);
  };
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

  // Nombre completo en vertical, mismo tamaño de letra siempre: si no cabe en el alto
  // del mes (meses largos o de 4 semanas), se comprime en vertical lo justo.
  const marcoRef = useRef(null);
  const mesRef = useRef(null);
  useLayoutEffect(() => {
    const marco = marcoRef.current;
    const texto = mesRef.current;
    if (!marco || !texto) return undefined;
    const ajustar = () => texto.style.setProperty('--compresion', Math.min(1, (marco.clientHeight * 0.96) / texto.offsetHeight));
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(marco);
    document.fonts?.ready.then(ajustar);
    return () => observador.disconnect();
  });
  const nombreMesSolo = nombreMes(mes.anio, mes.mes).split(' ')[0];

  return (
    <main className="con-barra">
      <div className="mes">
        <FlechaMes onClick={() => mover(-1)} />
        <h1 className="solo-lectores">{nombreMes(mes.anio, mes.mes)}</h1>
        <span className="centro-mes">
          <span className="anio" aria-hidden="true">{mes.anio}</span>
          {!esMesActual && <button type="button" className="hoy-boton" onClick={irAHoy}>Hoy</button>}
        </span>
        <FlechaMes siguiente onClick={() => mover(1)} />
      </div>
      {eligiendo && (
        <div className="herramientas">
          <span className="tenue">Tocá días o el ☑ de una semana</span>
          <button className="chip" onClick={() => alternar(semanas.flat().filter(delMes))}>Todo el mes</button>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      <div className="marco-mes" ref={marcoRef} onTouchStart={tocarInicio} onTouchEnd={tocarFin}>
        <span key={nombreMesSolo} className="mes-gigante" aria-hidden="true" ref={mesRef}>{nombreMesSolo}</span>
        <div key={`${mes.anio}-${mes.mes}`} className={`cuadricula${direccion ? ` entra-${direccion > 0 ? 'derecha' : 'izquierda'}` : ''}`} role="grid" aria-label={nombreMes(mes.anio, mes.mes)}>
          {DIAS_CORTOS.map((d) => <div key={d} className="cabeza">{d}</div>)}
          <div className="cabeza">h</div>
          {semanas.map((semana) => (
            <Semana key={semana[0]} semana={semana} dias={dias} delMes={delMes} tocar={tocar} notasPorFecha={notasPorFecha} modoBolsa={modoBolsa} jornadas={jornadas}
              elegidos={elegidos} eligiendo={eligiendo} elegirSemana={() => alternar(semana)} />
          ))}
        </div>
      </div>

      <p className="total-mes">Este mes: <strong>{horas(totalMes)}</strong></p>
      <Tablero grupos={gruposMes} mes={claveMes} cambiado={cargarNotas} />
      {resumen && <ResumenAnio resumen={resumen} usuario={usuario} />}

      {(extraMes.pagadas > 0 || extraMes.bolsa > 0 || usadasMes > 0 || extras?.bolsa.saldo || delMesCargados.some((d) => domingoLibre(d, jornadas))) ? (
        <section className="panel-extra">
          <h2>Horas extra</h2>
          {extraMes.pagadas > 0 && (
            <p>💶 Pagadas este mes: <strong>{horas(extraMes.pagadas)}</strong>
              {extraMes.sinCobrar > 0 ? <> · <span className="aviso">{horas(extraMes.sinCobrar)} sin cobrar</span> <button className="enlace" onClick={cobrarMes}>Ya las cobré</button></> : ' · cobradas ✓'}
            </p>
          )}
          {modoBolsa !== 'ninguna' && (extraMes.bolsa > 0 || usadasMes > 0 || delMesCargados.some((d) => domingoLibre(d, jornadas))) && (
            modoBolsa === 'jornadas' && jornadas.length ? (
              <p>🗓 Días compensatorios este mes: <strong>{sumaEnDias([
                ...delMesCargados.filter((d) => d.extra?.pago === 'horas').map((d) => d.extra),
                ...delMesCargados.filter((d) => domingoLibre(d, jornadas)).map((d) => ({ minutos: domingoLibre(d, jornadas), jornadaId: d.jornadaId })),
              ], jornadas) || '—'}</strong>
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

      {tarifas !== undefined && <SueldoMes tarifas={tarifas} dias={delMesCargados} jornadas={jornadas} diasAnterior={diasAnterior} mesAnterior={mesAnterior} />}

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
        const t = d && aspecto(d, jornadas);
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
                {d.tipo === 'trabajo' ? d.tramos.map((tr) => <span key={tr.inicio}>{tramoCorto(tr)}</span>) : !t.personaje && <span>{t.icono}</span>}
              </span>
            )}
            {t?.personaje && <Personaje tipo={t.personaje} className="personaje" />}
            {minutosDelDia(d) > 0 && <span className="horas-dia">{horasCortas(minutosDelDia(d))}</span>}
            {!d?.extra && domingoLibre(d, jornadas) > 0 && (
              <span className="marca-extra horas">+{String(domingoLibre(d, jornadas) / jornadas.find((j) => j.id === d.jornadaId).minutosDia).replace('.5', ',5')}d</span>
            )}
            {d?.tipo === 'trabajo' && desdeIso(f).getDay() === 0 && jornadas.find((j) => j.id === d.jornadaId)?.domingo === 'pago' && (
              <span className="marca-domingo" title="Domingo pagado a mes vencido">€</span>
            )}
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
