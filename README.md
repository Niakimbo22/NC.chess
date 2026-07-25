# ♞ NC.chess

**Toutes les fonctionnalités premium des échecs, 100 % gratuites.** Une application web complète pour jouer et s'entraîner, sans compte, sans abonnement, sans serveur : tout tourne dans ton navigateur.

## Fonctionnalités

### ♟️ Jouer
- **Contre Néo, la mascotte** : le mode le plus éducatif. Le cavalier doré joue contre toi **et** t'accompagne — 5 niveaux/styles (600 → 2400 Elo), avertissement avant une gaffe (« ça laisse ta dame en prise »), félicitations sur tes bons coups, indice fléché doré et conseils contextuels à la demande.
- **13 IA à personnalités** de 250 à 3200 Elo (Stockfish 18 WASM) : chacune a son style, ses gaffes ou sa précision. Indice, reprise de coup, nulle négociée avec le moteur, revanche, parties classées.
- **Entre amis, sans serveur** : crée un salon, partage le **code à 4 lettres** (ex. `AF3P`) ou le lien d'invitation — connexion directe WebRTC (PeerJS), chat, synchro pendule, revanche, reconnexion automatique.
- **Sur le même écran** : mode « pass and play ».
- **Pendule complète** : bullet / blitz / rapide / classique + cadence 100 % personnalisée (temps + incrément).

### 📊 Analyse illimitée
- Classification de chaque coup (brillant ‼, meilleur ★, excellent, bon, imprécision ?!, erreur ?, gaffe ??), **score de précision**, graphe d'évaluation cliquable, meilleure ligne, barre d'éval.
- Commentaires du **coach en français**, avec lecture vocale.
- Import PGN/FEN, plateau libre avec 3 lignes moteur en continu.

### 🧩 Puzzles
- ~5000 puzzles Lichess réels (CC0) embarqués, du niveau 400 au niveau 3200.
- Entraînement adaptatif avec Elo puzzle, filtre par thème (fourchette, clouage, mat en 2…), indices.
- **Puzzle Rush** (5 min, 3 erreurs) et **puzzle du jour**.

### 🎓 Apprendre
- **Défis de Néo** : 6 modules d'entraînement ciblé (52 exercices) — prendre des pièces, prendre sans risque, donner échec, parer un échec, mat en un, la fourchette. Une compétence à la fois, Néo comme instructeur : consigne, flèche de démonstration, indication à la demande, score par module.
- **9 leçons interactives** avec un coach qui parle : bases, tactiques, finales, ouvertures.
- **Explorateur d'ouvertures** : base ECO complète (3800+ lignes), noms affichés en direct pendant tes parties.

### 🎨 Personnalisation totale
- 10 thèmes d'échiquier, 5 jeux de pièces, 4 packs de sons, volume, animations.
- Pré-coups, auto-promotion, confirmation de coup, coordonnées, flèches et surlignages au clic droit.
- **Barre de relecture** sous l'échiquier (⏮ ◀ ▶ ⏭, flèches du clavier) : revoir le coup de l'adversaire sans rien changer à la partie.
- Roque au geste naturel : le roi se pose sur sa tour, ou sur sa case habituelle.
- Profil local : pseudo, 20 avatars, Elo avec graphe de progression, stats par cadence, historique des parties.
- Néo parle en français clair, jamais en notation brute : « ton fou de c4 prend le cavalier en f7 (Bxf7) ».
- Voix de Néo **coupée par défaut** : elle s'active en un geste, et se règle (voix du système, débit, hauteur, et quand Néo parle).

### 📱 Partout
- **PWA installable**, fonctionne **hors ligne** (sauf multijoueur), interface responsive mobile.

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm test           # tests unitaires (vitest)
npm run build      # build de production (dist/)
```

Déploiement : le build est 100 % statique (`base: './'`, routing en hash) — dépose `dist/` sur n'importe quel hébergeur (GitHub Pages, Vercel, Netlify…).

Multijoueur : la signalisation passe par le broker public PeerJS, puis la partie est en pair-à-pair direct. Pour un broker auto-hébergé : `localStorage['ncchess-peer-server'] = '{"host":"...","port":9000,"path":"/","secure":true}'`.

## Crédits et licences

- **[Stockfish](https://stockfishchess.org/)** 18 (build WASM [stockfish.js](https://github.com/nmrugg/stockfish.js)) — GPL-3.0.
- **[chess.js](https://github.com/jhlywa/chess.js)** — BSD-2-Clause.
- **Pièces** : jeux cburnett, merida, alpha, fresca, pixel issus de [lichess-org/lila](https://github.com/lichess-org/lila) (licences libres, notamment CC BY-SA 3.0 pour cburnett).
- **Sons** : packs standard, piano, futuristic, nes issus de [lichess-org/lila](https://github.com/lichess-org/lila).
- **Puzzles** : [base de puzzles Lichess](https://database.lichess.org/#puzzles) — CC0.
- **Ouvertures** : [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) — CC0.
- **[PeerJS](https://peerjs.com/)** — MIT.

Merci à Lichess pour son écosystème ouvert. ♥
