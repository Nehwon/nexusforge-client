# Widgets du dashboard – Nexus Forge

Ce document décrit les widgets disponibles sur le dashboard de Nexus Forge, pour les rôles MJ et joueur, ainsi que ceux inclus dans la V1.

---

## 1. Principes

- Tous les widgets partagent un même système :
  - placement sur une **grille**,
  - **drag & drop** pour déplacement,
  - redimensionnement (small / medium / large),
  - configuration propre à l’utilisateur et au rôle (MJ / joueur).
- Le contenu d’un widget dépend du **rôle** et du **contexte de session** :
  - certaines données sont visibles uniquement côté MJ (notes MJ, infos cachées),
  - d’autres uniquement côté joueur (notes privées joueur).

---

## 2. Widgets communs (MJ + joueurs)

### 2.1. Fiche personnage

**Rôle** : MJ + joueur  
**But** : afficher et éditer une fiche de personnage.

Contenu :

- En-tête : nom, alias, portrait, type (PJ/PNJ), tags.
- Sections :
  - attributs,
  - ressources,
  - compétences,
  - inventaire,
  - conditions/effets,
  - notes liées.

Comportement :

- Joueur :
  - affiche sa fiche (ou choix de perso si plusieurs),
  - édition des champs autorisés,
  - boutons de jets rapides.
- MJ :
  - peut choisir n’importe quel PJ/PNJ,
  - édition complète,
  - accès aux champs masqués.

---

### 2.2. Notes

**Rôle** : MJ + joueur  
**But** : gérer toutes les notes dans un seul widget.

Contenu :

- Onglet « Mes notes privées » :
  - joueur : notes `player_private` dont il est owner,
  - MJ : notes `gm_private`.
- Onglet « Notes publiques » :
  - notes `public` filtrées par campagne / session.
- Filtres contextuels (optionnel V1) :
  - par session, PJ, PNJ, lieu, etc.

Comportement :

- Création / édition / suppression selon le type de note.
- Liens depuis d’autres widgets (ex : ouvrir les notes liées à un personnage).

---

### 2.3. Journal de session

**Rôle** : MJ + joueur  
**But** : afficher des événements importants de la session.

Contenu :

- Liste des événements issus de `Session.log` :
  - jets importants,
  - partages de documents,
  - changements de scène,
  - autres actions marquantes.

Comportement :

- Joueur :
  - vue lecture seule filtrée (sans infos secrètes).
- MJ :
  - vue plus complète,
  - filtres par type d’événement.

---

### 2.4. Chat & messages

**Rôle** : MJ + joueur  
**But** : regrouper toute la communication textuelle.

Contenu :

- Zones de chat :
  - global (toute la table),
  - messages privés (MJ ↔ joueur, joueur ↔ joueur),
  - canaux de groupes (Groupe A/B…).
- Liste de messages avec indication :
  - type (global, MP, groupe),
  - auteur,
  - heure,
  - éventuelles pièces jointes.

Comportement spécial MJ :

- Les **whispers joueurs → MJ** :
  - marqués visuellement (couleur spéciale, icône),
  - peuvent déclencher une **bannière centrale** très visible (paramétrable via `ui.shouldShowBanner` des messages),
  - option d’épingler certains messages (`ui.autoPinOnGM`).

Comportement général :

- Inline reply, liens vers documents/fiches attachés.
- Respect des règles de `Session.settings.silenceMode` :
  - certains canaux peuvent être grisés / bloqués.

---

### 2.5. Documents

**Rôle** : MJ + joueur  
**But** : gérer tous les documents liés à la session (à lire, montrer, partager).

Contenu :

- Liste des documents de `Session.documents` filtrés par rôle :
  - joueur : uniquement ceux partagés avec lui / tous les joueurs,
  - MJ : tous, avec info de partage.
- Info par document :
  - titre, type (image, PDF, note, fiche, objet),
  - icône,
  - indicateur de nouveau / non lu.

Comportement :

- Joueur :
  - ouvrir un document,
  - marquer comme lu,
  - transmettre un document (s’il l’a reçu) à un autre joueur ou groupe.
- MJ :
  - importer/créer des documents,
  - les ajouter à la **queue de partage**,
  - les partager avec un joueur, un groupe, tous.

---

### 2.6. Effets & conditions

**Rôle** : MJ + joueur  
**But** : afficher les conditions/effets actifs.

Contenu :

- Joueur :
  - liste des conditions de `Character.sessionState.conditions` sur **son** perso.
- MJ :
  - liste condensée pour une sélection de personnages (PJ/PNJ en combat).

Comportement :

- Ajout/suppression de conditions côté MJ.
- Mise à jour automatique via les actions de combat.

---

### 2.7. Contexte / scène actuelle

**Rôle** : MJ + joueur  
**But** : montrer le cadre narratif de la scène en cours.

Contenu :

- titre de la scène,
- lieu,
- texte descriptif,
- objectifs visibles (pour les joueurs).

Comportement :

- MJ :
  - édite ces informations,
  - contrôle ce qui est rendu public ou non.
- Joueur :
  - vue lecture seule.

---

## 3. Widgets spécifiques MJ

### 3.1. Initiative & combat

**Rôle** : MJ  
**But** : gérer le tour par tour et la dynamique de combat.

Contenu :

- basés sur `Session.initiative` :
  - round actuel,
  - index de tour courant,
  - liste d’entrées (PJ/PNJ/groupes) ordonnée par initiative.

Actions :

- lancer/ajuster les initiatives,
- avancer/reculer le tour,
- changer de round,
- activer/désactiver des entrées (hors combat),
- accès rapide aux fiches associées.

---

### 3.2. Table des personnages (PJ/PNJ)

**Rôle** : MJ  
**But** : vue globale des personnages impliqués dans la session.

Contenu :

- liste des PJ/PNJ avec :
  - nom,
  - type,
  - ressources clés (PV, etc.),
  - tags (faction, rôle…).

Actions :

- filtres (PJ / PNJ / type),
- double‑clic = ouvre la fiche dans le widget Fiche personnage.

---

### 3.3. Contrôle table & écrans

**Rôle** : MJ  
**But** : contrôler ce que voient les joueurs sur leurs écrans dédiés.

Contenu V1 minimale :

- sélection de la vue pour l’**écran infos joueurs** :
  - Initiative,
  - Contexte / scène,
  - Document spécifique (image, handout…).
- aperçu de la vue actuellement affichée.

Actions :

- changer la vue affichée sur l’écran joueurs,
- préparer une prochaine vue (ex. doc) et basculer au bon moment.

Les contrôles battlemap avancés seront ajoutés ultérieurement.

---

### 3.4. Notes MJ

**Rôle** : MJ  
**But** : regrouper les notes `gm_private`.

Contenu :

- liste / arbre de notes privées MJ filtrées par :
  - campagne / session,
  - scène,
  - personnage.

Actions :

- créer / éditer / supprimer des notes MJ,
- pin certaines notes pour les voir en permanence.

---

### 3.5. Gestion des groupes & communications

**Rôle** : MJ  
**But** : gérer les groupes de joueurs et les règles de communication.

Contenu :

- liste des groupes (`Session.groups`) :
  - nom, description, membres.
- paramètres de communication (`Session.settings`) :
  - `silenceMode`,
  - autorisation chat global,
  - autorisation chat joueurs ↔ joueurs.

Actions :

- créer / renommer / supprimer des groupes,
- ajouter/retirer des joueurs d’un groupe,
- basculer entre les modes :
  - tout autorisé,
  - global off,
  - joueurs↔joueurs bloqués,
  - silence total.

---

### 3.6. Queue de documents à partager

**Rôle** : MJ  
**But** : préparer les documents à montrer pendant la séance.

Contenu :

- liste des documents « en attente » (queue),
- pour chacun : titre, type, destinataires prévus.

Actions :

- ajouter des docs depuis le widget Documents (drag & drop possible),
- envoyer à :
  - un joueur,
  - un groupe,
  - tous les joueurs,
- vider la queue.

---

### 3.7. Scripts & macros

**Rôle** : MJ  
**But** : exécuter rapidement des actions fréquentes (jets, effets).

Contenu :

- liste de macros définies dans le système / la campagne :
  - nom, description, type (jet, effet, etc.).

Actions :

- exécuter une macro,
- voir le résultat dans le chat / journal,
- (plus tard) éditer des macros via l’éditeur de règles.

---

## 4. Widgets spécifiques joueur

### 4.1. Mon personnage

**Rôle** : Joueur  
**But** : gérer sa fiche perso.

Contenu :

- fiche complète du personnage.
- boutons de jets rapides.

Actions :

- consulter / modifier selon les permissions de la session,
- lancer des jets (affichés dans le chat).

---

### 4.2. Notes & journal joueur

**Rôle** : Joueur  
**But** : regrouper notes privées et info de campagne.

Contenu :

- onglet « Mes notes privées »,
- onglet « Notes publiques » de la campagne/session,
- onglet « Journal de session » (lecture seule des événements).

Actions :

- créer / éditer ses notes privées,
- consulter les notes publiques / journal.

---

### 4.3. Messages & documents

**Rôle** : Joueur  
**But** : regrouper chat et documents reçus.

Contenu :

- volet Chat (via widget Chat & messages),
- volet Documents reçus (liste, badges « nouveau »).

Actions :

- envoyer messages (global, MP, groupes),
- ouvrir les documents,
- retransmettre des documents à d’autres joueurs ou groupes (RP : partage d’info).

---

### 4.4. État de mon perso

**Rôle** : Joueur  
**But** : vue rapide de l’état du personnage.

Contenu :

- ressources clés (PV, mana…),
- conditions / effets,
- éventuellement un résumé de défenses / scores importants.

Actions :

- consultation rapide pendant la session,
- lien vers la fiche complète pour édition.

---

## 5. V1 – Widgets inclus

Pour la V1, les widgets prioritaires sont :

### MJ

- Initiative & combat  
- Fiche personnage  
- Chat & messages  
- Documents  
- Contrôle table & écrans (version simple)

### Joueur

- Mon personnage  
- Chat & messages  
- Documents (reçus)  
- Notes & journal (version simple)

Les autres widgets seront ajoutés dans des versions ultérieures (Effets & conditions dédié, Table des personnages, Queue de documents, Scripts & macros, gestion fine des groupes).

