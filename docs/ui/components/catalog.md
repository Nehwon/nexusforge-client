# Catalogue Composants Studio

## Champs de base

- `text`: texte simple
- `textarea`: texte multi-ligne
- `number`: valeur numerique
- `checkbox`: booleen
- `choice`: liste de choix
- `range`: jauge numerique

## Champs avances

- `color`: selecteur de couleur
- `date`: date
- `time`: heure
- `avatar`: image/avatar

## Affichage / actions

- `label`: texte affiche
- `icon`: icone
- `button`: action scriptable

## Layout / structure

- `container`: groupe logique
- `row`: ligne horizontale ([details](./row.md))
- `column`: colonne verticale ([details](./column.md))
- `tabs`: onglets
- `tabs_nested`: onglets imbriques
- `view`: sous-vue
- `repeater`: liste repetable

## Logique

- `logic_if`: condition IF
- `logic_then`: branche THEN
- `logic_else`: branche ELSE
- `logic_or`: operateur OR
- `logic_not`: operateur NOT

## JDR

- `dice_roll`: jet de des
- `table`: tableau ([details](./table.md))
- `inventory`: inventaire
- `relation`: reference croisee

## Difference importante: `row/column` vs `table/inventory`

- `row/column`: presentation visuelle libre (layout).
- `table/inventory`: donnees tabulaires repetables (lignes/colonnes metier).

Choix rapide:

- "Je compose l ecran" -> `row/column`
- "Je stocke une liste de donnees" -> `table/inventory`

## Proprietes communes (minimales)

- `label`
- `key`
- `reference`
- `formula`
- `showIf`

## Proprietes visuelles legeres (containers)

- `hideBorder` (Afficher la bordure: oui/non)
- `backgroundColor` (fond optionnel)
