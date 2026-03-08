# Suivi du travail – Nexus Forge

Ce document sert de référence unique pour suivre l'avancement du projet.
Il est mis à jour à chaque lot de travail significatif.

Dernière mise à jour: 2026-03-08

---

## Fait

### Documentation

- Structure de conception posée dans:
  - `README.md`
  - `docs/architecture.md`
  - `docs/data-model/*.schema.json`
  - `docs/ui/*.md`

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

---

## En cours

- Aucun chantier en cours à la date de cette mise à jour.

---

## À faire (priorisé)

1. Stabiliser l'UX V1 frontend:
   - design system léger (tokens, composants, layout responsive)
   - états d'erreur/chargement cohérents
2. Brancher une vraie auth:
   - flux login réel
   - persistance de session
   - protection des routes basée sur token
3. Implémenter la couche de données locale:
   - IndexedDB (Dexie/RxDB)
   - modèles alignés avec les schémas
4. Implémenter la sync offline-first:
   - journal d'actions local
   - reprise en ligne
   - stratégie de conflits (priorité MJ + cas fiche PJ)
5. Remplacer les widgets stub par logique métier:
   - chat/messages
   - documents
   - notes/journal
   - initiative/combat
6. Ajouter les tests:
   - unitaires (types, store, hooks)
   - intégration (routing + auth + pages session)
7. Mettre en place CI frontend:
   - lint
   - typecheck
   - build

---

## Règle de mise à jour

- À la fin de chaque tâche:
  - déplacer les éléments terminés vers **Fait**
  - ajouter les nouvelles tâches dans **À faire**
  - mettre à jour la date en tête de document
