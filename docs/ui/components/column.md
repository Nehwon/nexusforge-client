# Composant Studio: `column`

## Role

`column` organise les blocs enfants en pile verticale.

Usages typiques:

- structurer une section en sous-zones lisibles,
- accueillir des champs dans un ordre vertical clair,
- servir de colonne dans un `row`.

## Proprietes a valider

- `label`: nom logique du bloc en edition.
- `key`: cle technique.
- `showIf`: condition d affichage de la colonne.
- `hideBorder`:
  - `false` -> bordure visible,
  - `true` -> bordure masquee.
- `backgroundColor`:
  - vide -> theme par defaut,
  - valeur couleur -> fond personnalise.

## Bonnes pratiques

- Utiliser `column` surtout comme enfant de `row`.
- Eviter les imbrications trop profondes de `column` dans `column` sans besoin.
- Garder un ordre coherent (du plus important au moins important).
- Ne pas dupliquer des wrappers visuels inutiles.

## Checklist QA (column)

1. Les enfants sont-ils dans le bon ordre vertical ?
2. La colonne reste-t-elle lisible sur petit ecran ?
3. Le `showIf` masque/affiche-t-il bien toute la colonne ?
4. Bordure/fond: est-ce utile et non surcharge ?
5. Le label de la colonne est-il explicite ?
