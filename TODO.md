# Todo List pour l'Application Native Android de NexusForge

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Introduction](#introduction)
2. [Priorités](#priorités)
3. [Tâches par phase](#tâches-par-phase)
   - [Phase 1: Planification et conception](#phase-1-planification-et-conception)
   - [Phase 2: Développement initial](#phase-2-développement-initial)
   - [Phase 3: Tests et optimisation](#phase-3-tests-et-optimisation)
   - [Phase 4: Lancement et feedback](#phase-4-lancement-et-feedback)
   - [Phase 5: Améliorations continues](#phase-5-améliorations-continues)
4. [Tâches techniques](#tâches-techniques)
5. [Tâches de documentation](#tâches-de-documentation)
6. [Tâches de tests](#tâches-de-tests)
7. [Conclusion](#conclusion)

---

## Introduction

Ce document liste les tâches à effectuer pour le développement de l'application native Android de NexusForge. Les tâches sont organisées par phase de développement et par priorité.

---

## Priorités

Les tâches sont classées par priorité comme suit:

- **Haute**: Tâches critiques qui doivent être réalisées en premier.
- **Moyenne**: Tâches importantes mais non critiques.
- **Faible**: Tâches qui peuvent être réalisées plus tard ou qui sont moins critiques.

---

## Tâches par phase

### Phase 1: Planification et conception

#### Haute priorité

- [ ] Définir les exigences et les spécifications techniques.
- [ ] Concevoir l'architecture de l'application.
- [ ] Créer des maquettes et des prototypes d'interface utilisateur.
- [ ] Planifier les ressources et les délais.

#### Moyenne priorité

- [ ] Identifier les risques et les contraintes.
- [ ] Définir les indicateurs de succès.
- [ ] Préparer la documentation initiale.

#### Faible priorité

- [ ] Étudier les applications similaires pour s'inspirer des bonnes pratiques.
- [ ] Préparer une présentation pour les parties prenantes.

---

### Phase 2: Développement initial

#### Haute priorité

- [ ] Configurer l'environnement de développement (Android Studio, Rust toolchain, Android NDK, SDK, etc.).
- [ ] Implémenter l'interface utilisateur avec Jetpack Compose (Kotlin).
- [ ] Implémenter la logique métier avec Rust (via Android NDK).
- [ ] Configurer la communication JNI entre Rust et Kotlin.
- [ ] Intégrer l'API backend existante (React+TypeScript).
- [ ] Mettre en place la gestion des données locales avec SurrealDB.
- [ ] Développer les fonctionnalités de base de l'application (authentification JWT, MFA/TOTP, biométrie/PIN, gestion des sessions, etc.).

#### Moyenne priorité

- [ ] Implémenter le système de règles visuel.
- [ ] Développer le mode hors ligne avec synchronisation des données (SurrealDB Live Queries, CRDTs).
- [ ] Créer le dashboard MJ configurable.
- [ ] Optimiser les performances de l'application.
- [ ] Configurer cargo-ndk pour la cross-compilation Android.

#### Faible priorité

- [ ] Ajouter des fonctionnalités supplémentaires (notifications, internationalisation, etc.).
- [ ] Améliorer l'expérience utilisateur basée sur les retours initiaux.

---

### Phase 3: Tests et optimisation

#### Haute priorité

- [ ] Effectuer des tests unitaires et d'intégration.
- [ ] Corriger les bugs identifiés.
- [ ] Optimiser les performances de l'application.
- [ ] Améliorer l'expérience utilisateur basée sur les retours initiaux.

#### Moyenne priorité

- [ ] Effectuer des tests d'interface utilisateur.
- [ ] Effectuer des tests de performance et de charge.
- [ ] Préparer la documentation pour les testeurs bêta.

#### Faible priorité

- [ ] Effectuer des tests de sécurité.
- [ ] Effectuer des tests d'accessibilité.

---

### Phase 4: Lancement et feedback

#### Haute priorité

- [ ] Lancer la version stable de l'application sur le Google Play Store.
- [ ] Recueillir les retours des utilisateurs.
- [ ] Corriger les bugs critiques rapportés.
- [ ] Planifier les améliorations futures.

#### Moyenne priorité

- [ ] Préparer la documentation pour les utilisateurs finaux.
- [ ] Créer des guides et des tutoriels pour les utilisateurs.
- [ ] Promouvoir l'application sur les réseaux sociaux et les forums.

#### Faible priorité

- [ ] Organiser des webinaires et des sessions de formation pour les utilisateurs.
- [ ] Créer une communauté d'utilisateurs pour recueillir des retours et des suggestions.

---

### Phase 5: Améliorations continues

#### Haute priorité

- [ ] Ajouter de nouvelles fonctionnalités basées sur les retours des utilisateurs.
- [ ] Améliorer les performances et l'expérience utilisateur.
- [ ] Maintenir l'application à jour avec les dernières technologies.
- [ ] Assurer la compatibilité avec les nouvelles versions d'Android.

#### Moyenne priorité

- [ ] Ajouter des fonctionnalités avancées pour les utilisateurs expérimentés.
- [ ] Améliorer l'intégration avec d'autres applications et services.
- [ ] Optimiser les performances pour les appareils moins puissants.

#### Faible priorité

- [ ] Ajouter des fonctionnalités expérimentales et innovantes.
- [ ] Explorer de nouvelles technologies et frameworks.

---

## Tâches techniques

### Authentification

- [ ] Implémenter l'interface de connexion et d'inscription.
- [ ] Développer la gestion des sessions utilisateur avec JWT.
- [ ] Ajouter l'authentification à deux facteurs (MFA/TOTP).
- [ ] Intégrer la biométrie pour l'authentification locale.
- [ ] Intégrer le PIN comme alternative à la biométrie.
- [ ] Configurer la communication avec le backend React+TypeScript existant.

### Gestion des sessions de jeu

- [ ] Développer la création et la gestion des sessions de jeu.
- [ ] Implémenter l'invitation et la gestion des joueurs.
- [ ] Ajouter le chat en temps réel.
- [ ] Développer la synchronisation des données entre le MJ et les joueurs.

### Gestion des personnages

- [ ] Créer l'interface pour la création et l'édition de fiches de personnages.
- [ ] Développer la gestion des attributs et compétences.
- [ ] Ajouter le suivi des objets et équipements.

### Système de règles

- [ ] Implémenter le moteur de règles visuel.
- [ ] Développer l'évaluation des formules et conditions.
- [ ] Ajouter la gestion des dés et des jets.

### Mode hors ligne

- [ ] Mettre en place la synchronisation des données locales avec SurrealDB.
- [ ] Développer la gestion des conflits de synchronisation avec CRDTs.
- [ ] Assurer l'accès aux données hors ligne.
- [ ] Créer un réseau virtuel pour le MJ (Bluetooth/Wi-Fi).
- [ ] Implémenter un mécanisme de vérité pour la synchronisation des données.
- [ ] Configurer SurrealDB Live Queries pour les mises à jour en temps réel.

### Dashboard MJ

- [ ] Créer le tableau de bord configurable pour le MJ.
- [ ] Développer la gestion des notes et documents.
- [ ] Ajouter le suivi des sessions et des événements.
- [ ] Intégrer la synchronisation des données avec les joueurs.

---

## Tâches de documentation

### Documentation technique

- [ ] Documenter l'architecture de l'application.
- [ ] Documenter les API et les interfaces.
- [ ] Documenter les cas d'utilisation et les scénarios.

### Documentation utilisateur

- [ ] Créer un guide utilisateur pour les joueurs.
- [ ] Créer un guide utilisateur pour les Maîtres du Jeu.
- [ ] Créer des tutoriels et des vidéos de démonstration.

---

## Tâches de tests

### Tests unitaires

- [ ] Écrire des tests unitaires Rust pour les composants principaux (cargo test).
- [ ] Écrire des tests unitaires Kotlin pour les composants UI.
- [ ] Écrire des tests unitaires pour les cas d'utilisation.
- [ ] Écrire des tests unitaires pour les services et les repositories.

### Tests d'intégration

- [ ] Écrire des tests d'intégration pour les flux principaux.
- [ ] Écrire des tests d'intégration pour les interactions entre les composants.
- [ ] Écrire des tests d'intégration pour les appels API.

### Tests d'interface utilisateur

- [ ] Écrire des tests d'interface utilisateur pour les écrans principaux.
- [ ] Écrire des tests d'interface utilisateur pour les interactions utilisateur.
- [ ] Écrire des tests d'interface utilisateur pour les animations et les transitions.

### Tests de performance

- [ ] Effectuer des tests de performance pour les opérations critiques.
- [ ] Effectuer des tests de performance pour les appels API.
- [ ] Effectuer des tests de performance pour les opérations de base de données.
- [ ] Effectuer des tests de performance pour la synchronisation des données.

### Tests de sécurité

- [ ] Effectuer des tests de sécurité pour les données sensibles.
- [ ] Effectuer des tests de sécurité pour les sessions utilisateur.
- [ ] Effectuer des tests de sécurité pour les appels API.

---

## Conclusion

Ce document liste les tâches à effectuer pour le développement de l'application native Android de NexusForge avec une architecture hybride Rust + Kotlin. Les tâches sont organisées par phase de développement et par priorité, ce qui permet de planifier et de suivre les progrès du projet de manière structurée.

**Architecture**: Rust pour la logique métier, Kotlin pour l'interface utilisateur, SurrealDB pour le stockage local.

**Prochaine étape**: Consulter ARBITRAGE.md pour les choix techniques détaillés.
