-- Horas extra de un día de trabajo: cuántas y cómo se compensan ('dinero' = se
-- pagan, con marca de cobradas; 'horas' = van a la bolsa de horas libres).
-- Día "compensado": libre que gasta minutos de esa bolsa.
ALTER TABLE dias DROP CONSTRAINT dias_tipo_check;
ALTER TABLE dias
  ADD CONSTRAINT dias_tipo_check CHECK (tipo IN ('trabajo', 'libre', 'vacaciones', 'festivo', 'baja', 'compensado')),
  ADD COLUMN extra_minutos int NOT NULL DEFAULT 0 CHECK (extra_minutos BETWEEN 0 AND 1440),
  ADD COLUMN extra_pago text CHECK (extra_pago IN ('dinero', 'horas')),
  ADD COLUMN extra_cobrada boolean NOT NULL DEFAULT false,
  ADD COLUMN compensa_minutos int NOT NULL DEFAULT 0 CHECK (compensa_minutos BETWEEN 0 AND 1440),
  ADD CHECK ((extra_minutos > 0) = (extra_pago IS NOT NULL)),
  ADD CHECK (extra_minutos = 0 OR tipo = 'trabajo'),
  ADD CHECK (NOT extra_cobrada OR extra_pago = 'dinero'),
  ADD CHECK ((tipo = 'compensado') = (compensa_minutos > 0));
