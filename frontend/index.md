# Frontend – Nexus Forge

Ce dossier contient le code du frontend de Nexus Forge, implémenté comme une Progressive Web App (PWA) offline‑first.

---

## 1. Objectifs du frontend

- Offrir une interface **multi‑plateforme** (desktop, tablette, mobile) via une application web moderne.
- Supporter le mode **offline‑first** :
  - base de données locale,
  - synchro différée vers le backend,
  - gestion des conflits côté MJ.
- Fournir un **dashboard** configurable pour MJ et joueurs, avec des widgets dédiés.
- Intégrer l’authentification :
  - email + mot de passe,
  - 2FA (TOTP, WebAuthn à terme),
  - liaison de compte Discord.

---

## 2. Stack utilisée (état actuel)

- Bundler : Vite
- Framework UI : React
- Langage : TypeScript
- Routing : React Router
- State management : React Context (auth mock)
- PWA : manifest + service worker placeholder

---

## 3. Structure de `src/` (mise en place)

```text
src/
├─ main.tsx              # Point d'entrée de l'app
├─ App.tsx               # Layout racine + routes
├─ router/
│  └─ index.tsx          # Définition des routes
├─ assets/               # Logos, icônes, images
├─ styles/               # Styles globaux (CSS, Tailwind, etc.)
├─ components/           # Composants UI génériques (Button, Modal, Layout…)
├─ features/
│  ├─ auth/              # Login, register, 2FA, profil, Discord
│  ├─ dashboard/         # Dashboard et widgets
│  ├─ characters/        # Fiches PJ/PNJ
│  ├─ sessions/          # Liste de sessions, vue de session
│  ├─ chat/              # Chat & messages
│  ├─ documents/         # Documents & handouts
│  ├─ notes/             # Notes et journal
│  └─ ...                # Extensions futures
├─ store/                # State global (auth, session, dashboard, etc.)
├─ services/             # API, sync offline, PWA, WebSocket…
├─ hooks/                # Hooks réutilisables
├─ types/                # Types partagés (User, System, Session, Message…)
└─ utils/                # Helpers, constantes
```

---

## 4. Pages principales (V1 actuelle)

- Auth

	- /login : écran de connexion
	- /account/security : sécurité du compte (2FA, WebAuthn, Discord)

- Sessions

	- /sessions : liste des campagnes/sessions
	- /sessions/:id : vue de session (dashboard MJ ou joueur selon rôle)

- Systèmes & fiches

	- /systems (plus tard) : gestion / édition des systèmes de jeu
	- /characters/:id (optionnel) : accès direct à une fiche

## 5. Intégration avec le reste du projet

- Le frontend utilise les schémas définis dans docs/data-model/ :

	- User, System, Character, Session, Message, Note, Document, etc.
	- Ces schémas servent de base pour :
		- les types TypeScript dans src/types/,
		- la validation des données (import/export JSON, communication API),
		- l’implémentation des widgets (dashboard).

## 6. Prochaines étapes

- Connecter progressivement les features :
	- Auth réelle,
	- Session live,
	- Fiches personnages,
	- Chat & documents,
	- Offline + sync.

Suivi opérationnel du travail fait/à faire:
- [`docs/suivi-travail.md`](../docs/suivi-travail.md)
