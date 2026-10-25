-- Días compensatorios (por jornadas) pasa a ser lo predeterminado; la bolsa de
-- horas queda como opción en Cuenta.
ALTER TABLE usuarios ALTER COLUMN bolsa SET DEFAULT 'jornadas';
UPDATE usuarios SET bolsa = 'jornadas' WHERE bolsa = 'horas';
