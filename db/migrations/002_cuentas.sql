-- Cuentas: alta automática con Google y, antes de usar la app, aceptar términos y
-- privacidad (pendiente -> activa). Suspendida = bloqueada (automática por abuso).
ALTER TABLE usuarios
  ADD COLUMN estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'activa', 'suspendida')),
  ADD COLUMN terminos_aceptados_en timestamptz,
  ADD COLUMN suspendida_motivo text;

-- Escrituras por usuario y hora: base de la suspensión automática por abuso.
CREATE TABLE actividad (
  usuario_id   bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  hora         timestamptz NOT NULL,
  escrituras   int NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, hora)
);

-- Altas por hora (todas las cuentas): tope global ante una avalancha de registros.
CREATE INDEX usuarios_creado_en ON usuarios (creado_en);
