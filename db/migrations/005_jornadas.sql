-- Jornadas del usuario ("Jornada 20 h", "Jornada 40 h"): cuánto dura un día de
-- esa jornada. Las plantillas (Mañana, Tarde, Noche) cuelgan de una jornada.
CREATE TABLE jornadas (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id   bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  nombre       text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 40),
  minutos_dia  int NOT NULL CHECK (minutos_dia BETWEEN 15 AND 1440),
  creada_en    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX jornadas_nombre ON jornadas (usuario_id, lower(nombre));

ALTER TABLE semanas_tipo ADD COLUMN jornada_id bigint REFERENCES jornadas ON DELETE SET NULL;

-- Cómo le devuelven las horas extra: bolsa de horas, por jornadas o no se devuelven (solo se pagan).
ALTER TABLE usuarios ADD COLUMN bolsa text NOT NULL DEFAULT 'horas' CHECK (bolsa IN ('horas', 'jornadas', 'ninguna'));

-- "Mañana" puede existir en cada jornada: el nombre es único dentro de su jornada.
DROP INDEX semanas_tipo_nombre;
CREATE UNIQUE INDEX semanas_tipo_nombre ON semanas_tipo (usuario_id, coalesce(jornada_id, 0), lower(nombre));
