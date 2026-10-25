-- Pines por tramos de meses: una nota fijada se ve desde "desde" hasta el mes
-- anterior a "hasta" (el mes en que se le quitó el pin; NULL = sigue fijada).
-- Quitar el pin no la borra de los meses pasados; volver a fijarla abre otro tramo.
CREATE TABLE notas_pines (
  nota_id  bigint NOT NULL REFERENCES notas ON DELETE CASCADE,
  desde    date NOT NULL CHECK (desde = date_trunc('month', desde)::date),
  hasta    date CHECK (hasta = date_trunc('month', hasta)::date AND hasta > desde),
  PRIMARY KEY (nota_id, desde)
);
CREATE UNIQUE INDEX notas_pines_abierto ON notas_pines (nota_id) WHERE hasta IS NULL;

INSERT INTO notas_pines (nota_id, desde)
SELECT n.id, coalesce(n.mes,
  (SELECT date_trunc('month', min(f.fecha))::date FROM notas_fechas f WHERE f.nota_id = n.id),
  date_trunc('month', now())::date)
FROM notas n WHERE n.fijada;

DROP INDEX notas_fijadas;
ALTER TABLE notas DROP COLUMN fijada;
