# fixcomap/florindario

**Florindario**: calendario de trabajo para horarios rotativos. Cada usuario (login con Google) tiene
su calendario mensual con el turno de cada día; arma **semanas tipo** ("Jornada 20 h · Mañana",
"40 h · Tarde"…) y las aplica a semanas o meses enteros, retoca días sueltos y marca libres,
vacaciones, festivos y bajas. Suma las horas por semana y por mes.

Front React (Vite) en Cloudflare Pages + API Node (Express) en Cloud Run + Postgres en Neon.

Producción: https://florindario.fixcomap.com

## Estado

| Fase | Qué | |
|---|---|---|
| 1 | Esqueleto: API con `/salud`, login con Google, front, migraciones | ✅ |
| 2 | Calendario mensual, editar días (tramos, jornada partida, noche) y tipos de día; cuentas abiertas con protección automática | ✅ |
| 3 | Plantillas y jornadas, elegir varios días, horas extra y días compensatorios, notas, sueldo estimado | ✅ |
| 4 | Nóminas: comparar lo estimado con lo cobrado | |

## Desarrollo local

Requisitos: Node 22+ y Docker.

```sh
cp .env.example .env                                   # y poner una POSTGRES_PASSWORD
docker compose up -d                                   # Postgres en localhost:5432
(cd apps/api && npm ci && npm run migrar && DEV_USER=tu@email npm run dev)   # API en :3000
(cd apps/web && npm ci && npm run dev)                 # front en http://localhost:5173
```

`DEV_USER` entra sin Google (solo fuera de producción). El login con Google se prueba en desarrollo.

## Despliegue

Pipeline estándar de [fixcomap/platform](https://github.com/fixcomap/platform): PR → checks;
`develop` → entorno de desarrollo (privado); `main` → producción con aprobación.
