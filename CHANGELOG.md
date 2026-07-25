# Journal des versions — NC.chess

Toutes les évolutions notables de l'application sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et le versionnage suit [SemVer](https://semver.org/lang/fr/) :
`MAJEUR.MINEUR.CORRECTIF`.

La version affichée dans l'app (sidebar + Réglages → À propos) provient de
`package.json`.

## [0.2.4] — 2026-07-25

### Corrigé
- **Le roque ne marchait pas.** Poser le roi sur sa tour — le geste de
  l’échiquier réel, celui qu’accepte chess.com — ne faisait que sélectionner la
  tour : le roque paraissait tout bonnement cassé. Le roi accepte désormais
  `h1`/`h8` (petit roque) et `a1`/`a8`, `b1`/`b8` (grand roque) en plus de sa case
  officielle `g`/`c`, au clic comme au glisser. Un **anneau doré sur la tour**
  annonce le geste quand le roi est sélectionné. `d1`/`d8` reste un vrai coup de
  roi (Rd1), il n’est pas détourné.
- **Un coup joué pendant qu’on regarde en arrière ne ramène plus au direct.** La
  réponse de l’adversaire téléportait à la position courante, en plein milieu de
  la relecture.

### Ajouté
- **Barre de relecture sous l’échiquier**, dans les quatre modes de jeu : `⏮ ◀`
  le coup regardé `▶ ⏭`. Revoir le coup de l’adversaire redevient un geste d’une
  seconde, sans ouvrir le tiroir « Coups & options » et sans rien changer à la
  partie — la pendule tourne, l’adversaire joue, seul l’affichage recule. La
  barre se teinte d’or en revue et `⏭` ramène au direct. Au clavier :
  **← →**, **Début**, **Fin**.
- **Réglages → Voix de Néo** : choix de **quand** Néo parle (« seulement quand ça
  compte » ou « tout lire à voix haute »), curseurs de **débit** et de **hauteur**,
  boutons **Écouter / Stop**. Les réglages restent accessibles même sans voix
  française installée.

### Changé
- **La voix de Néo est coupée par défaut**, y compris pour ceux qui l’avaient
  déjà subie (les réglages existants sont migrés). Elle ne vient pas de NC.chess
  mais du moteur de synthèse de l’appareil : l’imposer d’office était le meilleur
  moyen de rendre l’app pénible. Elle se rallume en un geste — Réglages ou bouton
  🔊 en pleine partie — et dit alors un mot de confirmation (ce qui, au passage,
  déverrouille la synthèse sur iOS).
- **Néo se tait sauf quand ça compte** : par défaut, seuls l’avertissement avant
  une gaffe, le conseil demandé et la fin de partie sont lus. Leçons, défis et
  petites phrases d’ambiance restent écrits — et les boutons 🔊 les lisent à la
  demande.
- **Plus de variation aléatoire de débit et de hauteur** entre les phrases : elle
  sonnait « ivre » plutôt qu’humaine. Le débit et la hauteur sont désormais
  constants et réglables.

## [0.2.3] — 2026-07-25

### Corrigé
- **La partie se bloquait après un retour en arrière.** En revenant en avant
  jusqu’au dernier coup, la partie restait en mode « revue » sur une position
  pourtant identique à la position réelle : l’échiquier ne répondait plus, les
  boutons « Suivant » et « Fin » étaient désactivés (on était déjà au bout) — plus
  aucun moyen de reprendre la main, pendant que la pendule continuait de tourner.
  Le dernier demi-coup est désormais reconnu comme la position courante. Idem en
  touchant le dernier coup dans la liste. Corrigé pour les quatre modes de jeu.
- **Néo prononçait la notation d’échecs telle quelle** : « Regarde plutôt du côté
  de Nxf5 » sortait en « enn iks eff cinq », et dans les Défis « ♖xf5 est
  correct » devenait « iks eff cinq est correct ». La notation est traduite avant
  lecture : « cavalier prend en f5 », « dame en d1 échec », « petit roque »,
  « le pion e prend en d5 », « en e8 et devient dame ». Les cases citées seules
  (« arrive en e4 ») et le français courant ne sont pas touchés.

### Ajouté
- **Bandeau de revue** au-dessus de l’échiquier dès qu’on regarde un coup passé :
  il indique lequel (« Revue — 4…exd4 »), de combien de coups on est en retard, et
  porte un bouton **« Revenir à la partie »**. Sans lui, la navigation verrouillait
  l’échiquier sans rien dire — et sur mobile la liste des coups vit dans un tiroir,
  donc une fois celui-ci refermé plus rien n’expliquait le blocage.
- **Couper la voix de Néo en un geste**, depuis sa boîte de dialogue en pleine
  partie : le réglage était enterré dans une autre page.
- **Réglages → Coach** : quand la seule voix française du téléphone est une voix
  au timbre plat, l’app le dit et explique comment en installer une autre. Les voix
  viennent du système, pas de NC.chess : autant être clair plutôt que de rejeter
  cette voix en interne tout en la jouant quand même faute de mieux.

### Changé
- Lecture **phrase par phrase**, avec une légère variation de débit et de hauteur
  d’une phrase à l’autre : une longue tirade lue d’un seul souffle est ce qui sonne
  le plus « robot ».

## [0.2.2] — 2026-07-25

### Changé
- **Cadence par défaut : 10 minutes** (modes Néo et IA), au lieu de « sans pendule ».
- **Sélecteur de cadence repensé** : les treize cartes identiques sur deux
  colonnes laissent place à un récapitulatif doré de la cadence choisie, puis
  des pastilles compactes **groupées par famille** (Bullet / Blitz / Rapide /
  Classique) avec le temps en gros et l'incrément en exposant. « Sans pendule »
  devient une option à part entière, et tout tient sans scroller.
- **Blasons des styles de Néo** : les cinq niveaux partageaient le même
  médaillon. Chacun a désormais son identité complète — silhouette, motif de
  fond et métal propres :
  - **Néo Éveil** : cercle cuivré, soleil qui se lève.
  - **Néo Apprenti** : écu arrondi, grand livre ouvert.
  - **Néo Tacticien** : écu pointu, sabres croisés.
  - **Néo Stratège** : hexagone, rose des vents sur trame de plan.
  - **Néo Maître** : cercle d'obsidienne et d'or blanc, couronne sur la tête et
    couronne de laurier.
  Le blason suit le niveau choisi jusque dans la boîte de dialogue en partie.

## [0.2.1] — 2026-07-25

### Changé
- **L'échiquier est la page.** En partie sur mobile, il occupe toute la hauteur
  disponible, centré, et la page ne défile plus. La liste des coups, le nom de
  l'ouverture, la navigation, la reprise, l'abandon et l'accès aux réglages
  sont regroupés dans un **tiroir** qui s'ouvre à la demande (« Coups &
  options »). Appliqué au mode Néo comme aux parties contre une IA.
- **Voix du coach** : les voix de synthèse Google et eSpeak sont désormais
  écartées (timbre monocorde) au profit des voix neurales/premium du système ;
  débit et hauteur légèrement adoucis.
- **Rythme de jeu de l'adversaire** : le temps de réflexion est calculé depuis
  la position (nombre de coups légaux, échec, prises disponibles) suivant une
  loi log-normale, au lieu d'un tirage uniforme. L'adversaire enchaîne sa
  théorie d'ouverture, répond du tac au tac sur un coup forcé, réfléchit
  plusieurs secondes sur une position touffue et accélère en fin de pendule.

### Corrigé
- Néo ne lit plus les emoji à voix haute (« Tu vois loin aujourd'hui. yeux »).
- La carte vedette de l'accueil ne débordait plus son liseré doré sur la page.

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
