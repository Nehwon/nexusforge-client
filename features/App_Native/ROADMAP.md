# Roadmap pour l'Application Native Android de NexusForge

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Introduction](#introduction)
2. [Vision](#vision)
3. [Phases de développement](#phases-de-développement)
   - [Phase 1: Planification et conception](#phase-1-planification-et-conception)
   - [Phase 2: Développement initial](#phase-2-développement-initial)
   - [Phase 3: Tests et optimisation](#phase-3-tests-et-optimisation)
   - [Phase 4: Lancement et feedback](#phase-4-lancement-et-feedback)
   - [Phase 5: Améliorations continues](#phase-5-améliorations-continues)
4. [Détails des versions](#détails-des-versions)
   - [Version 0.1.0 (Alpha)](#version-010-alpha)
   - [Version 0.2.0 (Bêta)](#version-020-bêta)
   - [Version 1.0.0 (Stable)](#version-100-stable)
   - [Version 1.1.0 (Améliorations)](#version-110-améliorations)
   - [Version 2.0.0 (Fonctionnalités avancées)](#version-200-fonctionnalités-avancées)
5. [Conclusion](#conclusion)

---

## Introduction

Ce document présente la roadmap pour le développement de l'application native Android de NexusForge. Il définit les phases de développement, les objectifs pour chaque version, et les fonctionnalités prévues.

---

## Vision

Créer une application native Android pour NexusForge avec une architecture hybride Rust + Kotlin qui offre une expérience utilisateur supérieure, des performances optimisées, et des fonctionnalités spécifiques aux appareils mobiles. L'application vise à devenir la référence pour les joueurs de jeux de rôle sur table (JDR) sur la plateforme Android.

---

## Phases de développement

### Phase 1: Planification et conception

**Durée**: 2-4 semaines

**Objectifs**:
- Définir les exigences et les spécifications techniques.
- Concevoir l'architecture de l'application.
- Créer des maquettes et des prototypes d'interface utilisateur.
- Planifier les ressources et les délais.

**Livrables**:
- Document de spécifications techniques.
- Maquettes et prototypes d'interface utilisateur.
- Plan de développement et roadmap.

---

### Phase 2: Développement initial

**Durée**: 8-12 semaines

**Objectifs**:
- Développer les fonctionnalités de base de l'application.
- Implémenter l'interface utilisateur avec Jetpack Compose (Kotlin).
- Implémenter la logique métier avec Rust (via Android NDK).
- Intégrer l'API backend existante (React+TypeScript).
- Mettre en place la gestion des données locales avec SurrealDB.
- Configurer la communication JNI entre Rust et Kotlin.

**Livrables**:
- Version alpha de l'application avec les fonctionnalités de base.
- Documentation technique pour les développeurs.

---

### Phase 3: Tests et optimisation

**Durée**: 4-6 semaines

**Objectifs**:
- Effectuer des tests unitaires et d'intégration.
- Optimiser les performances de l'application.
- Corriger les bugs identifiés.
- Améliorer l'expérience utilisateur basée sur les retours initiaux.

**Livrables**:
- Version bêta de l'application avec des performances optimisées.
- Rapport de tests et liste des bugs corrigés.

---

### Phase 4: Lancement et feedback

**Durée**: 4 semaines

**Objectifs**:
- Lancer la version stable de l'application sur le Google Play Store.
- Recueillir les retours des utilisateurs.
- Corriger les bugs critiques rapportés.
- Planifier les améliorations futures.

**Livrables**:
- Version stable de l'application disponible sur le Google Play Store.
- Rapport de feedback des utilisateurs.
- Liste des améliorations et des fonctionnalités futures.

---

### Phase 5: Améliorations continues

**Durée**: Continue

**Objectifs**:
- Ajouter de nouvelles fonctionnalités basées sur les retours des utilisateurs.
- Améliorer les performances et l'expérience utilisateur.
- Maintenir l'application à jour avec les dernières technologies.
- Assurer la compatibilité avec les nouvelles versions d'Android.

**Livrables**:
- Mises à jour régulières de l'application.
- Nouvelle documentation et guides utilisateurs.
- Rapport de satisfaction des utilisateurs.

---

## Détails des versions

### Version 0.1.0 (Alpha)

**Date de publication**: À déterminer

**Objectifs**:
- Implémenter les fonctionnalités de base de l'application.
- Valider l'architecture et les choix techniques.
- Recueillir les premiers retours des testeurs internes.

**Fonctionnalités prévues**:
- Authentification de base (connexion et inscription) avec JWT.
- Authentification MFA/TOTP.
- Sécurité locale via biométrie ou PIN.
- Gestion des sessions de jeu.
- Création et édition de fiches de personnages.
- Interface utilisateur de base avec Jetpack Compose (Kotlin).
- Logique métier en Rust.
- Stockage local des données avec SurrealDB.

**Critères de succès**:
- L'application est fonctionnelle et peut être testée en interne.
- Les fonctionnalités de base sont implémentées et testées.
- Les retours des testeurs internes sont recueillis et analysés.

---

### Version 0.2.0 (Bêta)

**Date de publication**: À déterminer

**Objectifs**:
- Ajouter des fonctionnalités supplémentaires.
- Optimiser les performances et l'expérience utilisateur.
- Recueillir les retours des testeurs bêta.

**Fonctionnalités prévues**:
- Authentification à deux facteurs (MFA/TOTP).
- Chat en temps réel.
- Système de règles visuel.
- Mode hors ligne avec synchronisation des données (SurrealDB Live Queries, CRDTs).
- Dashboard MJ configurable.
- Création de réseau virtuel pour le MJ (Bluetooth/Wi-Fi).
- Mécanisme de vérité pour la synchronisation des données entre le MJ et les joueurs.

**Critères de succès**:
- L'application est stable et peut être testée par un groupe élargi de testeurs.
- Les performances sont optimisées et l'expérience utilisateur est améliorée.
- Les retours des testeurs bêta sont recueillis et analysés.

---

### Version 1.0.0 (Stable)

**Date de publication**: À déterminer

**Objectifs**:
- Lancer la version stable de l'application.
- Assurer la stabilité et la sécurité de l'application.
- Recueillir les retours des utilisateurs finaux.

**Fonctionnalités prévues**:
- Toutes les fonctionnalités principales sont implémentées et testées.
- Optimisation des performances et de l'expérience utilisateur.
- Documentation complète pour les utilisateurs et les développeurs.
- Synchronisation des données entre le MJ et les joueurs.

**Critères de succès**:
- L'application est disponible sur le Google Play Store.
- L'application est stable et sécurisée.
- Les retours des utilisateurs finaux sont recueillis et analysés.

---

### Version 1.1.0 (Améliorations)

**Date de publication**: À déterminer

**Objectifs**:
- Ajouter des fonctionnalités supplémentaires basées sur les retours des utilisateurs.
- Améliorer les performances et l'expérience utilisateur.
- Corriger les bugs rapportés.

**Fonctionnalités prévues**:
- Notifications push pour les mises à jour et les invitations (FCM).
- Support multilingue et gestion des fuseaux horaires.
- Thèmes clair et sombre.
- Thèmes personnalisables importables depuis le backend.
- Améliorations de l'accessibilité.
- Utilisation de la biométrie pour l'authentification.
- Utilisation du NFC pour l'échange de données entre appareils.
- OAuth2 (version future).

**Critères de succès**:
- Les nouvelles fonctionnalités sont implémentées et testées.
- Les performances et l'expérience utilisateur sont améliorées.
- Les bugs rapportés sont corrigés.

---

### Version 2.0.0 (Fonctionnalités avancées)

**Date de publication**: À déterminer

**Objectifs**:
- Ajouter des fonctionnalités avancées pour les utilisateurs expérimentés.
- Améliorer l'intégration avec d'autres applications et services.
- Optimiser les performances pour les appareils moins puissants.

**Fonctionnalités prévues**:
- Intégration avec des services tiers (ex: Google Drive, Dropbox).
- Outils avancés pour la création de règles et de scénarios.
- Support pour les plugins et les extensions.
- Améliorations de la synchronisation et du mode hors ligne.

**Critères de succès**:
- Les fonctionnalités avancées sont implémentées et testées.
- L'intégration avec d'autres applications et services est fonctionnelle.
- Les performances sont optimisées pour les appareils moins puissants.

---

## Conclusion

Cette roadmap présente les phases de développement et les objectifs pour chaque version de l'application native Android de NexusForge avec une architecture hybride Rust + Kotlin. Elle servira de guide pour le développement et la gestion du projet, en assurant une progression structurée et des livrables clairs à chaque étape.

**Architecture**: Rust pour la logique métier, Kotlin pour l'interface utilisateur, SurrealDB pour le stockage local.

**Prochaine étape**: Hiérarchiser les tâches à effectuer dans le fichier `TODO.md`.
