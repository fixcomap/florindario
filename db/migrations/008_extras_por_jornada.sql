-- Modo "por jornadas": de qué jornada es el día extra trabajado y el libre
-- compensado, para contarlos en días de esa jornada (no en horas).
ALTER TABLE dias
  ADD COLUMN extra_jornada_id bigint REFERENCES jornadas ON DELETE SET NULL,
  ADD COLUMN compensa_jornada_id bigint REFERENCES jornadas ON DELETE SET NULL,
  ADD CHECK (extra_jornada_id IS NULL OR extra_minutos > 0),
  ADD CHECK (compensa_jornada_id IS NULL OR tipo = 'compensado');
