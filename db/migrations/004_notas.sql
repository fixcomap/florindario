-- Notas: una nota con una o varias fechas (la misma nota en varios días) o sin
-- fechas (general del mes, en "mes" = primer día). Reemplazan a dias.nota.
CREATE TABLE notas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  texto       text NOT NULL CHECK (length(texto) BETWEEN 1 AND 500),
  mes         date CHECK (mes = date_trunc('month', mes)::date),
  creada_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notas_usuario_mes ON notas (usuario_id, mes);

CREATE TABLE notas_fechas (
  nota_id  bigint NOT NULL REFERENCES notas ON DELETE CASCADE,
  fecha    date NOT NULL,
  PRIMARY KEY (nota_id, fecha)
);
CREATE INDEX notas_fechas_fecha ON notas_fechas (fecha);

-- Las notas de días que ya existían: una nota por texto igual, con todas sus fechas.
WITH g AS (
  SELECT usuario_id, nota, array_agg(fecha) AS fechas FROM dias WHERE nota IS NOT NULL GROUP BY usuario_id, nota
), nuevas AS (
  INSERT INTO notas (usuario_id, texto) SELECT usuario_id, nota FROM g RETURNING id, usuario_id, texto
)
INSERT INTO notas_fechas (nota_id, fecha)
SELECT n.id, unnest(g.fechas) FROM nuevas n JOIN g ON g.usuario_id = n.usuario_id AND g.nota = n.texto;

UPDATE dias SET nota = NULL WHERE nota IS NOT NULL;
