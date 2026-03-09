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
