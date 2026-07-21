# Journal des versions — NC.chess

Toutes les évolutions notables de l'application sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et le versionnage suit [SemVer](https://semver.org/lang/fr/) :
`MAJEUR.MINEUR.CORRECTIF`.

La version affichée dans l'app (sidebar + Réglages → À propos) provient de
`package.json`.

## [0.0.3] — 2026-07-21

### Ajouté
- **Vraies demandes d'ami** : distinction entre amis « en attente » et
  « confirmés ». Une demande envoyée pendant une partie peut être acceptée ou
  refusée en direct par l'adversaire ; les ajouts par code, lien ou pseudo
  restent « en attente » jusqu'à confirmation (première partie ensemble ou
  validation manuelle). Le profil sépare désormais les deux listes.
- **Animation de transition entre les pages** : glissement + fondu au
  changement de menu, que ce soit par glissement tactile ou par clic — au lieu
  d'un changement de page instantané et sec.

### Modifié
- **Refonte de l'écran Analyse (plateau libre & « Et si ? »)** : barre d'outils
  regroupée en icônes lisibles (plus de boutons au texte tronqué), vrai titre de
  page, et panneau « Lignes du moteur » remanié (rang, évaluation colorée,
  meilleure ligne aérée) pour qu'on comprenne enfin ce qu'on regarde.
- **Navigation par glissement moins sensible** : il faut désormais un balayage
  franc (environ un tiers de l'écran) pour changer de page, ce qui évite les
  changements accidentels.

### Corrigé
- **Transition de page figée/décalée** sur les écrans lourds (ex. Réglages) :
  le sens de l'animation est calculé au montage, l'animation ne se relance plus
  en plein vol.

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
