# Composant Studio: `container`

## Role

`container` sert a regrouper des blocs enfants dans une meme section visuelle.

Usages typiques:

- separer des zones (identite, caracteristiques, inventaire),
- porter un style de section (bordure/fond),
- simplifier l arborescence.

## Proprietes a valider

- `label`: titre interne du bloc (editor only).
- `key`: identifiant technique.
- `showIf`: condition d affichage.
- `hideBorder`:
  - `false` -> bordure visible,
  - `true` -> bordure masquee.
- `backgroundColor`:
  - vide -> theme par defaut,
  - valeur couleur -> fond personnalise.

## Bonnes pratiques

- Utiliser un `container` par section metier.
- Eviter les containers imbriques inutiles (1 seul enfant sans valeur semantique).
- Nommer le `label` avec une intention claire (`Caracteristiques`, `Bloc ressources`, etc.).
- Garder les styles legers: bordure + fond suffisent dans la majorite des cas.

## Checklist QA (container)

1. Le bloc contient-il de vrais enfants utiles ?
2. Le label est-il explicite ?
3. Le `showIf` est-il correct (si utilise) ?
4. Le rendu est-il lisible avec et sans bordure ?
5. Le fond choisi reste-t-il lisible en theme sombre ?
