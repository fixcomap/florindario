-- Vacaciones del usuario: días al año (0 = sin configurar), si se cuentan en
-- días hábiles (lunes a viernes) o naturales, y días de libre disposición al año.
ALTER TABLE usuarios
  ADD COLUMN vacaciones_anuales int NOT NULL DEFAULT 0 CHECK (vacaciones_anuales BETWEEN 0 AND 60),
  ADD COLUMN vacaciones_computo text NOT NULL DEFAULT 'habiles' CHECK (vacaciones_computo IN ('habiles', 'naturales')),
  ADD COLUMN dias_disposicion int NOT NULL DEFAULT 0 CHECK (dias_disposicion BETWEEN 0 AND 10);

-- Día de libre disposición: libre que elige el usuario y descuenta de su cupo anual.
ALTER TABLE dias
  DROP CONSTRAINT dias_tipo_check,
  ADD CONSTRAINT dias_tipo_check CHECK (tipo IN ('trabajo', 'libre', 'vacaciones', 'festivo', 'baja', 'compensado', 'disposicion'));
