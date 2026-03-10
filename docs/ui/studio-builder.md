# Studio Builder (Systemes & Interfaces)

## Objectif

Le Studio Builder est l'editeur visuel de Nexus Forge pour:

- construire un systeme de jeu (schema studio),
- personnaliser les ecrans de partie (profils MJ/Joueur).

Le principe est unique partout: blocs visuels imbriques + drag&drop.

## Navigation studio

Dans le studio systeme, un menu rapide est disponible en haut:

- `Palette`
- `Zone centrale`
- `Proprietes`
- `Runtime`

Ce menu permet de naviguer rapidement entre les panneaux sur grands ecrans.

## Regles d'imbrication

- `table` / `inventory` contient des `row`.
- `row` contient des `column`.
- `column` contient des champs (texte, nombre, etc.).
- `logic_if` contient `logic_then` / `logic_else` / `logic_or` / `logic_not`.
- les autres conteneurs (`container`, `tabs`, `view`, `repeater`) acceptent des sous-blocs selon les regles du Studio.

## Actions avancees sur un bloc

Depuis le panneau Proprietes d'un bloc selectionne:

1. `Dupliquer bloc + enfants`
2. `Export bloc JSON`
3. `Import bloc JSON (ajout dans la vue)`

### Duplication

- Duplique le bloc selectionne et toute son arborescence.
- Regle automatiquement les nouveaux IDs.
- Regle automatiquement les cles techniques (`key`) pour eviter les collisions.

### Export JSON

- Exporte le bloc selectionne + descendants.
- Format: `nexusforge.studio.block.v1`.
- Le JSON est place dans la zone d'import et copie dans le presse-papiers si disponible.

### Import JSON

- Accepte:
  - un objet `{ "format": "...", "components": [...] }`,
  - ou directement un tableau `[...]` de composants.
- Le Studio regenere IDs + `key` pour eviter les conflits.
- Si un bloc est selectionne et compatible, le bloc racine importe est accroche a ce bloc.

## Convertisseur HTML vers Vue Studio

Le Studio intègre un convertisseur qui permet:

- d'uploader un fichier `.html`,
- ou de coller un HTML brut,
- puis de convertir en composants Studio ajoutés dans la vue courante.

Le convertisseur est accessible via le bouton `Convertir HTML (popup)` en haut de la colonne gauche.

Mapping principal:

- `input` -> `text|number|checkbox|range|date|time|color` selon `type`,
- `textarea` -> `textarea`,
- `select` -> `choice` (options importées),
- `button` -> `button`,
- `table` -> `table` (colonnes depuis `th`/première ligne),
- conteneurs HTML (`div/section/form/fieldset/...`) -> `container`,
- layouts type `row/grid/flex` -> `row` + `column`.

Le convertisseur:

- recrée les IDs et les `key` pour éviter les collisions,
- tente de retrouver les labels via `label[for]`, `aria-label`, `placeholder`, `name`, `id`,
- ajoute les blocs à la fin de la vue active.

## Onglet "Tableau des champs"

La zone centrale du studio propose deux onglets:

- `Canvas visuel`
- `Tableau des champs`

L'onglet `Tableau des champs` affiche, pour chaque composant de chaque vue:

- le nom de vue,
- la cle technique (`@cle`),
- le label,
- le type,
- le parent,
- la reference (`reference`),
- la formule (`formula`),
- la condition d affichage (`showIf`).

Objectif: faciliter la creation de formules et de liaisons entre blocs.

## Rendu runtime arborescent

Le runtime du Studio (et la fiche Studio dans une partie) respecte maintenant l arborescence:

- `row` affiche ses enfants cote a cote,
- `column` empile ses enfants verticalement,
- les conteneurs gardent leur imbrication.

Le rendu ne se fait plus en liste plate de boites.

## Studio d'ecran de partie

Route dediee:

- `/sessions/:sessionId/studio?role=gm`
- `/sessions/:sessionId/studio?role=player`

Chaque compte peut avoir plusieurs interfaces favorites par role et par partie.

## Bonnes pratiques

- Nommer les blocs et cles de facon explicite.
- Utiliser la duplication pour creer des patterns reutilisables.
- Versionner les blocs complexes via export JSON.
- Tester les scripts boutons dans le testeur integre avant sauvegarde finale.
