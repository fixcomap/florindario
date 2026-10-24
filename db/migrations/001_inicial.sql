-- Cada usuario entra con su cuenta de Google y tiene su propio calendario.
CREATE TABLE usuarios (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  google_sub  text NOT NULL UNIQUE,
  email       text NOT NULL,
  nombre      text NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Sesión: en la cookie va el token; aquí solo su hash.
CREATE TABLE sesiones (
  token_hash  text PRIMARY KEY,
  usuario_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  vence_en    timestamptz NOT NULL
);
CREATE INDEX sesiones_usuario ON sesiones (usuario_id);

-- Tramos horarios de un día: [{"inicio": "09:00", "fin": "13:00"}, ...]. Más de
-- uno = jornada partida; fin < inicio = el tramo pasa de medianoche (22:00-06:00).
-- Semana tipo ("Jornada 20 h · Mañana"): 7 días, de lunes (0) a domingo (6), cada
-- uno {"tipo": "trabajo", "tramos": [...]} o {"tipo": "libre"}. Se aplica a
-- semanas o meses enteros y después se retocan días sueltos.
CREATE TABLE semanas_tipo (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  nombre      text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 40),
  dias        jsonb NOT NULL CHECK (jsonb_typeof(dias) = 'array' AND jsonb_array_length(dias) = 7),
  creada_en   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX semanas_tipo_nombre ON semanas_tipo (usuario_id, lower(nombre));

-- Lo que pasa cada día. Un día sin fila es un día sin cargar (no "libre").
CREATE TABLE dias (
  usuario_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  fecha       date NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('trabajo', 'libre', 'vacaciones', 'festivo', 'baja')),
  tramos      jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(tramos) = 'array'),
  nota        text CHECK (length(nota) <= 200),
  PRIMARY KEY (usuario_id, fecha),
  -- Solo los días de trabajo tienen horario, y siempre al menos un tramo.
  CHECK ((tipo = 'trabajo') = (jsonb_array_length(tramos) > 0))
);
