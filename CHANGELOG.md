# Changelog pour l'Application Native Android de NexusForge

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Introduction](#introduction)
2. [Format du Changelog](#format-du-changelog)
3. [Versions](#versions)
   - [1.0.0 (Non publiée)](#100-non-publiée)
   - [0.1.0 (Planifiée)](#010-planifiée)

---

## Introduction

Ce document suit les évolutions et les changements apportés à l'application native Android de NexusForge avec une architecture hybride Rust + Kotlin. Il est inspiré du format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et vise à fournir une vue claire des modifications entre les versions.

---

## Format du Changelog

Chaque version est documentée avec les sections suivantes:

- **Added**: Pour les nouvelles fonctionnalités.
- **Changed**: Pour les modifications des fonctionnalités existantes.
- **Deprecated**: Pour les fonctionnalités obsolètes.
- **Removed**: Pour les fonctionnalités supprimées.
- **Fixed**: Pour les corrections de bugs.
- **Security**: Pour les corrections de vulnérabilités de sécurité.

---

## Versions

### 1.0.0 (Non publiée)

**Date de publication**: À déterminer

#### Added

- **Architecture**:
  - Architecture hybride Rust + Kotlin.
  - Rust pour la logique métier (via Android NDK).
  - Kotlin pour l'interface utilisateur (Jetpack Compose).
  - SurrealDB pour le stockage local.
  - Communication JNI entre Rust et Kotlin.

- **Authentification**:
  - Interface de connexion et d'inscription.
  - Gestion des sessions utilisateur avec JWT.
  - Authentification à deux facteurs (MFA/TOTP).
  - Sécurité locale via biométrie ou PIN.
  - Communication avec backend React+TypeScript existant.

- **Gestion des sessions de jeu**:
  - Création et gestion des sessions de jeu.
  - Invitation et gestion des joueurs.
  - Chat en temps réel.

- **Gestion des personnages**:
  - Création et édition de fiches de personnages.
  - Gestion des attributs et compétences.
  - Suivi des objets et équipements.

- **Système de règles**:
  - Moteur de règles visuel.
  - Évaluation des formules et conditions.
  - Gestion des dés et des jets.

- **Mode hors ligne**:
  - Synchronisation des données locales avec SurrealDB.
  - Gestion des conflits de synchronisation avec CRDTs.
  - Accès aux données hors ligne.
  - SurrealDB Live Queries pour les mises à jour en temps réel.
  - Création de réseau virtuel pour le MJ (Bluetooth/Wi-Fi).

- **Dashboard MJ**:
  - Tableau de bord configurable.
  - Gestion des notes et documents.
  - Suivi des sessions et des événements.

- **Synchronisation des données**:
  - Mécanisme de vérité pour déterminer les données les plus récentes et correctes.
  - Synchronisation des données des joueurs avec le MJ et vice versa.

#### Changed

- **Interface utilisateur**:
  - Utilisation de Jetpack Compose (Kotlin) pour l'interface utilisateur.
  - Logique métier implémentée en Rust.

- **Base de données**:
  - Migration vers SurrealDB pour le stockage local (remplace SQLite/Room).

- **Performances**:
  - Optimisation des temps de chargement et de la réactivité grâce à Rust.

#### Fixed

- **Bugs initiaux**:
  - Correction des bugs identifiés lors des tests initiaux.

#### Security

- **Sécurité des données**:
  - Chiffrement des données sensibles.
  - Renforcement de la sécurité des sessions.

---

### 0.1.0 (Planifiée)

**Date de publication**: À déterminer

#### Added

- **Notifications**:
  - Notifications push pour les mises à jour et les invitations (FCM).
  - Rappels pour les sessions de jeu.

- **Internationalisation**:
  - Support multilingue.
  - Gestion des fuseaux horaires.

- **Accessibilité**:
  - Support des fonctionnalités d'accessibilité Android.
  - Thèmes clair et sombre.
  - Thèmes personnalisables importables depuis le backend.

- **Fonctionnalités avancées des appareils**:
  - Utilisation de la biométrie pour une authentification sécurisée.
  - Utilisation du NFC pour un échange rapide de données entre appareils.
  - Optimisation de l'utilisation des ressources (processeur et RAM) pour un jeu fluide en pleine nature.

- **OAuth2 (version future)**:
  - Préparation de l'architecture pour OAuth2.

#### Changed

- **Interface utilisateur**:
  - Améliorations basées sur les retours utilisateurs.

- **Performances**:
  - Optimisations supplémentaires pour les appareils moins puissants.

#### Fixed

- **Bugs identifiés**:
  - Correction des bugs rapportés par les utilisateurs.

---

## Conclusion

Ce document sera mis à jour à chaque nouvelle version de l'application pour refléter les changements et les améliorations apportés. Il servira de référence pour les utilisateurs et les développeurs.

**Architecture**: Rust pour la logique métier, Kotlin pour l'interface utilisateur, SurrealDB pour le stockage local.

**Prochaine étape**: Consulter ARBITRAGE.md pour les choix techniques détaillés.
