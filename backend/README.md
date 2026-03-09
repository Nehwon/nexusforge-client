# NexusForge Backend (MVP)

Backend Node.js/Express minimal aligné avec le frontend de ce repo.

## Prérequis

- Node.js 18+

## Installation

```bash
cd backend
npm install
cp .env.example .env
npm start
```

## Variables d'environnement

- `PORT` (default: `4000`)
- `CORS_ORIGIN` (ex: `https://nexusforge.en-ligne.fr`)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ACCESS_TOKEN_EXPIRES_IN` (default: `1h`)
- `REFRESH_TOKEN_EXPIRES_IN` (default: `30d`)

## Endpoints utilisés par le frontend

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/sessions`
- `GET /api/sessions/{id}`
- `PATCH /api/sessions/{id}`
- `GET /api/systems`
- `GET /api/systems/{id}`
- `POST /api/systems`
- `PATCH /api/systems/{id}`
- `POST /api/systems/{id}/duplicate`
- `POST /api/sessions/{sessionId}/characters/from-template`
- `POST /api/sync/actions`

## Notes

- Stockage en mémoire (MVP), pas de persistance disque/DB.
- Redémarrer le process réinitialise les données.
