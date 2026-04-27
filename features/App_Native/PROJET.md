# Projet d'Application Multiplateforme pour NexusForge

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Contexte](#contexte)
2. [Objectifs](#objectifs)
3. [Portée](#portée)
4. [Public cible](#public-cible)
5. [Fonctionnalités clés](#fonctionnalités-clés)
6. [Contraintes](#contraintes)
7. [Hypothèses](#hypothèses)
8. [Risques](#risques)
9. [Indicateurs de succès](#indicateurs-de-succès)

---

## Contexte

NexusForge est une application de gestion de jeux de rôle sur table (JDR) conçue pour offrir une expérience offline-first. Actuellement, l'application est accessible via un site web responsif, mais une application native Android est envisagée pour améliorer l'expérience utilisateur, les performances, et l'accès aux fonctionnalités spécifiques des appareils mobiles.

**Architecture hybride**: L'application utilisera Rust pour la logique métier et le traitement de données (via Android NDK), et Kotlin pour l'interface utilisateur (Jetpack Compose).

---

## Objectifs

### Objectif principal

Développer une application native Android pour NexusForge qui offre une expérience utilisateur supérieure à la version web responsif, en tirant parti des capacités spécifiques des appareils mobiles et des performances de Rust.

### Objectifs secondaires

1. **Améliorer les performances**: Réduire les temps de chargement et améliorer la réactivité de l'application.
2. **Optimiser l'expérience utilisateur**: Offrir une interface utilisateur plus intuitive et adaptée aux appareils mobiles.
3. **Exploiter les fonctionnalités natives**: Utiliser les capacités des appareils mobiles (ex: notifications push, accès hors ligne, intégration avec d'autres applications).
4. **Améliorer la sécurité**: Renforcer la sécurité des données et des sessions utilisateur.
5. **Faciliter l'accès hors ligne**: Optimiser le mode hors ligne pour une utilisation fluide sans connexion internet.
6. **Réduire les coûts de développement**: Utiliser une architecture hybride Rust + Kotlin pour maximiser la réutilisation du code existant (backend React+TypeScript).
7. **Stockage local des données**: Permettre le stockage des informations des joueurs et des MJ sur l'appareil pour un jeu hors ligne.
8. **Création de réseau virtuel**: Développer une version spécifique pour le MJ permettant de créer un réseau virtuel via Bluetooth ou Wi-Fi pour synchroniser les données entre appareils sans utiliser le backend.
9. **Synchronisation des données**: Prévoir un mécanisme de synchronisation des données locales avec le backend une fois la connexion rétablie.
10. **Exploiter les fonctions avancées des composants**: Utiliser les fonctionnalités avancées des appareils mobiles (biométrie, NFC, puissance du processeur et RAM) pour permettre un jeu fluide, y compris en pleine nature sans aucune connexion.

---

## Portée

### Inclus dans le projet

1. **Développement de l'application native Android**:
   - Utilisation de Rust pour la logique métier (via Android NDK).
   - Utilisation de Kotlin pour l'interface utilisateur (Jetpack Compose).
   - Intégration avec l'API backend existante (React+TypeScript).
   - Gestion des données locales avec SurrealDB.
   - Synchronisation des données en mode hors ligne.
   - Création de réseau virtuel pour le MJ (Bluetooth/Wi-Fi).
   - Exploitation des fonctionnalités avancées des appareils (biométrie, NFC, puissance du processeur et RAM).

2. **Fonctionnalités principales**:
   - Authentification et gestion des sessions.
   - Gestion des sessions de jeu et des personnages.
   - Système de règles et moteur de calcul.
   - Dashboard configurable pour le Maître du Jeu.
   - Stockage local des données des joueurs et des MJ.
   - Synchronisation des données locales avec le backend.
   - Utilisation de la biométrie pour l'authentification.
   - Utilisation du NFC pour l'échange de données entre appareils.
   - Optimisation de l'utilisation des ressources (processeur et RAM) pour un jeu fluide.
   - Mécanisme de vérité pour la synchronisation des données entre le MJ et les joueurs.
   - Synchronisation des données des joueurs avec le MJ et vice versa.

3. **Tests et qualité**:
   - Tests unitaires et d'intégration.
   - Tests d'interface utilisateur.
   - Revue de code et optimisation des performances.
   - Tests de synchronisation des données en mode hors ligne.
   - Tests des fonctionnalités avancées (biométrie, NFC, optimisation des ressources).

4. **Documentation**:
   - Documentation technique pour les développeurs.
   - Guide utilisateur pour les joueurs et Maîtres du Jeu.
   - Documentation sur le mode hors ligne et la synchronisation des données.
   - Documentation sur l'utilisation des fonctionnalités avancées des appareils.

### Exclus du projet

1. **Refonte complète du backend** : L'application utilisera l'API existante.
2. **Fonctionnalités non essentielles** : Les fonctionnalités supplémentaires seront ajoutées dans des versions futures.

### Inclus dans le projet (mise à jour)

1. **Développement natif Android** :
   - Utilisation de Rust pour la logique métier (via Android NDK).
   - Utilisation de Kotlin pour l'interface utilisateur (Jetpack Compose).
   - Communication via JNI entre Rust et Kotlin.

---

## Public cible

### Utilisateurs finaux

1. **Maîtres du Jeu (MJ)**:
   - Personnes qui organisent et dirigent les sessions de jeu.
   - Besoin d'outils pour gérer les personnages, les règles, et les sessions.

2. **Joueurs**:
   - Personnes qui participent aux sessions de jeu.
   - Besoin d'accéder à leurs fiches de personnages et de communiquer avec le MJ.

### Environnement d'utilisation

- **Appareils mobiles** : Smartphones et tablettes Android.
- **Connexion internet** : Utilisation en ligne et hors ligne.
- **Contexte social** : Utilisation lors de sessions de jeu en groupe ou en solo.

---

## Fonctionnalités clés

### Authentification et sécurité

1. **Connexion et inscription** : Interface simplifiée pour la création de compte et la connexion.
2. **Gestion des sessions** : Maintien de la session utilisateur et déconnexion sécurisée.
3. **Authentification à deux facteurs (2FA)** : Renforcement de la sécurité des comptes.

### Gestion des sessions de jeu

1. **Création et gestion des sessions** : Outils pour créer et gérer des sessions de jeu.
2. **Invitation des joueurs** : Système d'invitation et de gestion des participants.
3. **Chat en temps réel** : Communication instantanée entre les joueurs et le MJ.

### Gestion des personnages

1. **Création et édition de fiches** : Interface pour créer et modifier les fiches de personnages.
2. **Gestion des attributs et compétences** : Suivi des caractéristiques et des compétences des personnages.
3. **Inventaire et équipements** : Gestion des objets et équipements des personnages.

### Système de règles

1. **Moteur de règles visuel** : Interface pour créer et modifier des règles de jeu.
2. **Évaluation des formules** : Calcul des valeurs basées sur des formules personnalisées.
3. **Gestion des dés et des jets** : Outils pour effectuer des jets de dés et appliquer des modificateurs.

### Mode hors ligne

1. **Synchronisation des données** : Mécanisme pour synchroniser les données locales avec le serveur.
2. **Gestion des conflits** : Résolution des conflits de synchronisation.
3. **Accès hors ligne** : Utilisation de l'application sans connexion internet.

### Dashboard MJ

1. **Tableau de bord configurable** : Interface personnalisable pour le MJ.
2. **Gestion des notes et documents** : Outils pour organiser les notes et les documents de jeu.
3. **Suivi des sessions** : Historique et suivi des sessions de jeu.

### Fonctionnalités supplémentaires

1. **Notifications**:
   - Notifications push pour les mises à jour et les invitations.
   - Rappels pour les sessions de jeu.

2. **Internationalisation**:
   - Support multilingue.
   - Gestion des fuseaux horaires.

3. **Accessibilité**:
   - Support des fonctionnalités d'accessibilité Android.
   - Thèmes clair et sombre.
   - Thèmes personnalisables importables depuis le backend.

4. **Mode hors ligne avancé**:
   - Stockage local des données des joueurs et des MJ.
   - Création de réseau virtuel pour le MJ (Bluetooth/Wi-Fi).
   - Synchronisation des données locales avec le backend.

5. **Fonctionnalités avancées des appareils**:
   - Utilisation de la biométrie pour une authentification sécurisée.
   - Utilisation du NFC pour un échange rapide de données entre appareils.
   - Optimisation de l'utilisation des ressources (processeur et RAM) pour un jeu fluide en pleine nature.

6. **Synchronisation des données entre MJ et joueurs**:
   - Mécanisme de vérité pour déterminer les données les plus récentes et correctes.
   - Synchronisation des données des joueurs avec le MJ.
   - Synchronisation des données du MJ avec les joueurs.
   - Gestion des conflits de synchronisation.

---

## Contraintes

### Techniques

1. **Compatibilité** : L'application doit être compatible avec les versions d'Android à partir de la version 33 (Android 13).
2. **Performances** : L'application doit être réactive et fluide, même sur des appareils moins puissants.
3. **Sécurité** : Les données sensibles doivent être protégées et chiffrées.
4. **Synchronisation des données** : Mécanisme de vérité pour déterminer les données les plus récentes et correctes entre le MJ et les joueurs. Le MJ doit posséder les informations des joueurs, et les joueurs doivent pouvoir synchroniser leurs données séparément. En cas de divergence, le système doit permettre au MJ ou aux joueurs de mettre à jour les données manquantes.

### Budget et ressources

1. **Budget limité** : Le projet doit être réalisé avec des ressources limitées.
2. **Équipe réduite** : Le développement sera effectué par une petite équipe ou un développeur seul.

### Délais

1. **Livraison progressive** : L'application sera livrée en plusieurs versions, avec des fonctionnalités prioritaires en premier.
2. **Maintenance continue** : Des mises à jour régulières seront nécessaires pour corriger les bugs et ajouter des fonctionnalités.

---

## Hypothèses

1. **Disponibilité de l'API backend** : L'API backend existante sera disponible et fonctionnelle pour le développement de l'application.
2. **Adoption par les utilisateurs** : Les utilisateurs de NexusForge seront intéressés par une application native Android.
3. **Compatibilité des appareils** : La majorité des utilisateurs auront des appareils compatibles avec les exigences techniques de l'application.

---

## Risques

### Techniques

1. **Problèmes de compatibilité** : Risque de problèmes de compatibilité avec certains appareils Android.
2. **Performances insuffisantes** : Risque de performances médiocres sur des appareils moins puissants.
3. **Problèmes de synchronisation** : Risque de conflits de synchronisation en mode hors ligne.

### Utilisateurs

1. **Adoption limitée** : Risque que les utilisateurs préfèrent continuer à utiliser la version web.
2. **Feedback négatif** : Risque de feedback négatif si l'application ne répond pas aux attentes des utilisateurs.

### Externes

1. **Changements dans l'API backend** : Risque que des changements dans l'API backend nécessitent des modifications dans l'application.
2. **Concurrence** : Risque que des applications similaires captent l'attention des utilisateurs.

---

## Indicateurs de succès

### Quantitatifs

1. **Nombre de téléchargements** : Nombre d'utilisateurs qui téléchargent et installent l'application sur le Google Play Store.
2. **Nombre d'utilisateurs actifs** : Nombre d'utilisateurs qui utilisent régulièrement l'application.
3. **Taux de rétention** : Pourcentage d'utilisateurs qui continuent à utiliser l'application après la première utilisation.
4. **Notes et avis** : Notes moyennes et avis des utilisateurs sur le Google Play Store.

### Qualitatifs

1. **Feedback utilisateur** : Retours positifs des utilisateurs sur l'expérience et les fonctionnalités de l'application.
2. **Adoption par la communauté** : Utilisation de l'application par la communauté des joueurs de JDR.
3. **Amélioration des performances** : Réduction des temps de chargement et amélioration de la réactivité par rapport à la version web.

---

## Conclusion

Ce document définit le projet d'application native Android pour NexusForge, en précisant les objectifs, la portée, le public cible, les fonctionnalités clés, les contraintes, les hypothèses, les risques, et les indicateurs de succès. Il servira de base pour le développement et la gestion du projet.

**Architecture**: Rust pour la logique métier, Kotlin pour l'interface utilisateur, SurrealDB pour le stockage local.

**Prochaine étape** : Documenter les évolutions dans le fichier `CHANGELOG.md`.
