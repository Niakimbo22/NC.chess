# Journal des versions — NC.chess

Toutes les évolutions notables de l'application sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et le versionnage suit [SemVer](https://semver.org/lang/fr/) :
`MAJEUR.MINEUR.CORRECTIF`.

La version affichée dans l'app (sidebar + Réglages → À propos) provient de
`package.json`.

## [0.2.0] — 2026-07-24

### Ajouté
- **Mode « Défis »** (`/drills`) : l'entraînement ciblé, une compétence à la
  fois, avec Néo comme instructeur. **6 modules, 52 exercices** :
  - 🎯 **Prendre des pièces** (10), 🛡️ **Prendre sans risque** (8),
    ⚔️ **Donner échec** (8), 🚨 **Parer un échec** (8),
    👑 **Mat en un coup** (10), 🍴 **La fourchette** (8).
  - Écran d'accueil de module : Néo présente la compétence sur une position
    d'exemple avant de lancer la série.
  - À chaque défi : la **consigne de Néo**, le camp au trait, une **flèche de
    démonstration** sur le premier exercice, une **indication** à la demande.
  - Coup juste → pastille verte ✓ sur la case, verdict en notation figurine
    (« ♖xf5 est correct ») et commentaire de Néo. Coup faux → la position
    revient et Néo explique quoi chercher.
  - **Score par module** (réussites du premier coup) mémorisé en local, barre de
    progression sur chaque carte, bilan commenté par Néo en fin de série.
- Entrées vers les Défis depuis l'accueil, la navigation (« 🎯 Défis ») et la
  page Leçons.

### Fiabilité
- Chaque position de défi est **vérifiée par les tests** : coups acceptés légaux,
  flèche de démonstration cohérente, échec uniquement dans le module dédié, mats
  en un exhaustifs, prises sans perte de matériel après reprise.

## [0.1.0] — 2026-07-23

### Ajouté
- **Mode « Jouer contre Néo »** : une partie guidée par la mascotte, le cavalier
  doré, pensée comme le mode le plus éducatif de l'app. Néo joue contre toi tout
  en t'accompagnant en direct :
  - **5 niveaux/styles** de Néo, de « Néo Éveil » (600 Elo, mentor patient qui
    prévient avant chaque erreur) à « Néo Maître » (2400 Elo, aucun filet).
  - **Avertissement pédagogique avant une gaffe** : Néo t'interrompt, explique
    ce qui cloche (« ça laisse ta dame en prise »), propose le meilleur coup, et
    te laisse reprendre ou jouer quand même.
  - **Réactions en direct** : félicitations sur un bon/meilleur coup, petit mot
    sur une imprécision, commentaires quand Néo attaque.
  - **Conseils à la demande** : indice fléché doré sur l'échiquier, ou message
    de conseil contextuel de Néo (ouverture, avantage, finale…), lu à voix haute.
- **Direction artistique dorée** : carte vedette animée du mode Néo, halo doré
  ambiant qui dérive doucement en fond sur toutes les pages (l'app « respire »).

## [0.0.2] — 2026-07-20

### Ajouté
- **Bilan de partie détaillé** : narration complète après analyse (verdict,
  précision commentée, plus grosses erreurs de chaque camp, tournant de la
  partie, points forts/faibles par phase, conseils ciblés) avec moments-clés
  cliquables. Commentaires du coach beaucoup plus explicatifs (ce qui était
  menacé, pourquoi le meilleur coup l'était, valeur perdue en points).
- **Scénarios alternatifs** (« Et si ? ») : depuis n'importe quel coup de la
  revue, rejoue librement une autre suite contre les suggestions du moteur,
  sans toucher à la vraie partie.
- **Système d'amis** : code ami personnel (XXXX-XXXX), ajout par code, lien
  d'invitation ou pseudo ; défi dans un salon privé partagé et déterministe
  (les deux amis se retrouvent sans rééchanger de code) ; ajout d'un adversaire
  en ami directement en fin de partie.
- **Personnalisation du compte** : présentation (bio), titre/flair, bannière
  colorée, drapeau, et une galerie d'avatars élargie.

### Modifié
- **Refonte de l'écran profil** : vraie carte de joueur (bannière + avatar +
  identité) et édition via une modale propre — fini le crayon inline.
- « Réinitialiser ma progression » conserve désormais ton identité (pseudo,
  avatar, personnalisation).

## [0.0.1] — 2026-07-20

Première version suivie. L'application est jouable, déployée et installable.

### Ajouté
- **Jeu complet** : échiquier légal (roque, en passant, promotion), pendule
  avec cadences personnalisées, partie à deux sur le même écran.
- **IA multi-niveaux** : 13 bots à personnalité de 250 à 3200 Elo (Stockfish
  WASM), avec temps de réflexion humain et répliques contextuelles pendant la
  partie.
- **Instinct de prise** des bots faibles : ils gobent une pièce clairement en
  prise mais ratent les combinaisons — un profil d'erreur réaliste.
- **Multijoueur entre amis** en pair-à-pair par code de salon + lien.
- **Analyse** de parties illimitée, **puzzles**, **leçons**, **explorateur
  d'ouvertures**, **coach** vocal.
- **Personnalisation** : thèmes d'échiquier, jeux de pièces, packs de sons,
  profil et Elo local.
- **PWA** installable et hors ligne, logo médaillon doré, bouton « Installer ».
- **Navigation mobile** allégée (barre du bas + feuille « Plus »), déplacement
  entre les menus par glissement, bouton « Inviter un ami ».

### À venir
- Réglage fin des niveaux intermédiaires des bots.
- Nouveaux thèmes et packs de sons.
