# fixcomap/florindario

**Florindario**: calendario de trabajo para horarios rotativos. Cada usuario (login con Google) tiene
su calendario mensual con el turno de cada día; arma **semanas tipo** ("Jornada 20 h · Mañana",
"40 h · Tarde"…) y las aplica a semanas o meses enteros, retoca días sueltos y marca libres,
vacaciones, festivos y bajas. Suma las horas por semana y por mes.

Front React (Vite) en Cloudflare Pages + API Node (Express) en Cloud Run + Postgres en Neon.

| Entorno | Front | API | Rama |
|---|---|---|---|
| Producción | https://florindario.fixcomap.com | https://api-florindario.fixcomap.com | `main` |
| Desarrollo | https://florindario.dev.fixcomap.com | https://api-florindario.dev.fixcomap.com | `develop` |
| Local | http://localhost:5173 | http://localhost:3000 | tu rama |

## Estado

| Fase | Qué | |
|---|---|---|
| 1 | Esqueleto: API con `/salud`, login con Google, front, migraciones | ✅ |
| 2 | Calendario mensual, editar días (tramos, jornada partida, noche) y tipos de día | ✅ |
| 3 | Semanas tipo y aplicarlas a semanas o meses | ⏳ |
| 4 | Vacaciones por rango y horas por semana y mes | |

## Desarrollo local

Requisitos: Node 22+ y Docker.

```sh
cp .env.example .env                                   # y poner una POSTGRES_PASSWORD
docker compose up -d                                   # Postgres en localhost:5432
(cd apps/api && npm ci && npm run migrar && DEV_USER=tu@email npm run dev)   # API en :3000
(cd apps/web && npm ci && npm run dev)                 # front en http://localhost:5173
```

`DEV_USER` entra sin Google (solo fuera de producción).

## Cómo se despliega

Pipeline estándar de [`fixcomap/platform`](https://github.com/fixcomap/platform) según
[`catalog/florindario.yaml`](https://github.com/fixcomap/platform/blob/main/catalog/florindario.yaml):
PR → checks; `develop` → migraciones + API `florindario-dev` + front en Pages (rama `develop`);
`main` → producción con aprobación. GitFlow: `feature/*` → `develop`, `release/x.y.z` → `main`.

## Configuración en Cloud Run

| Variable | Origen |
|---|---|
| `DATABASE_URL` | secreto `florindario[-dev]-database-url` (Neon *pooled*, rol `florindario`) |
| `SESSION_SECRET` | secreto `florindario[-dev]-session-secret` (al azar) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | secretos del cliente OAuth `florindario` |
| `FRONT_URL`, `API_URL` | catálogo: primer hostname del entorno |

Migraciones: secreto `florindario[-dev]-database-url-direct` (cadena directa, sin pooler).
