# Dashboard – Nexus Forge

Ce document décrit le fonctionnement du dashboard dans Nexus Forge, pour les rôles MJ et joueur, ainsi que les widgets disponibles (et ceux inclus dans la V1).

---

## 1. Principes généraux

- **Dashboard unique** : même moteur de dashboard pour tous les utilisateurs (MJ et joueurs).
- **Widgets** : le dashboard est constitué de widgets que l’on peut ajouter, déplacer (drag & drop) et redimensionner.
- **Layouts par rôle** :
  - chaque utilisateur peut avoir un layout pour son rôle **MJ**,
  - et un layout pour son rôle **joueur**.
- **Contextualisation par session** :
  - le rôle dans une session (`gm`, `player`, `observer`) détermine quels widgets sont disponibles et quelles données sont visibles.
  - un même compte peut être MJ d’une session A et joueur d’une session B.

Les layouts globaux par rôle sont stockés dans `User.dashboardLayout.mj` et `User.dashboardLayout.player` (voir `user.schema.json`).

---

## 2. Rôles et comportements

### 2.1. MJ

- Sur une session où l’utilisateur est `gm` :
  - le dashboard charge le layout **MJ** par défaut ;
  - widgets MJ disponibles (Initiative & combat, Contrôle table, etc.) ;
  - accès complet aux données (sauf notes privées des joueurs).
- Le MJ peut basculer localement en **mode “prévisualisation joueur”** :
  - l’UI recharge le layout **joueur** (et applique les permissions d’un joueur),
  - utile pour voir « ce que les joueurs voient ».

### 2.2. Joueur

- Sur une session où l’utilisateur est `player` :
  - le dashboard charge le layout **joueur** ;
  - widgets centrés sur :
    - sa fiche,
    - ses notes,
    - ses messages,
    - ses documents.
- Le joueur ne voit jamais :
  - les widgets d’initiative globale complet,
  - les notes MJ,
  - les contrôles de battlemap et d’écran joueurs.

---

## 3. Widgets communs (MJ + joueurs)

### 3.1. Fiche personnage

- Vue principale d’un personnage.
- Joueur :
  - affiche **sa** fiche (ou sélection si plusieurs persos),
  - édition des champs autorisés par le système/session,
  - boutons de jets rapides.
- MJ :
  - peut afficher la fiche de n’importe quel PJ/PNJ,
  - édition complète (avec champs cachés aux joueurs).

### 3.2. Notes

- Un seul widget pour toutes les notes, avec onglets internes :
  - « Mes notes privées » (joueur ou MJ),
  - « Notes publiques » de la campagne/session,
  - filtres par contexte (session, PJ, PNJ, lieu, etc.).
- Respecte le type de note (`player_private`, `gm_private`, `public`).

### 3.3. Journal de session

- Affiche un résumé des événements importants :
  - entrées du `Session.log` (jets marquants, docs partagés, changements de scène…).
- Joueur :
  - vue lecture seule des événements non secrets.
- MJ :
  - vue plus complète, possibilité de filtrer (seulement jets, seulement docs, etc.).

### 3.4. Chat & messages

- Un seul widget pour tous les types de chat :
  - chat global,
  - messages privés (MJ ↔ joueurs, joueur ↔ joueur),
  - canaux de groupe (Groupes A/B…).
- Intègre les **whispers joueurs → MJ** :
  - côté MJ, ces messages apparaissent avec une mise en évidence spéciale (bandeau, highlight, option de pin).
- Gestion des canaux en fonction de `Session.communication.channels` et des règles de `Session.settings` (modes de silence, blocage…).

### 3.5. Documents

- Widget « Documents » :
  - Joueur :
    - liste des **documents reçus** (handouts, images, fiches PNJ/objets…),
    - badges « nouveau » pour les docs non encore consultés.
  - MJ :
    - liste des documents disponibles pour la campagne/session,
    - actions : « partager avec X », « partager avec un groupe », « partager avec tous »,
    - possibilité d’envoyer un document dans la queue de partage.

### 3.6. Effets & conditions

- Joueur :
  - vue compacte des **conditions** et effets sur son personnage (données de `Character.sessionState.conditions`).
- MJ :
  - vue condensée sur une sélection de personnages (PJ/PNJ), utile en combat.

### 3.7. Contexte / scène actuelle

- Affiche :
  - titre de la scène,
  - localisation,
  - texte descriptif court,
  - objectifs visibles.
- MJ :
  - édite le contenu,
  - peut choisir quelles infos sont visibles par les joueurs.
- Joueur :
  - vue lecture seule.

---

## 4. Widgets spécifiques MJ

### 4.1. Initiative & combat

- Widget central pour les combats, basé sur `Session.initiative`.
- Contenu :
  - round courant,
  - liste ordonnée des entrées d’initiative (PJ, PNJ, groupes),
  - highlight du tour courant,
  - liens vers les fiches des entités.
- Actions :
  - lancer/définir les valeurs d’initiative,
  - avancer/revenir dans l’ordre (« tour suivant/précédent »),
  - changer de round,
  - activer/désactiver des entrées (créatures hors combat),
  - appliquer des conditions (liens avec le widget Effets & conditions).

### 4.2. Table des personnages (PJ/PNJ)

- Liste/tab vue de tous les personnages impliqués dans la campagne/session.
- Contenu :
  - noms, type (PJ/PNJ), tags, ressources clés (PV, etc.).
- Act
