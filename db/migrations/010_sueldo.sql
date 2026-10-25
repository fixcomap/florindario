-- Tarifas para estimar el sueldo del mes desde el calendario (lo carga el
-- usuario; no se sube ninguna nómina). Importes en céntimos; porcentajes en
-- centésimas (1550 = 15,50 %).
CREATE TABLE sueldos (
  usuario_id     bigint PRIMARY KEY REFERENCES usuarios ON DELETE CASCADE,
  modo           text NOT NULL CHECK (modo IN ('mensual', 'hora')),
  base_cent      int NOT NULL CHECK (base_cent BETWEEN 0 AND 100000000),
  extra_cent     int NOT NULL DEFAULT 0 CHECK (extra_cent BETWEEN 0 AND 1000000),
  nocturna_cent  int NOT NULL DEFAULT 0 CHECK (nocturna_cent BETWEEN 0 AND 1000000),
  domingo_cent   int NOT NULL DEFAULT 0 CHECK (domingo_cent BETWEEN 0 AND 1000000),
  irpf_cent      int NOT NULL DEFAULT 0 CHECK (irpf_cent BETWEEN 0 AND 6000),
  ss_cent        int NOT NULL DEFAULT 0 CHECK (ss_cent BETWEEN 0 AND 3000),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
