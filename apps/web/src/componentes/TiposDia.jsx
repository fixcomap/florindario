import { TIPOS } from '../datos/tipos.js';

// Botones para elegir el tipo de día; "vacio" (opcional) = no tocar ese día.
export default function TiposDia({ valor, cambiar, vacio }) {
  const opciones = vacio ? [{ id: null, nombre: vacio, icono: '·' }, ...TIPOS] : TIPOS;
  return (
    <div className="tipos">
      {opciones.map((t) => {
        const activo = valor === t.id;
        return (
          <button
            key={t.id ?? 'vacio'}
            type="button"
            className={activo ? 'activo' : ''}
            style={activo && t.color ? { background: t.fondo, borderColor: t.color, color: t.color } : undefined}
            aria-pressed={activo}
            onClick={() => cambiar(t.id)}
          >
            {t.icono} {t.nombre}
          </button>
        );
      })}
    </div>
  );
}
