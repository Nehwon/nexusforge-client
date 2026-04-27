# Application Native Android pour NexusForge

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Technologies](#technologies)
4. [Fonctionnalités](#fonctionnalités)
5. [Installation](#installation)
6. [Configuration](#configuration)
7. [Structure du projet](#structure-du-projet)
8. [Recommandations](#recommandations)

---

## Introduction

Ce dossier contient les spécifications et le code pour une application native Android pour NexusForge. L'objectif est de fournir une expérience utilisateur plus efficace et optimisée que le site web en mode responsif.

**Architecture hybride**: L'application utilise Rust pour la logique métier et le traitement de données (via Android NDK), et Kotlin pour l'interface utilisateur (Jetpack Compose).

---

## Architecture

L'application native Android sera conçue selon une architecture hybride Rust + Kotlin pour maximiser les performances et la sécurité:

1. **Rust (via Android NDK)**: Logique métier, traitement de données, calculs intensifs, synchronisation
2. **Kotlin (UI uniquement)**: Interface utilisateur avec Jetpack Compose (obligatoire car Rust ne peut pas créer directement l'UI Android)
3. **SurrealDB**: Base de données multi-model en Rust pour le stockage local
4. **JNI**: Communication entre Rust et Kotlin

---

## Technologies

### Langage de programmation

- **Rust**: Langage principal pour la logique métier, le traitement de données et les calculs intensifs (via Android NDK)
- **Kotlin**: Langage pour l'interface utilisateur uniquement (Jetpack Compose) - obligatoire car Rust ne peut pas créer directement l'UI Android

### Frameworks et bibliothèques

**Pour Rust**:
- **SurrealDB**: Base de données multi-model pour le stockage local
- **jsonwebtoken**: Validation et génération de JWT
- **totp-lite**: Implémentation TOTP pour MFA
- **cargo-ndk**: Cross-compilation Android
- **jni**: Bindings JNI pour la communication Kotlin

**Pour Kotlin (UI)**:
- **Jetpack Compose**: Pour la construction de l'interface utilisateur.
- **Android Jetpack**: Ensemble de bibliothèques pour simplifier le développement Android.
  - **ViewModel**: Pour gérer les données liées à l'UI.
  - **LiveData**: Pour observer les changements de données.
  - **Navigation**: Pour la navigation entre les écrans.
  - **WorkManager**: Pour les tâches en arrière-plan.
  - **BiometricPrompt**: Pour la biométrie.
  - **EncryptedSharedPreferences**: Stockage sécurisé.
  - **Jetpack Security**: Chiffrement des données.
- **Hilt**: Pour l'injection de dépendances dans l'UI Kotlin.
- **Espresso**: Pour les tests d'interface utilisateur.

### Outils de développement

- **Android Studio**: Environnement de développement intégré (IDE).
- **Rust toolchain**: Cargo, rustc, rustup.
- **Gradle**: Système de build.
- **Git**: Pour le contrôle de version.
- **cargo-ndk**: Pour la cross-compilation Android.

---

## Fonctionnalités

### Fonctionnalités principales

1. **Authentification**:
   - Connexion et inscription des utilisateurs.
   - Gestion des sessions avec JWT.
   - Authentification à deux facteurs (MFA/TOTP).
   - Sécurité locale via biométrie ou PIN.
   - Communication avec backend React+TypeScript existant.

2. **Gestion des sessions de jeu**:
   - Création et gestion des sessions de jeu.
   - Invitation et gestion des joueurs.
   - Chat en temps réel.

3. **Gestion des personnages**:
   - Création et édition de fiches de personnages.
   - Gestion des attributs et compétences.
   - Suivi des objets et équipements.

4. **Système de règles**:
   - Moteur de règles visuel pour les systèmes de jeu.
   - Évaluation des formules et conditions.
   - Gestion des dés et des jets.

5. **Mode hors ligne**:
   - Synchronisation des données locales avec SurrealDB.
   - Gestion des conflits de synchronisation avec CRDTs.
   - Accès aux données hors ligne.
   - Live Queries pour les mises à jour en temps réel.

6. **Dashboard MJ**:
   - Tableau de bord configurable pour le Maître du Jeu.
   - Gestion des notes et des documents.
   - Suivi des sessions et des événements.

### Fonctionnalités supplémentaires

1. **Notifications**:
   - Notifications push pour les mises à jour et les invitations.
   - Rappels pour les sessions de jeu.
   - Ajout aux calendriers existant (Google Calendar, Outlook, etc.)

2. **Internationalisation**:
   - Support multilingue.
   - Gestion des fuseaux horaires.

3. **Accessibilité**:
   - Support des fonctionnalités d'accessibilité Android.
   - Thèmes clair et sombre.

---

## Installation

### Prérequis

- Android Studio (version 4.2 ou supérieure).
- Rust toolchain (stable).
- Android NDK.
- JDK 11 ou supérieur.
- Android SDK (version 33 ou supérieure).
- Git.

### Étapes d'installation

1. **Cloner le dépôt**:
   ```bash
   git clone https://github.com/votre-depot/nexusforge.git
   cd nexusforge/NexusForge/features/App_Native
   ```

2. **Ouvrir le projet dans Android Studio**:
   - Lancer Android Studio.
   - Sélectionner "Open an existing project".
   - Naviguer jusqu'au dossier `App_Native` et ouvrir le fichier `build.gradle`.

3. **Configurer le SDK**:
   - Assurez-vous que le SDK Android est configuré correctement.
   - Installez les packages SDK nécessaires via le SDK Manager.

4. **Builder le projet**:
   - Cliquer sur "Build" > "Make Project" pour builder le projet.

---

## Configuration

### Configuration de l'environnement

1. **Fichier `local.properties`**:
   - Configurer le chemin du SDK Android.
   - Exemple:
     ```properties
     sdk.dir=/Users/votre-utilisateur/Library/Android/sdk
     ```

2. **Fichier `gradle.properties`**:
   - Configurer les propriétés de build.
   - Exemple:
     ```properties
     org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
     android.useAndroidX=true
     android.enableJetifier=true
     ```

### Configuration de l'application

1. **Fichier `AndroidManifest.xml`**:
   - Configurer les permissions et les activités.
   - Exemple:
     ```xml
     <manifest xmlns:android="http://schemas.android.com/apk/res/android"
         package="com.nexusforge.app">
         <uses-permission android:name="android.permission.INTERNET" />
         <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
         <application
             android:allowBackup="true"
             android:icon="@mipmap/ic_launcher"
             android:label="@string/app_name"
             android:roundIcon="@mipmap/ic_launcher_round"
             android:supportsRtl="true"
             android:theme="@style/Theme.NexusForge">
             <activity android:name=".MainActivity">
                 <intent-filter>
                     <action android:name="android.intent.action.MAIN" />
                     <category android:name="android.intent.category.LAUNCHER" />
                 </intent-filter>
             </activity>
         </application>
     </manifest>
     ```

2. **Fichier `build.gradle` (Module)**:
   - Configurer les dépendances et les options de build.
   - Exemple:
     ```gradle
     android {
         compileSdk 33
         
         defaultConfig {
             applicationId "com.nexusforge.app"
             minSdk 33
             targetSdk 33
             versionCode 1
             versionName "1.0"
             
             testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
         }
         
         buildTypes {
             release {
                 minifyEnabled false
                 proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
             }
         }
         
         compileOptions {
             sourceCompatibility JavaVersion.VERSION_11
             targetCompatibility JavaVersion.VERSION_11
         }
         
         kotlinOptions {
             jvmTarget = '11'
         }
         
         buildFeatures {
             compose true
         }
         
         composeOptions {
             kotlinCompilerExtensionVersion '1.5.3'
         }
     }
     
     dependencies {
         implementation 'androidx.core:core-ktx:1.12.0'
         implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.6.2'
         implementation 'androidx.activity:activity-compose:1.8.0'
         implementation "androidx.compose.ui:ui:$compose_ui_version"
         implementation "androidx.compose.ui:ui-tooling-preview:$compose_ui_version"
         implementation 'androidx.compose.material:material:1.5.4'
         testImplementation 'junit:junit:4.13.2'
         androidTestImplementation 'androidx.test.ext:junit:1.1.5'
         androidTestImplementation 'androidx.test.espresso:espresso-core:3.5.1'
         androidTestImplementation "androidx.compose.ui:ui-test-junit4:$compose_ui_version"
         debugImplementation "androidx.compose.ui:ui-tooling:$compose_ui_version"
         debugImplementation "androidx.compose.ui:ui-test-manifest:$compose_ui_version"
     }
     ```

---

## Structure du projet

Voici la structure recommandée pour le projet:

```
App_Native/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/com/nexusforge/app/
│   │   │   │   ├── ui/              # Composants UI Jetpack Compose
│   │   │   │   ├── viewmodel/       # ViewModels
│   │   │   │   ├── di/              # Injection de dépendances (Hilt)
│   │   │   ├── rust/               # Code Rust (via JNI)
│   │   │   │   ├── src/
│   │   │   │   │   ├── lib.rs      # Logique métier Rust
│   │   │   │   │   └── ...
│   │   │   │   └── Cargo.toml
│   │   │   ├── jniLibs/            # Bibliothèques natives compilées
│   │   │   │   ├── arm64-v8a/
│   │   │   │   ├── armeabi-v7a/
│   │   │   │   └── x86_64/
│   │   │   ├── res/                # Ressources
│   │   │   │   ├── drawable/
│   │   │   │   ├── values/
│   │   │   ├── AndroidManifest.xml
│   │   ├── test/
│   │   ├── androidTest/
│   ├── build.gradle
├── build.gradle
├── settings.gradle
├── gradle.properties
```

---

## Recommandations

### Bonnes pratiques de développement

1. **Architecture propre**: Suivre les principes de l'architecture propre pour séparer les responsabilités.
2. **Tests**: Écrire des tests unitaires et d'intégration pour chaque composant.
3. **Revue de code**: Effectuer des revues de code régulières pour maintenir la qualité du code.
4. **Documentation**: Documenter le code et les fonctionnalités pour faciliter la maintenance.
5. **Performance**: Optimiser les performances de l'application, notamment pour les opérations réseau et la gestion des données.

### Sécurité

1. **Stockage sécurisé**: Utiliser des mécanismes de stockage sécurisé pour les données sensibles.
2. **Chiffrement**: Chiffrer les données sensibles avant de les stocker localement.
3. **Authentification**: Implémenter des mécanismes d'authentification robustes.
4. **Permissions**: Demander uniquement les permissions nécessaires et expliquer leur utilisation.

### UI/UX

1. **Design cohérent**: Suivre les guidelines de design Material Design pour une expérience utilisateur cohérente.
2. **Accessibilité**: Assurer que l'application est accessible à tous les utilisateurs.
3. **Performance UI**: Optimiser les performances de l'interface utilisateur pour une expérience fluide.

---

## Conclusion

Ce document fournit une base pour le développement d'une application native Android pour NexusForge avec une architecture hybride Rust + Kotlin. En suivant les recommandations et les bonnes pratiques définies dans ARBITRAGE.md, vous pouvez créer une application robuste, sécurisée et performante qui offre une meilleure expérience utilisateur que le site web en mode responsif.

**Prochaine étape**: Consulter ARBITRAGE.md pour les choix techniques détaillés.
