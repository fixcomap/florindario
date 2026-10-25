-- Jornada en la que se trabajó cada día (un mes puede mezclar 20 h y 40 h) y
-- tarifa base de cada jornada para estimar el sueldo.
ALTER TABLE dias
  ADD COLUMN jornada_id bigint REFERENCES jornadas ON DELETE SET NULL,
  ADD CHECK (jornada_id IS NULL OR tipo = 'trabajo');

-- Días ya cargados: la jornada de la plantilla con el mismo horario ese día de la
-- semana o, si no, la de su día extra.
UPDATE dias d SET jornada_id = coalesce(
  (SELECT s.jornada_id FROM semanas_tipo s
    WHERE s.usuario_id = d.usuario_id AND s.jornada_id IS NOT NULL
      AND s.dias -> (extract(isodow FROM d.fecha)::int - 1) -> 'tramos' = d.tramos
    ORDER BY s.id LIMIT 1),
  d.extra_jornada_id)
WHERE d.tipo = 'trabajo' AND d.jornada_id IS NULL;

CREATE TABLE sueldos_jornadas (
  usuario_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  jornada_id  bigint NOT NULL REFERENCES jornadas ON DELETE CASCADE,
  modo        text NOT NULL CHECK (modo IN ('mensual', 'hora')),
  base_cent   int NOT NULL CHECK (base_cent BETWEEN 0 AND 100000000),
  PRIMARY KEY (usuario_id, jornada_id)
);
