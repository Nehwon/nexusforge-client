# API - Nexus Forge

- Backend MVP (endpoints existants): [`backend-mvp.md`](./backend-mvp.md)
- Sync offline-first: [`sync-actions.md`](./sync-actions.md)

## Couverture actuelle côté frontend

- Auth réelle backend (inscription, validation email, approbation admin, login JWT, reset password, 2FA TOTP).
- Routes protégées + espace admin pour valider les comptes.
- Sessions locales + binding du `systemId` de session.
- Systèmes de jeu:
  - listing des systèmes disponibles pour l'utilisateur,
  - création,
  - duplication,
  - mise à jour avec contrôle propriétaire/admin.
- Templates de fiches de référence intégrés aux systèmes.
- Création de fiches de session depuis template de système.
- Sync des actions locales via `/api/sync/actions` (mode HTTP).
