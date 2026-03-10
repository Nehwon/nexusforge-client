# API - Nexus Forge

- Backend MVP (endpoints existants): [`backend-mvp.md`](./backend-mvp.md)
- Sync offline-first: [`sync-actions.md`](./sync-actions.md)
- Déploiement + backup production: procédure privée hors dépôt

## Couverture actuelle côté frontend

- Auth réelle backend (inscription, validation email, approbation admin, login JWT, reset password, 2FA TOTP).
- Routes protégées + espace admin pour valider les comptes.
- Sessions locales + binding du `systemId` de session.
- Administration des parties: création, archivage/restauration, suppression définitive (owner/admin), propriétaire + multi-MJ.
- Systèmes de jeu:
  - listing des systèmes disponibles pour l'utilisateur,
  - création (vierge ou depuis template),
  - duplication (fork),
  - mise à jour avec contrôle propriétaire/admin.
  - schéma studio visuel persisté (`studioSchema`),
  - métadonnées de fork (`forkedFromSystemId`, `forkedFromSystemName`).
- Admin:
  - validation des comptes en attente,
  - métriques d'usage systèmes (`GET /api/admin/systems/usage`),
  - suppression système avec migration des parties (`DELETE /api/admin/systems/{id}`).
- Templates de fiches de référence intégrés aux systèmes.
- Création de fiches de session depuis template de système.
- Sync des actions locales via `/api/sync/actions` (mode HTTP).
