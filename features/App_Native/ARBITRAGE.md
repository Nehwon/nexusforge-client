# Arbitrage pour l'Application Native Android de NexusForge

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Introduction](#introduction)
2. [Choix architecturaux](#choix-architecturaux)
   - [Langage de programmation](#langage-de-programmation)
   - [Framework d'interface utilisateur](#framework-dinterface-utilisateur)
   - [Gestion des données](#gestion-des-données)
   - [Injection de dépendances](#injection-de-dépendances)
   - [Tests](#tests)
3. [Choix techniques](#choix-techniques)
   - [Authentification](#authentification)
   - [Synchronisation des données](#synchronisation-des-données)
   - [Notifications](#notifications)
   - [Internationalisation](#internationalisation)
4. [Choix de design](#choix-de-design)
   - [Interface utilisateur](#interface-utilisateur)
   - [Expérience utilisateur](#expérience-utilisateur)
   - [Accessibilité](#accessibilité)
5. [Choix de sécurité](#choix-de-sécurité)
   - [Stockage des données](#stockage-des-données)
   - [Chiffrement](#chiffrement)
   - [Authentification](#authentification-1)
6. [Conclusion](#conclusion)

---

## Introduction

Ce document documente les choix et les décisions pris lors du développement de l'application native Android de NexusForge. Il explique les raisons derrière chaque choix et les alternatives envisagées.

**Architecture hybride**: L'application utilise Rust pour la logique métier et le traitement de données, et Kotlin pour l'interface utilisateur (Jetpack Compose), car Rust ne peut pas créer directement l'UI Android.

---

## Choix architecturaux

### Langage de programmation

**Choix**: Rust (via Android NDK)

**Raison**:
- **Performance supérieure**: Rust offre des performances natives comparables à C/C++, avec une gestion de mémoire sûre sans garbage collector.
- **Sécurité mémoire**: Le système de ownership de Rust prévient les erreurs de mémoire (buffer overflows, null pointers, data races) à la compilation.
- **Cargo**: Excellent gestionnaire de paquets avec gestion des dépendances robuste.
- **Cross-compilation**: Support natif pour la cross-compilation vers Android ARM/x86.
- **Zéro-cost abstractions**: Les abstractions de Rust n'ont pas de coût à l'exécution.
- **Pattern matching**: Pattern matching puissant et exhaustif pour une logique plus sûre.
- **Écosystème croissant**: Bibliothèques Rust de haute qualité pour de nombreux domaines.

**Architecture hybride Rust + Kotlin**:
- Rust pour la logique métier, le traitement de données, les calculs intensifs
- Kotlin pour l'interface utilisateur (Jetpack Compose) - obligatoire car Rust ne peut pas créer directement l'UI Android
- Communication via JNI (Native Interface)

**Structure du projet**:
```
app/
├── src/main/
│   ├── kotlin/          # UI Android (Jetpack Compose)
│   │   ├── ui/          # Screens, composables
│   │   └── MainActivity.kt
│   ├── rust/            # Code Rust (via JNI)
│   │   ├── src/
│   │   │   ├── lib.rs   # Logique métier Rust
│   │   │   └── ...
│   │   └── Cargo.toml
│   └── jniLibs/         # Bibliothèques natives compilées
│       ├── arm64-v8a/
│       ├── armeabi-v7a/
│       └── x86_64/
```

**Outils recommandés**:
- `cargo-ndk`: Pour la cross-compilation Android
- `jni`: Crate Rust pour les bindings JNI
- `ndk-build`: Pour l'intégration avec le build Android Gradle
- `uniffi`: Pour générer automatiquement les bindings FFI (alternative à JNI)

**Kotlin pour l'UI (obligatoire)**:

L'interface utilisateur doit être développée en Kotlin (Jetpack Compose) car Rust ne peut pas créer directement l'UI Android. Kotlin est donc utilisé exclusivement pour la couche UI, tandis que Rust gère toute la logique métier.

**Raison**:
- Kotlin est le langage recommandé par Google pour le développement Android.
- Il est interopérable avec l'écosystème Android, permettant d'utiliser les bibliothèques Kotlin existantes.
- Il offre des fonctionnalités modernes comme les coroutines pour la programmation asynchrone.
- Écosystème mature et bien documenté pour Android.
- Jetpack Compose est le framework moderne pour l'UI Android.

---

### Framework d'interface utilisateur

**Choix**: Jetpack Compose

**Raison**:
- Jetpack Compose est le framework moderne recommandé par Google pour la construction d'interfaces utilisateur sur Android.
- Il offre une approche déclarative pour la construction d'interfaces, simplifiant le développement et la maintenance.
- Il permet de créer des interfaces réactives et performantes avec moins de code.
- Il est compatible avec les outils existants comme ViewModel et LiveData.

---

### Gestion des données

**Choix**: SurrealDB (Rust) + DataStore (pour l'UI Kotlin)

**Raison**:
- **SurrealDB**: Base de données NoSQL moderne et multi-model en Rust, supporte SQL-like, graph, document et table
- **Performance**: Performances natives Rust, sans surcharge
- **Type safety**: Typage fort et schéma flexible
- **Offline-first**: Parfaitement adaptée pour les applications offline-first
- **Requêtes puissantes**: Supporte des requêtes complexes avec syntaxe SQL-like
- **Multi-model**: Peut stocker des documents, des graphes, des tables selon les besoins

**Pour Rust**:
- **SurrealDB**: Base de données moderne, multi-model, supporte SQL-like, graph, document
- **Sled**: Base de données embeddée pure Rust, type-safe, très performante (alternative légère)
- **RocksDB**: Base de données clé-valeur embeddée ultra-performante (alternative clé-valeur)
- **Redb**: Base de données Rust pure, très performante, type-safe (alternative moderne)

**Pour Kotlin (UI)**:
- DataStore pour les préférences utilisateur (alternative à SharedPreferences)
- Pas de Room nécessaire car toutes les données sont gérées par Rust

**Architecture de données**:
```
Données partagées (Rust + SurrealDB)
├── Utilisateurs, personnages, systèmes
├── Synchronisation offline-first
└── Logique métier

Données UI (Kotlin + DataStore)
├── Préférences utilisateur
├── État de l'UI
└── Cache temporaire
```

**Pourquoi SurrealDB**:
- Pure Rust, pas de dépendance externe
- Support multi-model (document, graph, table, relationnel)
- Requêtes SQL-like familières
- Temps réel avec subscriptions
- Compression et encryption intégrés
- Parfait pour offline-first avec sync

---

### Injection de dépendances

**Choix**: Rust (sans framework DI) + Hilt (pour l'UI Kotlin)

**Raison**:
- **Rust**: Le système de traits et de modules de Rust rend l'injection de dépendances naturelle sans framework complexe
- **Hilt**: Pour l'UI Kotlin, Hilt est la bibliothèque recommandée par Google pour l'injection de dépendances sur Android
- **Simplicité**: Rust privilégie la simplicité avec des fonctions et des structures plutôt que des conteneurs DI complexes
- **Performance**: Pas de surcharge runtime pour l'injection de dépendances en Rust
- **Type safety**: Le système de types de Rust garantit la sécurité à la compilation

**Pour Rust**:
- **Pas de framework DI nécessaire**: Utiliser des fonctions et des structures pour passer les dépendances
- **Trait objects**: Pour l'injection dynamique quand nécessaire
- **Builder pattern**: Pour la construction complexe d'objets avec dépendances
- **Modules**: Pour organiser le code et gérer la visibilité

**Pour Kotlin (UI)**:
- Hilt pour l'injection de dépendances dans l'UI Kotlin
- Compatible avec ViewModel et Room

**Exemple d'injection de dépendances en Rust**:
```rust
// Service avec dépendances injectées via constructeur
struct UserService {
    db: Arc<Database>,
    api_client: Arc<ApiClient>,
}

impl UserService {
    fn new(db: Arc<Database>, api_client: Arc<ApiClient>) -> Self {
        Self { db, api_client }
    }
}

// Utilisation
let db = Arc::new(Database::new());
let api_client = Arc::new(ApiClient::new());
let user_service = UserService::new(db, api_client);
```

---

### Tests

**Choix**: Rust (cargo test) + Espresso (pour l'UI Kotlin)

**Raison**:
- **cargo test**: Framework de test intégré à Rust, simple et puissant pour les tests unitaires et d'intégration du code Rust
- **Espresso**: Framework recommandé par Google pour les tests d'interface utilisateur Android (nécessaire pour tester l'UI en Kotlin)
- Approche hybride: Tests unitaires en Rust pour la logique métier, tests UI en Espresso pour l'interface Kotlin
- cargo test supporte les tests de documentation, les benchmarks et les tests d'intégration

**Pour Rust**:
- Tests intégrés dans le code avec `#[test]`
- Support natif pour les tests asynchrones
- Coverage de code avec tarpaulin ou cargo-tarpaulin
- Mocking facile avec mockall

**Pour Kotlin (UI)**:
- Espresso pour les tests d'UI Jetpack Compose
- Compose Testing pour les tests spécifiques à Jetpack Compose
- Robolectric pour les tests unitaires Android sans émulateur

**Alternatives envisagées**:
- Kotest: Framework de test moderne pour Kotlin, mais moins standard que JUnit.
- UI Automator: Framework de test pour les tests d'interface utilisateur inter-applications, mais plus complexe et moins recommandé que Espresso.

---

## Choix techniques

### Authentification

**Choix**: JWT (JSON Web Tokens) + MFA/TOTP + Biométrie/PIN

**Raison**:
- **JWT**: Standard ouvert pour la représentation de claims entre parties, sécurisé et compacte
- **MFA/TOTP**: Authentification à deux facteurs avec TOTP (Time-based One-Time Password) pour une sécurité renforcée
- **Biométrie**: Utilisation de la biométrie (empreinte digitale, reconnaissance faciale) ou PIN du téléphone pour sécuriser l'accès local
- **Interopérabilité backend**: Compatible avec le backend existant en React+TypeScript qui utilise déjà JWT et TOTP

**Architecture d'authentification**:
```
Backend (React+TypeScript)
├── JWT pour l'authentification API
├── TOTP pour le MFA
└── Endpoints d'authentification existants

Application Android (Rust + Kotlin)
├── Rust: Gestion des tokens JWT, validation TOTP
├── Kotlin UI: Interface de login, saisie TOTP
└── Sécurité locale: Biométrie/PIN pour déverrouiller l'app
```

**Pour Rust**:
- **jsonwebtoken**: Crate Rust pour la validation et la génération de JWT
- **totp-lite**: Implémentation TOTP légère pour Rust
- **Communication avec backend**: Appel aux endpoints d'authentification existants (login, TOTP, refresh)

**Pour Kotlin (UI)**:
- **BiometricPrompt**: API Android pour la biométrie (empreinte, visage)
- **EncryptedSharedPreferences**: Stockage sécurisé du PIN
- **Jetpack Security**: Chiffrement des tokens stockés localement

**Sécurité locale**:
- **Biométrie**: Utilisation de l'empreinte digitale ou reconnaissance faciale pour déverrouiller l'application
- **PIN**: Alternative à la biométrie avec PIN sécurisé (chiffré avec Android Keystore)
- **Tokens chiffrés**: JWT stockés dans EncryptedSharedPreferences ou Android Keystore
- **Session timeout**: Déconnexion automatique après inactivité

**MFA/TOTP**:
- Utilisation de la librairie otplib existante du backend (compatible Rust via bindings ou réimplémentation)
- Génération et validation des codes TOTP côté Rust
- Synchronisation avec le backend pour la configuration TOTP

**OAuth2 (version future)**:
- Prévoir l'architecture pour supporter OAuth2 dans une version future
- Possibilité d'intégrer Google, Apple, ou autres providers OAuth2
- Utilisation de crates Rust comme oauth2-rs pour l'implémentation future

---

### Synchronisation des données

**Choix**: Synchronisation incrémentielle avec résolution de conflits

**Raison**:
- La synchronisation incrémentielle permet de minimiser la quantité de données transférées.
- La résolution de conflits permet de gérer les modifications concurrentes des données.
- Elle offre une expérience utilisateur fluide en mode hors ligne.
- Elle est compatible avec SurrealDB qui supporte nativement les opérations de synchronisation.

**Pour Rust**:
- **SurrealDB Live Queries**: Souscription aux changements en temps réel
- **CRDTs**: Utilisation de Conflict-free Replicated Data Types pour la résolution de conflits
- **Delta updates**: Synchronisation incrémentielle des modifications uniquement
- **Version vectors**: Suivi des versions pour détecter les conflits

**Pour Kotlin (UI)**:
- **WorkManager**: Planification des tâches de synchronisation en arrière-plan
- **ConnectivityManager**: Détection de l'état de la connexion réseau
- **Coroutines**: Gestion asynchrone de la synchronisation

---

### Notifications

**Choix**: Firebase Cloud Messaging (FCM)

**Raison**:
- FCM est le service recommandé par Google pour l'envoi de notifications push sur Android.
- Il offre une manière fiable et scalable d'envoyer des notifications aux utilisateurs.
- Il est compatible avec les autres services Firebase comme Firebase Analytics et Firebase Auth.
- Il offre des fonctionnalités avancées comme les notifications ciblées et les messages en arrière-plan.

---

### Internationalisation

**Choix**: Ressources Android et bibliothèques de localisation

**Raison**:
- Les ressources Android offrent un moyen simple et efficace de gérer les chaînes de caractères localisées.
- Les bibliothèques de localisation comme ICU4J offrent des fonctionnalités avancées pour la gestion des fuseaux horaires et des formats de date.
- Elles sont compatibles avec les outils de développement Android et les services de traduction.

---

## Choix de design

### Interface utilisateur

**Choix**: Material Design

**Raison**:
- Material Design est le système de design recommandé par Google pour les applications Android.
- Il offre des guidelines claires et des composants prêts à l'emploi pour créer des interfaces utilisateur cohérentes et attrayantes.
- Il est compatible avec les outils de développement Android comme Jetpack Compose et XML.
- Il offre des fonctionnalités avancées comme les animations et les transitions.

**Thème**
- Thème clair et sombre par défaut
- Thème personnalisable avec des couleurs accentuées
- Pouvoir importer les thèmes utilisateurs depuis le backend

---

### Expérience utilisateur

**Choix**: Expérience utilisateur optimisée pour le jeu de rôle (TTRPG)

**Raison**:
- **Accès rapide aux feuilles de personnage**: Interface fluide pour consulter et modifier les caractéristiques, compétences, équipement
- **Lancer de dés intuitif**: Interface de lancer de dés rapide avec résultats visuels clairs
- **Mode session live**: Interface optimisée pour les sessions de jeu en temps réel (chat, partage d'écran, widgets)
- **Rôle MJ vs Joueur**: Interface adaptée selon le rôle (Game Master avec outils de gestion, Joueur avec vue simplifiée)
- **Mode offline**: Fonctionnalité complète sans connexion internet pour les sessions en déplacement
- **Navigation contextuelle**: Accès rapide aux règles, systèmes de jeu, et documentation selon le contexte

**Fonctionnalités clés**:
- **Dashboard personnalisable**: Widgets pour les informations importantes (PV, mana, conditions, etc.)
- **Chat en temps réel**: Communication entre MJ et joueurs avec support des dés et des images
- **Gestion de campagne**: Organisation des sessions, personnages, et scénarios
- **Système de jeu agnostique**: Support de multiples systèmes de jeu (D&D, Pathfinder, etc.)
- **Mode sombre par défaut**: Optimisé pour les sessions de jeu en ambiance sombre

**Pour Kotlin (UI)**:
- Jetpack Compose pour une interface réactive et fluide
- Navigation claire entre les différentes sections (personnages, campagnes, chat)
- Animations pour les lancers de dés et les actions de jeu

---

### Accessibilité

**Choix**: Suivi des guidelines d'accessibilité Android

**Raison**:
- Les guidelines d'accessibilité Android offrent des recommandations claires pour créer des applications accessibles à tous les utilisateurs.
- Elles sont compatibles avec les outils de développement Android et les services d'accessibilité.
- Elles permettent de créer des applications conformes aux standards d'accessibilité comme WCAG.

---

## Choix de sécurité

### Stockage des données

**Choix**: Chiffrement des données

**Raison**:
- Le chiffrement des données offre une protection supplémentaire contre les accès non autorisés.
- Il est compatible avec les bibliothèques de chiffrement comme Android Keystore et Jetpack Security.
- Il permet de respecter les réglementations de protection des données comme le RGPD.

---

### Chiffrement

**Choix**: Android Keystore et Jetpack Security

**Raison**:
- Android Keystore offre un moyen sécurisé de stocker les clés de chiffrement.
- Jetpack Security offre des bibliothèques et des outils pour simplifier le chiffrement des données.
- Ils sont compatibles avec les autres outils de développement Android et les services de sécurité.

---

### Authentification

**Choix**: Authentification à deux facteurs (2FA)

**Raison**:
- L'authentification à deux facteurs offre une protection supplémentaire contre les accès non autorisés.
- Elle est compatible avec les mécanismes d'authentification existants comme JWT et OAuth2.
- Elle permet de respecter les réglementations de sécurité comme le RGPD.

---

## Conclusion

Ce document documente les choix et les décisions pris lors du développement de l'application native Android de NexusForge. Il explique les raisons derrière chaque choix et les alternatives envisagées, offrant une référence claire pour les développeurs et les parties prenantes.

**Architecture finale**: Rust pour la logique métier et le traitement de données (via Android NDK), Kotlin pour l'interface utilisateur (Jetpack Compose). Cette approche hybride maximise les performances et la sécurité mémoire de Rust tout en utilisant l'écosystème mature de Kotlin pour l'UI Android.

**Prochaine étape**: Commencer le développement des fonctionnalités principales en suivant les choix et les décisions documentés.
