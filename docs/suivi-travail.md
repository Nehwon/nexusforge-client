# Suivi du travail – Nexus Forge

Ce document sert de référence unique pour suivre l'avancement du projet.
Il est mis à jour à chaque lot de travail significatif.

Dernière mise à jour: 2026-03-09

---

## Fait

### Documentation

- Structure de conception posée dans:
  - `README.md`
  - `docs/architecture.md`
  - `docs/data-model/*.schema.json`
  - `docs/ui/*.md`
- Contrat API sync ajouté:
  - `docs/api/index.md`
  - `docs/api/sync-actions.md`

### Frontend (bootstrap V1)

- Projet frontend initialisé dans `frontend/` avec:
  - Vite + React + TypeScript
  - structure `src/` complète (features, router, services, hooks, types, utils)
  - routage de base
  - auth mock
  - pages sessions (liste + vue)
  - dashboard générique avec widgets stub
- PWA minimale en place:
  - `frontend/public/manifest.webmanifest`
  - `frontend/public/sw.js` (placeholder)
  - enregistrement du service worker dans `frontend/src/main.tsx`

### Hygiène repo et outillage (Sprint 0)

- `.gitignore` enrichi pour ignorer les artefacts locaux (`node_modules`, `dist`, logs, env, tsbuildinfo).
- Scripts npm standardisés dans `frontend/package.json`:
  - `typecheck`
  - `lint` (alias temporaire vers typecheck)
  - `build`
  - `test` (placeholder explicite)
- CI frontend en place dans `.github/workflows/frontend-ci.yml`:
  - installation dépendances
  - typecheck
  - build
  - test

### Couche data locale (Sprint 1 - base)

- IndexedDB introduite via Dexie:
  - base `nexus-forge-db` avec tables `sessions`, `systems`, `characters`, `notes`, `messages`, `documents`, `localActions`.
- Seed local des sessions ajouté pour bootstrap offline.
- Repository sessions ajouté et branché sur les pages:
  - `SessionsListPage` et `SessionViewPage` lisent désormais les données via IndexedDB.
  - ajout des états `loading` / `error` / `empty`.
- Journal d'actions local initial:
  - repository `localActionRepository` (enqueue/list/markSynced/markFailed),
  - enregistrement d'action locale sur `sessionRepository.upsert`.

### Couche data locale (Sprint 1 - extension widgets)

- Repositories ajoutés:
  - `noteRepository` (lecture session filtrée par rôle + création),
  - `documentRepository` (lecture session filtrée par rôle + marquage lu).
- Seeds locaux ajoutés pour notes et documents.
- Widgets branchés sur IndexedDB:
  - `NotesWidget` remplace le placeholder avec affichage public/privé selon rôle.
  - `DocumentsWidget` remplace le placeholder avec visibilité et action "marquer comme lu" côté joueur.

### Initiative + sync locale (Sprint 1 - extension)

- `Session` enrichi avec un état d'initiative persistant (`initiative.round`, `turnIndex`, `isInCombat`, `entries`).
- `InitiativeWidget` branché sur IndexedDB:
  - affichage ordre d'initiative,
  - actions MJ: démarrer combat, tour suivant, terminer combat,
  - persistance via `sessionRepository.updateInitiative`.
- Messages système initiative injectés dans le chat (`combat_start`, `round`, `turn`, `combat_end`).
- Boucle de sync locale minimale:
  - `runSyncCycle` traite les `localActions` en `pending` et les marque `synced`,
  - déclenchement au démarrage de l'app et à l'événement navigateur `online`.

### Chat persistant offline (Sprint 1 - extension)

- `messageRepository` ajouté pour lire/écrire les messages en IndexedDB.
- Seed local des messages de session ajouté.
- `chatStore` migré:
  - hydratation des messages depuis IndexedDB à l'ouverture de session,
  - `sendMessage` persiste désormais en base locale + journal d'actions,
  - `sendSystemMessage` persiste aussi en base locale,
  - conservation des canaux et du comportement de bannière whisper côté MJ.

### Fiches personnages connectées (Sprint 1 - extension)

- `characterRepository` ajouté:
  - lecture des personnages par session (filtrée par rôle/utilisateur),
  - mise à jour locale des ressources de fiche (`updateResource`) avec journalisation `localActions`.
- Seed local des personnages ajouté avec structure de fiche (`Character.sheet`).
- `CharacterWidget` branché sur IndexedDB:
  - fin du mock hardcodé,
  - sélection de fiche côté MJ quand plusieurs personnages sont disponibles,
  - édition rapide des ressources principales (+1/-1) avec persistance locale.

### Systèmes connectés aux jets (Sprint 1 - extension)

- `systemRepository` ajouté + seed local des systèmes (`rollDefinitions`).
- Modèle `GameSystem` enrichi avec les définitions de jets.
- `CharacterWidget` branché sur le système de la session:
  - les actions de fiche sont désormais alimentées par `rollDefinitions` du système quand disponibles,
  - exécution d'un jet local (parse simple de formule de dés),
  - publication du résultat en message système (`systemType = roll`) dans le chat persistant.

### Pipeline de sync offline-first (Sprint 2 - base)

- `localActions` enrichi avec métadonnées de sync:
  - `retryCount`,
  - `lastSyncAttemptAt`,
  - `syncedAt`.
- `runSyncCycle` renforcé:
  - traitement des actions `pending` et `failed`,
  - backoff exponentiel sur retries,
  - limite de retries (`MAX_RETRIES`),
  - rapport d'exécution (`processed/synced/failed/skipped`).
- Transport de sync introduit:
  - mode `mock` par défaut,
  - mode `http` disponible via `VITE_SYNC_TRANSPORT=http` (POST `/api/sync/actions`).
- Déclenchement sync dans l'app:
  - au démarrage,
  - au retour online,
  - polling toutes les 15 secondes.

### Sync - gestion des retours serveur (Sprint 2 - extension)

- Contrat de résultat de sync introduit:
  - `accepted`
  - `conflict`
  - `rejected`
- `localActions` enrichi pour la résolution:
  - statut `conflict`
  - `conflictFields` pour tracer les champs en divergence
- Moteur de sync mis à jour:
  - `accepted` -> `synced`
  - `conflict` -> statut `conflict` (non retraité automatiquement)
  - `rejected` -> échec terminal (pas de retry supplémentaire)
- Transport de sync:
  - mode mock capable de simuler `conflict`/`rejected` via `payload.__syncMode`
  - mode HTTP parse désormais une réponse JSON de statut sync.

### UI conflits de sync (Sprint 2 - extension)

- Panneau `SyncConflictsPanel` ajouté à la vue session:
  - liste des actions en statut `conflict`,
  - affichage des détails (`syncError`, `conflictFields`),
  - diff champ-à-champ `Local vs Serveur` pour les champs en conflit,
  - résolution par champ:
    - `Garder local`
    - `Garder serveur`,
  - résolution de masse par action:
    - `Tout garder local`
    - `Tout garder serveur`,
  - actions utilisateur:
    - `Rejouer` (repasse en pending + relance un cycle de sync),
    - `Ignorer` (marque l'action comme synced localement).
- Repository `localActionRepository` enrichi:
  - `retryConflict(actionId)`
  - `ignoreConflict(actionId)`
  - `resolveConflictField(actionId, fieldName, strategy)`
  - stockage des valeurs serveur en conflit (`conflictServerValues`)

### Observabilité sync (Sprint 2 - extension)

- Panneau `SyncStatusPanel` ajouté dans la vue session:
  - compteurs `total`, `pending`, `conflicts`, `failed`, `synced`,
  - bouton `Synchroniser maintenant`,
  - affichage du dernier rapport de cycle (`processed/synced/conflicts/failed/rejected/skipped`).

### Dashboard configurable par compte/rôle (Sprint 2 - extension)

- Profils dashboard persistés en base locale (`dashboardProfiles`) avec séparation par:
  - `userId`
  - `role` (`gm` / `player`)
- Multi-profils d'interface par compte:
  - création d'une nouvelle interface
  - duplication d'une interface existante
  - suppression
  - marquage en favori
- Personnalisation des modules:
  - affichage/masquage de chaque module
  - ordre des modules
  - taille par module (`S` / `M` / `L`)
- Positionnement des modules via drag & drop (mode édition).
- UX mode édition améliorée:
  - renommage inline des profils d'interface,
  - indicateur visuel de cible pendant le drag & drop.
- Le dashboard charge désormais le profil favori (ou le premier) pour le compte + rôle courant.

### Systèmes de jeu - catalogue & permissions (Sprint 3)

- `GameSystem` enrichi:
  - `ownerUserId`
  - `visibility` (`public` / `private`)
  - `rulesProgram`
  - `referenceSheets`
- `systemRepository` étendu:
  - `listAvailableForUser`
  - `getByIdForUser`
  - `create`
  - `duplicate`
  - contrôle d'édition propriétaire/admin.
- `SystemCatalogPanel` ajouté en session:
  - sélection du système actif de session,
  - création d'un système,
  - duplication du système courant,
  - indication explicite des droits d'édition.
- Auth mock enrichie avec rôle `admin` (email contenant `admin`).

### Éditeur visuel de système (Sprint 3)

- `SystemBuilderWidget` ajouté au dashboard MJ.
- Programmation visuelle type Scratch:
  - blocs `set_secondary_stat`
  - blocs `define_roll`
  - ordre des blocs par drag & drop.
- Moteur `systemRulesEngine`:
  - calcul automatique des statistiques secondaires,
  - génération d'actions de jet depuis les blocs,
  - exécution des jets avec modificateurs de champs.
- `CharacterWidget` connecté au moteur:
  - application auto des règles système,
  - rafraîchissement à la sauvegarde du système.
- Protection d'édition:
  - mode lecture seule si utilisateur non propriétaire et non admin.

### Templates de fiches de référence (Sprint 3 - extension)

- CRUD des templates dans l'éditeur système:
  - création
  - duplication
  - renommage
  - suppression
- Édition des champs:
  - ajout/suppression de champs (`number`, `resource`, `text`, `tag`)
  - mise à jour label/valeur/max
- Gestion des groupes:
  - création/suppression de groupe
  - renommage
  - layout `grid` / `list`
- Drag & drop:
  - réordonnancement des champs
  - déplacement inter-groupes
- Mode preview:
  - rendu de la fiche finale directement dans l'éditeur,
  - application des règles `rulesProgram` dans l'aperçu.

### Fiches de session depuis templates (Sprint 3 - extension)

- `characterRepository.createFromReferenceSheet` ajouté.
- `CharacterWidget` permet de créer une fiche en session depuis un template du système.

### Seed SteamShadows Core (Sprint 3 - extension)

- Système `SteamShadows Core` enrichi avec templates:
  - PJ
  - PNJ
  - Créature
- Template `Horreur (Arcanum)` ajouté (base MJ).
- Bestiaire instancié:
  - génération automatique d'une fiche de référence par Horreur connue (Cercles I à V),
  - préremplissage cercle, dé associé, type parasite, actions de jet.

### Connexion frontend vers backend (Sprint 3 - extension)

- Couche API commune ajoutée (`apiClient`):
  - `VITE_API_BASE_URL`
  - `VITE_BACKEND_ENABLED`
  - gestion tokens (`access` / `refresh`) en localStorage
  - helper `requestJson` avec header Bearer.
- Auth branchée backend:
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - refresh automatique via `POST /api/auth/refresh`
  - logout via `POST /api/auth/logout`
  - fallback mock conservé si backend non activé.
- Repositories branchés backend avec fallback local:
  - sessions (`GET /api/sessions`, `GET /api/sessions/{id}`, `PATCH /api/sessions/{id}`)
  - systèmes (`GET /api/systems`, `GET /api/systems/{id}`, `POST`, `PATCH`, `duplicate`)
  - création fiche depuis template (`POST /api/sessions/{sessionId}/characters/from-template`)
- Sync HTTP auth:
  - `POST /api/sync/actions` via `requestJson` authentifié.

---

## En cours

- Aucun chantier en cours à la date de cette mise à jour.

---

## À faire (priorisé)

1. Stabiliser l'UX V1 frontend:
   - design system léger (tokens, composants, layout responsive)
   - états d'erreur/chargement cohérents
   - améliorer l'ergonomie du mode édition dashboard (indicateurs DnD, renommage des profils)
2. Brancher une vraie auth:
   - flux login réel
   - persistance de session
   - protection des routes basée sur token
3. Étendre la couche de données locale:
   - branchement progressif des widgets restants sur IndexedDB
4. Implémenter la sync offline-first:
   - connecter le mode `http` à un backend réel (`/api/sync/actions`)
   - enrichir la UI de résolution (diff champ à champ)
   - stratégie de conflits (priorité MJ + cas fiche PJ)
5. Remplacer les widgets stub par logique métier:
   - chat/messages
   - documents
   - notes/journal
   - initiative/combat
6. Ajouter les tests:
   - unitaires (types, store, hooks)
   - intégration (routing + auth + pages session)
7. Mettre en place un linting applicatif réel:
   - ESLint TypeScript/React
   - règles de qualité (imports, hooks, patterns React)

---

## Règle de mise à jour

- À la fin de chaque tâche:
  - déplacer les éléments terminés vers **Fait**
  - ajouter les nouvelles tâches dans **À faire**
  - mettre à jour la date en tête de document
