# Schuss ! Télé-Marmotte

Un jeu de ski en pixel art, pensé pour le téléphone tenu à la verticale, pour le site de captations **Télé-Marmotte**.

**Jouer : https://telemarmotte.github.io/tele-marmotte-schuss/**

La marmotte de Télé-Marmotte dévale la montagne, caméra embarquée. Elle évite les sapins, les rochers et les autres skieurs, saute sur les tremplins et ramasse les bobines de film.

## Deux façons de jouer

- **Descente** : le plus loin possible, sur une pente sans fin et différente à chaque partie. Après 1000 m, une dameuse descend derrière toi et accélère peu à peu. Elle peut s'esquiver sur le côté, mais elle revient.
- **Slalom** : 30 portes, toujours le même parcours, le plus vite possible. Chaque porte manquée coûte 5 secondes.

Les records sont gardés dans le navigateur.

## Commandes

| | Téléphone | Clavier |
|---|---|---|
| Tourner | poser le doigt là où on veut aller | ← → |
| Tout schuss | doigt juste sous la marmotte | ↓ |
| S'arrêter | doigt au-dessus de la marmotte | ↑ |
| Sauter | touche brève (ou un deuxième doigt) | Espace |
| Figure | toucher à nouveau en l'air (pas trop tard) | Espace |
| Pause | bouton II | Échap |

## Fichiers

- `index.html` : la page, l'affichage façon caméscope et les menus en forfaits de ski
- `js/sprites.js` : les personnages en pixel art (une lettre = une couleur)
- `js/world.js` : la montagne, fabriquée au fur et à mesure, et le parcours de slalom
- `js/game.js` : les règles (glisse, sauts, figures, chutes, dameuse, portes)
- `js/render.js` : le dessin (neige, traces de skis, sapins, dameuse)
- `js/audio.js` : bruitages, moteur de la dameuse et musiques, synthétisés (aucun fichier son)
- `js/main.js` : boucle de jeu, commandes au doigt, écrans et records
- `_dev/` : planche de sprites et essais automatiques

Aucune dépendance, aucun outil de construction : ce sont des fichiers statiques.
