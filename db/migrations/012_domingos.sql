-- Qué pasa con un domingo trabajado en cada jornada: nada especial, días
-- compensatorios (domingo_medios: medios días, 2 = 1 día) o se paga a mes vencido.
ALTER TABLE jornadas
  ADD COLUMN domingo text NOT NULL DEFAULT 'normal' CHECK (domingo IN ('normal', 'libres', 'pago')),
  ADD COLUMN domingo_medios int NOT NULL DEFAULT 2 CHECK (domingo_medios BETWEEN 1 AND 10);

-- Importe del domingo pagado: por domingo o por hora (0 = todavía sin cargar).
ALTER TABLE sueldos_jornadas
  ADD COLUMN domingo_cent int NOT NULL DEFAULT 0 CHECK (domingo_cent BETWEEN 0 AND 1000000),
  ADD COLUMN domingo_por text NOT NULL DEFAULT 'dia' CHECK (domingo_por IN ('dia', 'hora'));
