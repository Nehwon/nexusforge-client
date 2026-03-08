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

## 2. Stack envisagée

*(indicatif, à ajuster selon tes choix techniques)*

- Bundler : Vite
- Framework UI : React (ou équivalent)
- Langage : TypeScript
- State management : Zustand / Redux / autre
- PWA : Service Worker, Workbox (ou équivalent) pour cache + sync

---

## 3. Structure proposée de `src/`

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
│  └─ systems/           # Éditeur de systèmes de jeu
├─ store/                # State global (auth, session, dashboard, etc.)
├─ services/             # API, sync offline, PWA, WebSocket…
├─ hooks/                # Hooks réutilisables
├─ types/                # Types partagés (User, System, Session, Message…)
└─ utils/                # Helpers, constantes
```

---

## 4. Pages principales prévues

- Auth

	- /login : écran de connexion
	- /register : création de compte
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

-	Initialiser le projet (ex : npm create vite@latest frontend).
- Mettre en place :
	- routing de base (/login, /sessions, /sessions/:id),
	- gestion d’auth minimal (mock),
	- squelette du dashboard (containers de widgets).

- Connecter progressivement les features :
	- Auth réelle,
	- Session live,
	- Fiches personnages,
	- Chat & documents,
	- Offline + sync.