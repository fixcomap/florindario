-- Nota fijada: se ve en el tablero de todos los meses.
ALTER TABLE notas ADD COLUMN fijada boolean NOT NULL DEFAULT false;
CREATE INDEX notas_fijadas ON notas (usuario_id) WHERE fijada;
