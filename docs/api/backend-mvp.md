# API Backend MVP

Document de référence pour l'API backend actuellement implémentée dans `backend/src/server.js`.

## Base URL et format

- Base REST: `/api`
- Healthcheck: `GET /health`
- JSON `application/json`
- Auth Bearer requise sur tous les endpoints `/api/*` sauf endpoints auth publics.

Format d'erreur standard:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable",
    "details": {}
  }
}
```

## Persistance backend

Le backend persiste son état en JSON (`DATA_FILE`, par défaut `backend/data/state.json`):

- users, sessions, systems, characters,
- tokens de session/verification/reset/2FA.

En production:

- `ENABLE_DEMO_SEED=false` recommandé,
- sauvegarder `DATA_FILE` avant chaque déploiement.

## Auth publique

### `POST /api/auth/register`

Crée un compte en état `pending`.

Body:

```json
{
  "firstName": "Mikael",
  "lastName": "Fremaux",
  "nickname": "IronmanLM",
  "email": "ironmanlm@en-ligne.fr",
  "password": "MotDePasseLong"
}
```

Réponse `201`:

```json
{
  "status": "pending_email_verification",
  "message": "Account created. Verify your email, then wait for admin approval."
}
```

### `POST /api/auth/resend-verification`

Body: `{ "email": "user@example.com" }`

### `POST /api/auth/verify-email`

Body: `{ "token": "..." }`

Réponse `200`:

```json
{
  "status": "verified",
  "approvalStatus": "pending"
}
```

### `GET /api/auth/verify-email?token=...`

Même effet que la version POST.

### `POST /api/auth/login`

Body minimal:

```json
{
  "email": "user@example.com",
  "password": "MotDePasse"
}
```

Cas standard `200`:

```json
{
  "token": "...",
  "refreshToken": "...",
  "user": {
    "id": "user-...",
    "displayName": "Nick (Prenom Nom)",
    "email": "user@example.com",
    "roles": ["player"],
    "isEmailVerified": true,
    "approvalStatus": "approved",
    "hasTotpEnabled": false,
    "isProtectedRootAdmin": false,
    "createdAt": "2026-03-09T00:00:00.000Z"
  }
}
```

Cas 2FA requis `200`:

```json
{
  "requiresTwoFactor": true,
  "challengeToken": "...",
  "methods": ["totp"]
}
```

Finalisation 2FA: renvoyer `POST /api/auth/login` avec:

```json
{
  "email": "user@example.com",
  "password": "MotDePasse",
  "challengeToken": "...",
  "totpCode": "123456"
}
```

### `POST /api/auth/refresh`

Body: `{ "refreshToken": "..." }`

### `POST /api/auth/forgot-password`

Body: `{ "email": "user@example.com" }`

### `POST /api/auth/reset-password`

Body:

```json
{
  "token": "...",
  "password": "NouveauMotDePasseLong"
}
```

## Auth privée (Bearer)

### `GET /api/auth/me`

Retourne `user` courant.

### `POST /api/auth/logout`

Body optionnel: `{ "refreshToken": "..." }`

### `POST /api/auth/change-password`

Body:

```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```

### `POST /api/auth/totp/setup`

Réponse `200`:

```json
{
  "secret": "BASE32SECRET",
  "otpauthUrl": "otpauth://totp/...",
  "recommended": true
}
```

### `POST /api/auth/totp/enable`

Body: `{ "code": "123456" }`

### `POST /api/auth/totp/disable`

Body: `{ "code": "123456" }`

Note:

- si le serveur définit `ROOT_ADMIN_TOTP_SECRET`, le compte root admin protégé reçoit `403 ROOT_ADMIN_2FA_FORCED` et ne peut pas désactiver le 2FA.

## Admin

### `GET /api/admin/users/pending`

Liste uniquement les comptes `pending` dont email déjà validé.

### `POST /api/admin/users/:userId/approve`

Body:

```json
{
  "roles": ["player"]
}
```

Rôles permis: `player`, `gm`, `admin`.

Règles:

- email doit être validé avant approbation,
- compte root admin protégé non modifiable (`ROOT_ADMIN_PROTECTED`).

### `GET /api/admin/systems/usage`

Liste des systèmes avec métriques d'usage:

- `usersUsingNow`
- `activeSessionsCount`
- `archivedSessionsCount`
- `totalSessionsCount`
- `lastUsedAt`

### `DELETE /api/admin/systems/:systemId`

Supprime un système (admin uniquement) et migre les parties liées vers un système de remplacement.

Body:

```json
{
  "replacementSystemId": "sys-steamshadows-reference"
}
```

## Sessions / Systems / Sync

Toujours disponibles comme dans le MVP existant:

- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/{id}`
- `PATCH /api/sessions/{id}`
- `DELETE /api/sessions/{id}`
- `POST /api/sessions/{id}/archive`
- `POST /api/sessions/{id}/restore`
- `GET /api/systems`
- `GET /api/systems/{id}`
- `POST /api/systems`
- `PATCH /api/systems/{id}`
- `POST /api/systems/{id}/duplicate`
- `POST /api/sessions/{sessionId}/characters/from-template`
- `POST /api/sync/actions`

### Détail des payloads `systems`

`POST /api/systems` accepte notamment:

- `name` (string)
- `description` (string, optionnel)
- `visibility` (`public` | `private`)
- `templateFromSystemId` (string, optionnel)
- `rulesProgram` / `rulesPresentation` / `studioSchema` / `referenceSheets` (optionnels)

Notes:

- si `templateFromSystemId` est fourni et accessible, le système est créé comme fork avec:
  - `forkedFromSystemId`
  - `forkedFromSystemName`

`PATCH /api/systems/{id}` accepte notamment:

- `name`, `description`, `version`, `visibility`, `tags`
- `rulesProgram`, `rulesPresentation`, `studioSchema`, `referenceSheets`

`POST /api/systems/{id}/duplicate` accepte:

- `name` (optionnel)
- `description` (optionnel)

et retourne un système avec fork metadata (`forkedFromSystemId`, `forkedFromSystemName`).

## Codes d'erreur notables

- `INVALID_REGISTRATION_PAYLOAD`
- `EMAIL_ALREADY_REGISTERED`
- `WEAK_PASSWORD`
- `INVALID_CREDENTIALS`
- `EMAIL_NOT_VERIFIED`
- `ACCOUNT_PENDING_APPROVAL`
- `ACCOUNT_LOCKED`
- `INVALID_2FA_CHALLENGE`
- `INVALID_2FA_CODE`
- `INVALID_VERIFICATION_TOKEN`
- `EXPIRED_VERIFICATION_TOKEN`
- `INVALID_RESET_TOKEN`
- `EXPIRED_RESET_TOKEN`
- `ROOT_ADMIN_PROTECTED`
