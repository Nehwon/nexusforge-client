# NexusForge Backend

Backend Node.js/Express connecté au frontend NexusForge.

## Prérequis

- Node.js 20+

## Installation

```bash
cd backend
npm install
cp .env.example .env
npm start
```

## Variables d'environnement clés

- `PORT` (default `4000`)
- `CORS_ORIGIN` (ex: `https://nexusforge.en-ligne.fr`)
- `APP_BASE_URL` (URL frontend, utilisée dans les emails)
- `API_BASE_URL` (URL API publique)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `ROOT_ADMIN_*` (compte admin protégé)
- `SMTP_*` (envoi des emails vérification/réinit)

## Auth & sécurité implémentés

- Inscription: nom, prénom, nickname, email, mot de passe
- Validation email via token
- Approbation admin obligatoire avant accès
- Login JWT access + refresh
- Verrouillage progressif après échecs: 15m, 30m, 1h
- Mot de passe oublié / reset
- Changement de mot de passe connecté
- 2FA TOTP optionnel (fortement recommandé)
- Compte `ROOT_ADMIN` protégé (non rétrogradable/supprimable)

## Endpoints principaux

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/resend-verification`
- `POST /api/auth/verify-email`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `POST /api/auth/totp/setup`
- `POST /api/auth/totp/enable`
- `POST /api/auth/totp/disable`
- `GET /api/admin/users/pending`
- `POST /api/admin/users/:userId/approve`

Les endpoints sessions/systems/sync du MVP restent disponibles.
