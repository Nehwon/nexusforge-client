# Guide d'Installation des Dépendances

**Date**: 27 avril 2026
**Version**: 1.0
**Auteur**: Cascade AI

---

## Table des matières

1. [Prérequis système](#prérequis-système)
2. [Installation Rust](#installation-rust)
3. [Installation Android Studio](#installation-android-studio)
4. [Configuration Android SDK](#configuration-android-sdk)
5. [Installation Android NDK](#installation-android-ndk)
6. [Configuration du projet](#configuration-du-projet)
7. [Vérification de l'installation](#vérification-de-linstallation)
8. [Dépannage](#dépannage)

---

## Prérequis système

### Systèmes d'exploitation supportés

- **Linux**: Ubuntu 20.04+, Debian 11+, Fedora 35+
- **macOS**: macOS 11+ (Big Sur)
- **Windows**: Windows 10+ (avec WSL2 recommandé)

### Matériel minimum

- **RAM**: 8 Go minimum (16 Go recommandé)
- **Stockage**: 20 Go d'espace libre
- **Processeur**: x86_64 ou ARM64

---

## Installation Rust

### Étape 1: Installer Rust via rustup

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Ou sur Windows:

```powershell
winget install Rustlang.Rustup
```

### Étape 2: Configurer Rust

```bash
# Ajouter Rust au PATH (redémarrer le terminal après installation)
source $HOME/.cargo/env

# Vérifier l'installation
rustc --version
cargo --version
```

### Étape 3: Installer les outils Android pour Rust

```bash
# Installer cargo-ndk pour la cross-compilation Android
cargo install cargo-ndk

# Installer la crate jni pour les bindings JNI
cargo add jni
```

### Étape 4: Configurer les targets Android

```bash
# Ajouter les targets Android pour Rust
rustup target add aarch64-linux-android    # ARM64
rustup target add armv7-linux-androideabi  # ARMv7
rustup target add i686-linux-android       # x86
rustup target add x86_64-linux-android      # x86_64
```

---

## Installation Android Studio

### Étape 1: Télécharger Android Studio

- **Linux**: [Télécharger depuis developer.android.com](https://developer.android.com/studio)
- **macOS**: [Télécharger depuis developer.android.com](https://developer.android.com/studio)
- **Windows**: [Télécharger depuis developer.android.com](https://developer.android.com/studio)

### Étape 2: Installer Android Studio

```bash
# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install android-studio

# macOS (via Homebrew)
brew install --cask android-studio

# Windows
# Exécuter l'installateur téléchargé
```

### Étape 3: Lancer Android Studio et compléter l'installation

1. Lancer Android Studio
2. Choisir "Standard" pour l'installation
3. Accepter les licences
4. Attendre le téléchargement des composants (SDK, build tools, etc.)

---

## Configuration Android SDK

### Étape 1: Configurer les variables d'environnement

Ajoutez ces lignes à votre fichier `~/.bashrc` ou `~/.zshrc`:

```bash
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Rechargez votre configuration:

```bash
source ~/.bashrc  # ou source ~/.zshrc
```

### Étape 2: Installer les composants SDK nécessaires

```bash
# Via Android Studio
# Ouvrir SDK Manager (Tools > SDK Manager)
# Installer:
# - Android SDK Platform 33
# - Android SDK Build-Tools 33.0.0
# - Android SDK Platform-Tools
# - Android SDK Tools

# Ou via command line (sdkmanager)
sdkmanager "platforms;android-33"
sdkmanager "build-tools;33.0.0"
sdkmanager "platform-tools"
sdkmanager "tools"
```

### Étape 3: Vérifier l'installation

```bash
adb version
sdkmanager --list
```

---

## Installation Android NDK

### Étape 1: Installer Android NDK

```bash
# Via Android Studio
# Ouvrir SDK Manager (Tools > SDK Manager)
# Onglet "SDK Tools"
# Cocher "NDK (Side by side)"
# Choisir la version 25.1.8937393 ou supérieure
# Cliquez sur "Apply"

# Ou via command line
sdkmanager "ndk;25.1.8937393"
```

### Étape 2: Configurer les variables d'environnement NDK

Ajoutez à votre `~/.bashrc` ou `~/.zshrc`:

```bash
# Android NDK
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.1.8937393
export PATH=$PATH:$ANDROID_NDK_HOME
```

Rechargez votre configuration:

```bash
source ~/.bashrc  # ou source ~/.zshrc
```

### Étape 3: Vérifier l'installation

```bash
$ANDROID_NDK_HOME/ndk-build --version
```

---

## Configuration du projet

### Étape 1: Cloner le dépôt

```bash
git clone https://github.com/votre-depot/nexusforge.git
cd nexusforge/NexusForge/features/App_Native
```

### Étape 2: Configurer local.properties

Créez le fichier `local.properties` à la racine du projet:

```properties
# Chemin vers le SDK Android
sdk.dir=/home/votre-utilisateur/Android/Sdk

# Chemin vers le NDK Android
ndk.dir=/home/votre-utilisateur/Android/Sdk/ndk/25.1.8937393

# Chemin vers Rust (optionnel, si cargo n'est pas dans le PATH)
# rust.dir=/home/votre-utilisateur/.cargo/bin
```

### Étape 3: Configurer gradle.properties

Le fichier `gradle.properties` devrait contenir:

```properties
org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
android.defaults.buildfeatures.buildconfig=true
android.nonTransitiveRClass=false
```

### Étape 4: Initialiser le projet Rust

```bash
# Naviguer vers le dossier Rust
cd app/src/main/rust

# Initialiser le projet Cargo (si pas déjà fait)
cargo init --lib

# Ajouter les dépendances Rust nécessaires
cargo add jni
cargo add jsonwebtoken
cargo add totp-lite
cargo add surrealdb
```

### Étape 5: Builder le projet

```bash
# Revenir à la racine du projet
cd ../../../../..

# Builder le projet avec Gradle
./gradlew build

# Ou sur Windows
gradlew.bat build
```

---

## Vérification de l'installation

### Vérifier Rust

```bash
rustc --version
cargo --version
cargo ndk --version
```

### Vérifier Android SDK

```bash
adb version
sdkmanager --version
```

### Vérifier Android NDK

```bash
$ANDROID_NDK_HOME/ndk-build --version
```

### Vérifier le projet

```bash
# Builder le projet
./gradlew build

# Lancer les tests
./gradlew test

# Lancer les tests instrumentés
./gradlew connectedAndroidTest
```

---

## Dépannage

### Problème: cargo-ndk ne fonctionne pas

**Solution**:
```bash
# Réinstaller cargo-ndk
cargo install cargo-ndk --force

# Vérifier que les targets Android sont installés
rustup target list --installed
```

### Problème: Android NDK non trouvé

**Solution**:
```bash
# Vérifier la variable d'environnement
echo $ANDROID_NDK_HOME

# Réinstaller NDK via SDK Manager
sdkmanager "ndk;25.1.8937393"
```

### Problème: Erreur de compilation JNI

**Solution**:
```bash
# Vérifier que la crate jni est installée
cargo add jni

# Vérifier la configuration du build.gradle
# Assurez-vous que externalNativeBuild est configuré correctement
```

### Problème: Gradle build échoue

**Solution**:
```bash
# Nettoyer le projet
./gradlew clean

# Réinitialiser Gradle
rm -rf .gradle
rm -rf build
./gradlew build --refresh-dependencies
```

### Problème: Out of memory lors du build

**Solution**:
```bash
# Augmenter la mémoire JVM dans gradle.properties
org.gradle.jvmargs=-Xmx6144m -Dfile.encoding=UTF-8
```

---

## Ressources supplémentaires

- [Documentation Rust](https://www.rust-lang.org/docs)
- [Documentation Android NDK](https://developer.android.com/ndk)
- [Documentation Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Documentation cargo-ndk](https://github.com/bbqsrc/cargo-ndk)
- [Documentation SurrealDB](https://surrealdb.com/docs)

---

## Conclusion

Ce guide couvre l'installation de toutes les dépendances nécessaires pour le développement de l'application native Android NexusForge avec une architecture hybride Rust + Kotlin. En suivant ces étapes, vous devriez avoir un environnement de développement fonctionnel.

**Prochaine étape**: Consulter `README.md` pour commencer le développement.
