import type { Square } from 'chess.js';

// Les « Défis » : des modules d'entraînement ciblés, à la chess.com, mais avec
// Néo comme instructeur. Chaque module isole UNE compétence (prendre une pièce,
// donner échec, mater en un coup…) et l'entraîne sur des positions épurées :
// on voit tout de suite le motif, sans le bruit d'une vraie partie.

export type DrillGoal = 'capture' | 'safe-capture' | 'check' | 'escape' | 'mate' | 'fork';

export interface DrillChallenge {
  /** Position du défi (le trait indique qui doit trouver le coup). */
  fen: string;
  /** Consigne de Néo, affichée dans la bulle. */
  task: string;
  /** Coups UCI acceptés (ex. « c5f5 », « f7f8q »). */
  accepted: string[];
  /** Ce que dit Néo quand c'est réussi. */
  success: string;
  /** Coup de pouce, sur demande ou après une erreur. */
  hint: string;
  /** Flèche de démonstration (on montre l'exemple sur le tout premier défi). */
  demo?: { from: Square; to: Square };
  /** Cases mises en avant par Néo. */
  marks?: Square[];
}

export interface DrillModule {
  id: string;
  title: string;
  icon: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  goal: DrillGoal;
  /** Sous-titre de la carte du menu. */
  summary: string;
  /** Ce que Néo raconte sur l'écran d'introduction. */
  intro: string;
  /** Position d'illustration derrière l'introduction. */
  introFen: string;
  challenges: DrillChallenge[];
}

export const DRILL_MODULES: DrillModule[] = [
  {
    id: 'captures',
    title: 'Prendre des pièces',
    icon: '🎯',
    level: 'Débutant',
    goal: 'capture',
    summary: 'Repère la pièce sans défense et croque-la.',
    intro:
      'Apprends à capturer des pièces. Une pièce que personne ne défend, c’est cadeau — encore faut-il la voir ! On y va doucement, une prise à la fois. ⚡',
    introFen: '4k3/8/8/2R2n2/8/8/8/4K3 w - - 0 1',
    challenges: [
      {
        fen: '4k3/8/8/2R2n2/8/8/8/4K3 w - - 0 1',
        task: 'Le cavalier noir traîne sur ta rangée et personne ne le défend. Allez-y, prends-le.',
        accepted: ['c5f5'],
        success: 'Belle prise ! Une pièce gratuite, ça ne se refuse jamais.',
        hint: 'Ta tour glisse en ligne droite : reste sur la 5e rangée et va jusqu’en f5.',
        demo: { from: 'c5', to: 'f5' },
      },
      {
        fen: '4k3/8/8/r7/8/2B5/8/4K3 w - - 0 1',
        task: 'Quelle pièce peux-tu capturer ?',
        accepted: ['c3a5'],
        success: 'Exactement ! Le fou file sur sa diagonale et empoche la tour.',
        hint: 'Ton fou ne quitte jamais ses diagonales. Suis celle qui monte vers le coin.',
      },
      {
        fen: '4k3/8/3b4/8/4N3/8/8/4K3 w - - 0 1',
        task: 'Le fou noir est à portée de cavalier. À toi.',
        accepted: ['e4d6'],
        success: 'Bien vu ! Le cavalier saute par-dessus tout : il attaque là où on ne l’attend pas.',
        hint: 'Le cavalier bouge en L : deux cases dans une direction, puis une sur le côté.',
      },
      {
        fen: '4k3/8/3r4/8/8/8/8/3QK3 w - - 0 1',
        task: 'Ta dame a une cible bien alignée. Prends-la.',
        accepted: ['d1d6'],
        success: 'Parfait ! La dame combine la tour et le fou : elle voit très loin.',
        hint: 'Regarde la colonne de ta dame : elle est complètement dégagée.',
      },
      {
        fen: '4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1',
        task: 'Même un pion peut capturer. Attrape ce cavalier !',
        accepted: ['e4d5'],
        success: 'Oui ! Le pion avance tout droit… mais il capture en diagonale. Piège classique.',
        hint: 'Le pion prend en biais, d’une seule case, vers l’avant.',
      },
      {
        fen: '7k/8/8/3pK3/8/8/8/8 w - - 0 1',
        task: 'Ton roi aussi sait se servir ! Ce pion n’est défendu par personne.',
        accepted: ['e5d5'],
        success: 'Le roi est une vraie pièce en finale : une case à la fois, mais dans toutes les directions.',
        hint: 'Le roi se déplace d’une case, y compris en diagonale.',
      },
      {
        fen: '3q3k/8/8/8/8/8/8/3R2K1 w - - 0 1',
        task: 'La dame noire s’est aventurée trop loin. Punis-la.',
        accepted: ['d1d8'],
        success: 'Une dame pour rien ! C’est le genre de coup qui gagne une partie sur place.',
        hint: 'Ta tour et sa dame partagent la même colonne, et la voie est libre.',
      },
      {
        fen: '7k/8/5n2/8/8/8/1B6/K7 w - - 0 1',
        task: 'Ton fou contrôle la grande diagonale. Sers-t’en.',
        accepted: ['b2f6'],
        success: 'La grande diagonale, c’est l’autoroute du fou. Rien ne lui résiste dessus.',
        hint: 'Suis la diagonale de ton fou : b2, c3, d4, e5… et voilà la cible.',
      },
      {
        fen: '4k3/8/8/1p6/8/2N5/8/4K3 w - - 0 1',
        task: 'Un pion noir est resté seul. Ton cavalier peut aller le chercher.',
        accepted: ['c3b5'],
        success: 'Même un pion, ça se prend ! Le matériel se compte, coup après coup.',
        hint: 'Depuis c3, ton cavalier a huit sauts possibles. Un seul atterrit sur une pièce noire.',
      },
      {
        fen: '4k3/8/8/8/2b5/8/8/4KQ2 w - - 0 1',
        task: 'Attention : ce fou attaque ta dame ! Réagis avant qu’il ne soit trop tard.',
        accepted: ['f1c4'],
        success: 'La meilleure défense, c’est la prise ! Tu gagnes un fou au lieu de perdre ta dame.',
        hint: 'Ta dame voit aussi en diagonale : f1, e2, d3… continue.',
      },
    ],
  },
  {
    id: 'safe-captures',
    title: 'Prendre sans risque',
    icon: '🛡️',
    level: 'Débutant',
    goal: 'safe-capture',
    summary: 'Deux prises possibles, une seule est sûre.',
    intro:
      'Prendre, c’est bien. Prendre sans se faire reprendre, c’est mieux ! Avant chaque capture, pose-toi une seule question : « qui défend cette case ? » 🛡️',
    introFen: '3rk3/8/8/8/n2Q4/8/8/6K1 w - - 0 1',
    challenges: [
      {
        fen: '3rk3/8/8/8/n2Q4/8/8/6K1 w - - 0 1',
        task: 'Ta dame peut prendre deux pièces. Une seule est vraiment gratuite : laquelle ?',
        accepted: ['d4a4'],
        success: 'Bien joué ! La tour d8 était défendue par le roi : la prendre aurait coûté ta dame.',
        hint: 'La tour d8 a un garde du corps juste à côté d’elle. Le cavalier, lui, est tout seul.',
        demo: { from: 'd4', to: 'a4' },
        marks: ['d8'],
      },
      {
        fen: '4k3/8/p7/1p1r4/8/2N5/8/4K3 w - - 0 1',
        task: 'Ton cavalier vise le pion b5 et la tour d5. Choisis la prise qui ne coûte rien.',
        accepted: ['c3d5'],
        success: 'Exact : le pion a6 défendait b5 — tu aurais donné un cavalier pour un pion. La tour, elle, était libre.',
        hint: 'Regarde le petit pion noir en a6 : quelle case couvre-t-il ?',
      },
      {
        fen: '1k6/p7/8/8/7K/8/8/R5r1 w - - 0 1',
        task: 'Deux prises pour ta tour. Une seule ne se fait pas reprendre.',
        accepted: ['a1g1'],
        success: 'Parfait ! Le pion a7 est protégé par son roi ; la tour g1, elle, est abandonnée.',
        hint: 'Le roi noir en b8 surveille sa propre rangée. L’autre côté de l’échiquier est désert.',
      },
      {
        fen: '4k3/6p1/1r3p2/8/3B4/8/8/4K3 w - - 0 1',
        task: 'Ton fou a le choix entre la tour et le pion. Sois malin.',
        accepted: ['d4b6'],
        success: 'La tour, évidemment : le pion f6 était tenu par g7, tu y aurais laissé ton fou.',
        hint: 'Un pion qui défend, c’est le pire des gardes du corps pour toi : il vaut trois fois moins que ton fou.',
      },
      {
        fen: '4k3/3b2n1/8/8/6Q1/8/8/6K1 w - - 0 1',
        task: 'Ta dame vise le fou et le cavalier. Un seul est réellement sans défense.',
        accepted: ['g4g7'],
        success: 'Bien vu ! Le fou d7 était collé à son roi. Le cavalier g7, personne ne le regardait.',
        hint: 'Le roi défend toutes les cases qui le touchent. Lesquelles touche-t-il ici ?',
      },
      {
        fen: '4k3/3r4/6n1/8/8/3Q4/8/6K1 w - - 0 1',
        task: 'Ta dame a deux prises. Une seule ne la met pas en danger.',
        accepted: ['d3g6'],
        success: 'Bien vu ! Prendre en d7 aurait coûté ta dame contre une simple tour : le roi reprenait.',
        hint: 'La tour d7 est collée à son roi. Le cavalier g6, lui, n’a personne derrière lui.',
      },
      {
        fen: '4k3/8/5n2/3n4/8/8/8/1b1RK3 w - - 0 1',
        task: 'Ta tour a deux cibles. Prends celle qui n’a pas de garde du corps.',
        accepted: ['d1b1'],
        success: 'Impeccable : le cavalier d5 était protégé par son copain en f6. Le fou b1, lui, était seul.',
        hint: 'Les cavaliers se défendent souvent entre eux. Vérifie si f6 couvre d5…',
      },
      {
        fen: '7k/8/2p5/3pKp2/8/8/8/8 w - - 0 1',
        task: 'Ton roi peut manger un pion. Un seul est vraiment prenable — l’autre est interdit !',
        accepted: ['e5f5'],
        success: 'Exact ! Prendre en d5 était même illégal : le pion c6 le défend, et un roi ne se met jamais en échec.',
        hint: 'Le roi n’a pas le droit d’aller sur une case défendue. Le pion c6 couvre d5.',
      },
    ],
  },
  {
    id: 'checks',
    title: 'Donner échec',
    icon: '⚔️',
    level: 'Débutant',
    goal: 'check',
    summary: 'Attaque le roi adverse avec chaque pièce.',
    intro:
      'L’échec, c’est une attaque contre le roi : l’adversaire est obligé d’y répondre immédiatement. Apprends à en donner avec toutes tes pièces. ⚔️',
    introFen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    challenges: [
      {
        fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
        task: 'Donne échec au roi noir avec ta tour.',
        accepted: ['a1a8'],
        success: 'Échec ! La tour attaque toute la rangée : le roi doit réagir tout de suite.',
        hint: 'Monte ta tour tout en haut de sa colonne : elle balaiera la 8e rangée.',
        demo: { from: 'a1', to: 'a8' },
      },
      {
        fen: '4k3/8/8/8/8/8/4B3/4K3 w - - 0 1',
        task: 'À toi de trouver un échec avec le fou. Il y a deux solutions !',
        accepted: ['e2b5', 'e2h5'],
        success: 'Échec en diagonale ! Le fou frappe de loin, sans jamais s’approcher.',
        hint: 'Cherche une diagonale qui finit exactement sur la case e8.',
      },
      {
        fen: '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
        task: 'Le cavalier peut donner échec de deux endroits. Trouves-en un.',
        accepted: ['e4d6', 'e4f6'],
        success: 'Échec au cavalier ! Impossible de bloquer un cavalier : il saute par-dessus tout.',
        hint: 'De quelles cases un cavalier attaque-t-il e8 ? Elles sont juste devant le roi, en biais.',
      },
      {
        fen: '4k3/8/2KP4/8/8/8/8/8 w - - 0 1',
        task: 'Même un pion peut faire trembler un roi. Donne échec !',
        accepted: ['d6d7'],
        success: 'Échec au pion ! Et ton roi le défend : impossible de le capturer.',
        hint: 'Avance ton pion d’une case : il attaquera alors les deux cases en diagonale devant lui.',
      },
      {
        fen: '4k3/8/8/8/8/8/8/6RK w - - 0 1',
        task: 'Ta tour a deux façons de donner échec. Choisis-en une.',
        accepted: ['g1g8', 'g1e1'],
        success: 'Bien ! La tour attaque en ligne : par la rangée du roi, ou par sa colonne.',
        hint: 'Une tour donne échec depuis la colonne du roi… ou depuis sa rangée.',
      },
      {
        fen: '4k3/8/8/8/8/8/8/3Q2K1 w - - 0 1',
        task: 'La dame a plusieurs échecs disponibles. Trouves-en un.',
        accepted: ['d1d8', 'd1e1', 'd1e2', 'd1a4', 'd1h5'],
        success: 'Échec à la dame ! Colonnes, rangées, diagonales : elle attaque dans les huit directions.',
        hint: 'Pense « tour » (colonne e, rangée 8) et « fou » (les diagonales qui aboutissent en e8).',
      },
      {
        fen: '4k3/1r6/8/8/4B3/8/8/4R1K1 w - - 0 1',
        task: 'Ta tour e1 est cachée derrière ton fou. Bouge le fou pour découvrir l’échec… en gagnant du matériel !',
        accepted: ['e4b7'],
        success: 'Échec à la découverte ! Le fou part avec la tour noire, et c’est ta tour e1 qui donne échec. Redoutable.',
        hint: 'Trouve la case où ton fou capture quelque chose tout en libérant la colonne e.',
        marks: ['e1', 'e8'],
      },
      {
        fen: '4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 1',
        task: 'Le must : l’ÉCHEC DOUBLE. Trouve le coup de fou qui donne échec ET démasque ta tour.',
        accepted: ['e2b5', 'e2h5'],
        success: 'Échec double ! Deux attaquants d’un coup : le roi n’a plus qu’à fuir, rien ne peut parer.',
        hint: 'Il faut que le fou donne échec LUI AUSSI en quittant la colonne e. Vise la diagonale qui touche e8.',
      },
    ],
  },
  {
    id: 'escape',
    title: 'Parer un échec',
    icon: '🚨',
    level: 'Débutant',
    goal: 'escape',
    summary: 'Fuir, capturer ou s’interposer : les trois réflexes.',
    intro:
      'Quand ton roi est en échec, tu n’as que trois options : le déplacer, capturer l’attaquant, ou t’interposer. Entraînons les trois — et surtout, apprends à choisir la meilleure. 🚨',
    introFen: '4k3/8/8/8/8/8/4r3/4K3 w - - 0 1',
    challenges: [
      {
        fen: '4k3/8/8/8/8/8/4r3/4K3 w - - 0 1',
        task: 'Échec ! Cette tour n’est défendue par personne : ton roi peut se servir.',
        accepted: ['e1e2'],
        success: 'Option n°2 : capturer l’attaquant. Plus d’échec, et une tour en plus !',
        hint: 'Ton roi touche la tour. Et si personne ne la défend…',
        demo: { from: 'e1', to: 'e2' },
      },
      {
        fen: '4k3/8/8/8/8/3n4/2P5/4K3 w - - 0 1',
        task: 'Échec du cavalier ! Élimine-le avec ton pion.',
        accepted: ['c2d3'],
        success: 'Bien joué : contre un cavalier, on ne peut pas s’interposer. Fuir ou capturer, c’est tout !',
        hint: 'Ton pion c2 capture en diagonale. Que trouve-t-il en d3 ?',
      },
      {
        fen: '4k3/8/8/8/1b6/8/2P1P3/4K3 w - - 0 1',
        task: 'Le fou b4 donne échec en diagonale. Coupe-lui la route avec un pion.',
        accepted: ['c2c3'],
        success: 'Option n°3 : l’interposition ! Et bonus, ton pion attaque le fou au passage.',
        hint: 'La diagonale du fou passe par c3 et d2. Quel pion peut occuper une de ces cases ?',
      },
      {
        fen: '4k3/8/8/8/7b/8/8/4K2R w - - 0 1',
        task: 'Échec du fou h4. Ta tour peut régler le problème définitivement.',
        accepted: ['h1h4'],
        success: 'Capture propre : la colonne h était grande ouverte pour ta tour.',
        hint: 'Ta tour et le fou noir sont sur la même colonne, sans rien entre eux.',
      },
      {
        fen: '4k3/8/8/q7/8/8/8/R3K3 w - - 0 1',
        task: 'La dame noire donne échec depuis a5. Ne fuis pas : punis-la !',
        accepted: ['a1a5'],
        success: 'Une dame gratuite ! Avant de bouger ton roi, vérifie toujours si tu peux prendre l’attaquant.',
        hint: 'Ta tour est sur la colonne a. La dame aussi…',
      },
      {
        fen: '4k3/8/8/8/8/8/8/R2K3r w - - 0 1',
        task: 'Échec de la tour h1 sur la 1re rangée. Ton roi doit quitter cette rangée.',
        accepted: ['d1c2', 'd1d2', 'd1e2'],
        success: 'Option n°1 : fuir. Et attention — glisser en c1 était illégal : on reste dans la ligne de tir !',
        hint: 'Rester sur la rangée 1 ne sert à rien : la tour la balaie entièrement. Monte d’un cran.',
      },
      {
        fen: '4k3/8/8/8/8/8/3q4/4K3 w - - 0 1',
        task: 'La dame noire s’est collée à ton roi… et personne ne la défend.',
        accepted: ['e1d2'],
        success: 'Croquée ! Une dame qui s’approche sans protection, c’est un cadeau.',
        hint: 'Ton roi capture comme il se déplace : une case, dans n’importe quelle direction.',
      },
      {
        fen: '4k3/8/8/8/1b6/8/2N5/4K3 w - - 0 1',
        task: 'Échec du fou. Ton cavalier peut sauter dessus.',
        accepted: ['c2b4'],
        success: 'Excellent réflexe : capturer l’attaquant règle l’échec ET gagne une pièce.',
        hint: 'Depuis c2, ton cavalier atteint b4 en un saut.',
      },
    ],
  },
  {
    id: 'mate1',
    title: 'Mat en un coup',
    icon: '👑',
    level: 'Intermédiaire',
    goal: 'mate',
    summary: 'Le coup qui termine la partie. Trouve-le.',
    intro:
      'C’est le but du jeu : le roi attaqué, sans aucune échappatoire. Ici, un seul coup suffit à chaque fois. Vérifie bien les trois issues : fuir, capturer, bloquer. 👑',
    introFen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
    challenges: [
      {
        fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
        task: 'Le roi noir est enfermé par ses propres pions. Termine !',
        accepted: ['e1e8'],
        success: 'Le mat du couloir ! Le classique le plus rentable de tous les échecs.',
        hint: 'La dernière rangée n’est défendue par personne, et les pions bloquent la sortie.',
        demo: { from: 'e1', to: 'e8' },
      },
      {
        fen: '6k1/8/6K1/8/8/8/8/Q7 w - - 0 1',
        task: 'Ton roi tient déjà les cases de fuite. À ta dame de conclure.',
        accepted: ['a1a8', 'a1g7'],
        success: 'Mat ! Dame + roi, c’est l’équipe la plus efficace de l’échiquier.',
        hint: 'Amène la dame sur la 8e rangée : ton roi couvre déjà f7, g7 et h7.',
      },
      {
        fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
        task: 'Le roi noir est étouffé par ses propres pièces. Le cavalier peut frapper.',
        accepted: ['g5f7'],
        success: 'Mat étouffé ! Le roi est prisonnier de sa tour et de ses pions : personne ne peut prendre le cavalier.',
        hint: 'Trouve la case d’où ton cavalier attaque h8 sans pouvoir être capturé.',
      },
      {
        fen: '6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1',
        task: 'Même idée qu’au premier défi, mais avec ta dame.',
        accepted: ['d1d8'],
        success: 'Mat du couloir à la dame ! Toujours vérifier la dernière rangée adverse.',
        hint: 'La 8e rangée est vide et personne ne la surveille.',
      },
      {
        fen: '7k/R7/8/8/8/8/8/1R4K1 w - - 0 1',
        task: 'Deux tours, c’est l’escalier. Monte la seconde et conclus.',
        accepted: ['b1b8'],
        success: 'Le mat de l’escalier ! Une tour coupe la 7e rangée, l’autre donne le mat sur la 8e.',
        hint: 'La tour a7 interdit déjà toute la 7e rangée. Il ne manque que la 8e.',
      },
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
        task: 'Ton fou et ta dame visent tous les deux le même point faible. Frappe !',
        accepted: ['f3f7'],
        success: 'Le mat du berger ! f7 est le point le plus fragile du camp noir en début de partie.',
        hint: 'Quelle case noire n’est défendue que par le roi ? Et qui la défend de ton côté ?',
      },
      {
        fen: '6k1/5ppp/8/8/8/8/r4PPP/6K1 b - - 0 1',
        task: 'Trait aux Noirs : à toi de trouver le mat cette fois.',
        accepted: ['a2a1'],
        success: 'Mat du couloir, version noire. Ça marche exactement pareil dans les deux camps !',
        hint: 'Descends ta tour sur la rangée où le roi blanc est enfermé par ses pions.',
      },
      {
        fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1',
        task: 'Ton cavalier couvre déjà g8 et h7. Amène la tour au contact.',
        accepted: ['b7h7'],
        success: 'Le mat arabe ! Tour + cavalier : la tour touche le roi, le cavalier la défend.',
        hint: 'Pose ta tour juste à côté du roi : le cavalier f6 la protège.',
      },
      {
        fen: '4k3/8/4K3/8/8/8/8/7R w - - 0 1',
        task: 'Les deux rois se font face : c’est la position idéale. Conclus avec la tour.',
        accepted: ['h1h8'],
        success: 'Mat du bord ! Ton roi contrôle les trois cases de fuite, la tour donne le coup final.',
        hint: 'Ton roi en e6 interdit d7, e7 et f7. Il ne reste que la 8e rangée à couvrir.',
      },
      {
        fen: '7k/8/5N2/8/8/8/3Q4/6K1 w - - 0 1',
        task: 'Le cavalier f6 tient déjà g8 et h7. Trouve la case de ta dame.',
        accepted: ['d2h6'],
        success: 'Mat ! La dame arrive au contact, protégée à distance par le cavalier. Duo imparable.',
        hint: 'Cherche une case d’où ta dame attaque h8 ET g7, sans pouvoir être prise.',
      },
    ],
  },
  {
    id: 'forks',
    title: 'La fourchette',
    icon: '🍴',
    level: 'Intermédiaire',
    goal: 'fork',
    summary: 'Attaque deux pièces à la fois : une seule pourra fuir.',
    intro:
      'Une fourchette, c’est un coup qui attaque deux cibles en même temps. L’adversaire ne peut en sauver qu’une : l’autre est à toi. Le cavalier adore ça, mais tout le monde sait le faire. 🍴',
    introFen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
    challenges: [
      {
        fen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
        task: 'Trouve la « fourchette royale » : échec au roi ET attaque de la tour.',
        accepted: ['e4d6'],
        success: 'Fourchette royale ! Le roi doit bouger, et la tour tombe au coup suivant.',
        hint: 'Cherche la case d’où ton cavalier vise à la fois e8 et c8.',
        demo: { from: 'e4', to: 'd6' },
      },
      {
        fen: '6k1/8/8/3q3N/8/8/8/6K1 w - - 0 1',
        task: 'Roi et dame noirs sont à portée de cavalier. Trouve la case magique.',
        accepted: ['h5f6'],
        success: 'Échec + attaque de la dame ! Le roi part, tu croques la dame. Cauchemar absolu pour les noirs.',
        hint: 'Une seule case attaque g8 et d5 en même temps. Approche-toi du roi.',
      },
      {
        fen: 'r3r1k1/8/8/1N6/8/8/8/6K1 w - - 0 1',
        task: 'Deux tours alignées sur la 8e rangée… Ton cavalier peut les servir toutes les deux.',
        accepted: ['b5c7'],
        success: 'Double attaque sur les deux tours ! Une seule pourra s’échapper.',
        hint: 'Trouve la case d’où ton cavalier attaque a8 et e8 simultanément.',
      },
      {
        fen: '5r1k/8/8/8/5N2/8/8/6K1 w - - 0 1',
        task: 'Le roi h8 et la tour f8 sont bien placés… pour toi. Fourchette !',
        accepted: ['f4g6'],
        success: 'Échec et attaque de la tour : le cavalier repart avec du matériel.',
        hint: 'Approche-toi : quelle case attaque à la fois h8 et f8 ?',
      },
      {
        fen: '3q3k/8/8/6N1/8/8/8/6K1 w - - 0 1',
        task: 'La dame noire est loin de son roi. Trouve la fourchette gagnante.',
        accepted: ['g5f7'],
        success: 'Échec au roi et attaque de la dame ! Le cavalier vaut de l’or dans ces positions.',
        hint: 'La case cherchée attaque h8 et d8. Elle est juste devant le roi.',
      },
      {
        fen: '4k3/8/8/2b1n3/8/3P4/8/4K3 w - - 0 1',
        task: 'Même un pion sait fourchetter. Attaque le fou ET le cavalier d’un coup.',
        accepted: ['d3d4'],
        success: 'Fourchette de pion ! Le plus petit attaque les plus gros : une pièce va tomber.',
        hint: 'Avance ton pion d’une case et regarde ses deux diagonales d’attaque.',
      },
      {
        fen: '6k1/8/8/r7/8/8/8/3Q2K1 w - - 0 1',
        task: 'Ta dame peut donner échec tout en attaquant la tour a5.',
        accepted: ['d1d5'],
        success: 'Double attaque à la dame ! Elle donne échec en diagonale et vise la tour sur la rangée.',
        hint: 'Cherche une case qui est à la fois sur la diagonale du roi g8 et sur la 5e rangée.',
      },
      {
        fen: '6k1/8/8/8/8/1b6/8/3Q2K1 w - - 0 1',
        task: 'Le fou b3 est sans défense. Trouve l’échec qui l’attaque aussi.',
        accepted: ['d1d5'],
        success: 'Deux diagonales d’un coup : échec sur le roi, et le fou est perdu.',
        hint: 'Une case sur la diagonale d5-g8 et sur la diagonale d5-b3 à la fois…',
      },
    ],
  },
];

export function getDrillModule(id: string): DrillModule | undefined {
  return DRILL_MODULES.find((m) => m.id === id);
}
