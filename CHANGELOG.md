# Journal des versions — NC.chess

Toutes les évolutions notables de l'application sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
et le versionnage suit [SemVer](https://semver.org/lang/fr/) :
`MAJEUR.MINEUR.CORRECTIF`.

La version affichée dans l'app (sidebar + Réglages → À propos) provient de
`package.json`.

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
