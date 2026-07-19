import type { Square } from 'chess.js';

export interface LessonStep {
  /** Position de départ de l'étape */
  fen: string;
  /** Ce que dit le coach */
  text: string;
  /** Flèches pédagogiques affichées */
  arrows?: { from: Square; to: Square }[];
  /** Cases surlignées */
  marks?: Square[];
  /** Exercice : l'élève doit jouer un des coups UCI acceptés */
  task?: {
    accepted: string[];
    success: string;
    hint: string;
  };
}

export interface Lesson {
  id: string;
  title: string;
  icon: string;
  category: 'Bases' | 'Tactiques' | 'Finales' | 'Ouvertures';
  description: string;
  steps: LessonStep[];
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const LESSONS: Lesson[] = [
  {
    id: 'centre',
    title: 'Le contrôle du centre',
    icon: '🎯',
    category: 'Bases',
    description: 'Pourquoi les cases centrales gagnent les parties, et comment les occuper.',
    steps: [
      {
        fen: START,
        text: 'Bienvenue ! Les quatre cases centrales — d4, e4, d5 et e5 — sont les plus importantes de l’échiquier. Une pièce placée au centre contrôle beaucoup plus de cases qu’une pièce dans un coin.',
        marks: ['d4', 'e4', 'd5', 'e5'],
      },
      {
        fen: START,
        text: 'Commençons ! Avance ton pion roi de deux cases pour occuper le centre.',
        task: {
          accepted: ['e2e4', 'd2d4'],
          success: 'Parfait ! Ce pion contrôle des cases centrales et libère tes pièces.',
          hint: 'Joue le pion devant ton roi (e2) ou devant ta dame (d2), deux cases en avant.',
        },
      },
      {
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        text: 'Les noirs ont répondu au centre. Développe maintenant ton cavalier vers le centre : il attaquera le pion e5.',
        arrows: [{ from: 'g1', to: 'f3' }],
        task: {
          accepted: ['g1f3'],
          success: 'Excellent ! Le cavalier en f3 contrôle le centre et attaque e5. « Un cavalier au bord, c’est un cavalier mort ! »',
          hint: 'Le cavalier g1 saute en f3.',
        },
      },
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        text: 'Continue le développement : sors ton fou de roi sur une diagonale active.',
        task: {
          accepted: ['f1c4', 'f1b5'],
          success: 'Très bien ! En c4 le fou vise f7, le point faible des noirs. En b5, il attaque le cavalier : les deux sont d’excellents coups.',
          hint: 'Le fou f1 peut aller en c4 (l’Italienne) ou en b5 (l’Espagnole).',
        },
      },
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        text: 'Dernière étape des principes : mets ton roi à l’abri. Fais le petit roque !',
        task: {
          accepted: ['e1g1'],
          success: 'Roi en sécurité, tour activée : tu as réussi une ouverture parfaite. 👑',
          hint: 'Fais glisser le roi de deux cases vers la tour h1.',
        },
      },
      {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 b kq - 5 4',
        text: 'Retiens la recette : 1) un pion au centre, 2) cavaliers puis fous développés vers le centre, 3) roque rapide. Avec ça, tu ne rateras plus jamais ton début de partie !',
      },
    ],
  },
  {
    id: 'fourchette',
    title: 'La fourchette',
    icon: '🍴',
    category: 'Tactiques',
    description: 'Attaquer deux pièces à la fois : l’arme tactique numéro un.',
    steps: [
      {
        fen: '2r1k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
        text: 'Une fourchette, c’est un coup qui attaque deux cibles en même temps : l’adversaire ne peut en sauver qu’une. Le cavalier est le champion des fourchettes. Trouve la « fourchette royale » : échec au roi + attaque de la tour !',
        task: {
          accepted: ['e4d6'],
          success: 'Fourchette royale ! Le roi doit s’écarter, et tu captures la tour c8 au prochain coup. 🍴',
          hint: 'Cherche la case d’où le cavalier attaque à la fois e8 et c8…',
        },
      },
      {
        fen: '4k3/8/8/2b1n3/8/3P4/8/4K3 w - - 0 1',
        text: 'Même le petit pion sait fourchetter ! Trouve le coup de pion qui attaque deux pièces d’un coup.',
        task: {
          accepted: ['d3d4'],
          success: 'Bravo ! Le pion d4 attaque le fou c5 ET le cavalier e5. Une pièce va tomber.',
          hint: 'Avance le pion d3 : regarde ses deux diagonales d’attaque.',
        },
      },
      {
        fen: '6k1/8/8/r7/8/8/8/3Q2K1 w - - 0 1',
        text: 'La dame aussi adore les doubles attaques. Trouve la case d’où elle donne échec ET attaque la tour noire.',
        task: {
          accepted: ['d1d5'],
          success: 'Superbe ! Échec en d5 : le roi doit réagir, et la tour a5 est perdue.',
          hint: 'Cherche une case sur la diagonale du roi ET sur la rangée de la tour.',
        },
      },
      {
        fen: '6k1/8/8/3Q4/8/8/8/6K1 b - - 1 1',
        text: 'Règle d’or : avant chaque coup, regarde si une de tes pièces peut attaquer deux cibles à la fois — roi, dame, tours ou pièces non défendues. Les fourchettes gagnent des parties à tous les niveaux !',
      },
    ],
  },
  {
    id: 'clouage',
    title: 'Le clouage',
    icon: '📌',
    category: 'Tactiques',
    description: 'Immobiliser une pièce adverse derrière une cible plus précieuse.',
    steps: [
      {
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
        text: 'Clouer, c’est attaquer une pièce qui ne peut pas bouger sans exposer une cible plus importante derrière elle. Cloue le cavalier f6 contre la dame d8 !',
        task: {
          accepted: ['c1g5'],
          success: 'Le cavalier f6 est cloué : s’il bouge, la dame d8 tombe. Il est paralysé !',
          hint: 'Ton fou de dame peut viser la diagonale h4-d8…',
        },
      },
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        text: 'Voici le clouage le plus célèbre des ouvertures. Cloue le cavalier c6 contre le roi : c’est un clouage « absolu » — bouger serait illégal !',
        task: {
          accepted: ['f1b5'],
          success: 'C’est l’Espagnole ! Le cavalier c6 est cloué contre le roi : il ne peut légalement plus bouger.',
          hint: 'Le fou f1 vise b5, sur la diagonale du roi e8.',
        },
      },
      {
        fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
        text: 'Ici, c’est TON cavalier f3 qui est cloué par le fou g4 : il défend… mais ne menace plus rien. Retiens : une pièce clouée est une mauvaise défenseuse, et on peut souvent l’attaquer une deuxième fois pour la gagner.',
        marks: ['f3', 'g4'],
      },
    ],
  },
  {
    id: 'couloir',
    title: 'Le mat du couloir',
    icon: '🚪',
    category: 'Tactiques',
    description: 'Le mat le plus fréquent : un roi enfermé derrière ses propres pions.',
    steps: [
      {
        fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
        text: 'Regarde le roi noir : ses trois pions le protègent… mais l’enferment aussi ! Sa première rangée est un couloir sans sortie. Profite-en !',
        task: {
          accepted: ['e1e8'],
          success: 'Échec et mat ! Le roi est bloqué par ses propres pions. C’est le fameux « mat du couloir ».',
          hint: 'Ta tour peut envahir la dernière rangée…',
        },
      },
      {
        fen: '4r1k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
        text: 'Maintenant, défends-toi ! Les noirs menacent Te1 mat. Donne une « fenêtre » d’évasion à ton roi.',
        task: {
          accepted: ['h2h3', 'g2g3', 'h2h4', 'g2g4', 'f2f3', 'f2f4'],
          success: 'Bien vu ! On appelle ça « faire un luft » : ton roi a maintenant une case de fuite, plus de mat du couloir possible.',
          hint: 'Avance un des pions devant ton roi pour lui ouvrir une porte.',
        },
      },
      {
        fen: '6k1/5ppp/8/8/8/7P/5PP1/6K1 b - - 0 1',
        text: 'Réflexe à retenir : dès que les tours et dames adverses rôdent, vérifie ta dernière rangée. Un petit coup de pion peut sauver la partie — et l’oublier peut la perdre en un coup !',
      },
    ],
  },
  {
    id: 'mat-dame',
    title: 'Mater avec la dame',
    icon: '👸',
    category: 'Finales',
    description: 'La technique pour finir un roi seul avec ta dame, sans pat !',
    steps: [
      {
        fen: '7k/8/6K1/8/8/8/8/Q7 w - - 0 1',
        text: 'Roi + dame contre roi seul : la méthode, c’est d’enfermer le roi au bord, d’approcher ton roi… puis de mater. Ici tout est prêt : trouve le mat en un coup !',
        task: {
          accepted: ['a1a8'],
          success: 'Échec et mat ! La dame contrôle toute la rangée, et ton roi garde les cases de fuite. Travail d’équipe !',
          hint: 'La dernière rangée n’est défendue par personne…',
        },
      },
      {
        fen: 'k7/8/1K6/8/8/8/8/6Q1 w - - 0 1',
        text: 'Encore un ! Ton roi contrôle déjà les cases de fuite du coin. À toi de conclure.',
        task: {
          accepted: ['g1g8'],
          success: 'Mat ! Dame et roi qui coopèrent : c’est imparable.',
          hint: 'Vise la dernière rangée : ton roi couvre déjà a7 et b7.',
        },
      },
      {
        fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1',
        text: 'ATTENTION AU PAT ! Si le roi adverse n’a aucun coup légal mais n’est PAS en échec, c’est nulle… Ici, ne joue surtout pas Db6 ni Dc2 : le roi n’aurait plus de case. Garde toujours une case libre pour le roi ennemi tant que ce n’est pas mat. Retiens : la dame s’arrête à distance de cavalier du roi, et c’est ton roi qui vient aider pour le mat final.',
        marks: ['a8', 'b8', 'a7', 'b7'],
      },
    ],
  },
  {
    id: 'mat-tour',
    title: 'Mater avec la tour',
    icon: '🏰',
    category: 'Finales',
    description: 'Roi + tour contre roi : l’escorte royale qui pousse au bord.',
    steps: [
      {
        fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1',
        text: 'Avec une tour, le mat se fait toujours au bord, les deux rois face à face. C’est exactement la situation ici : conclus !',
        task: {
          accepted: ['a1a8'],
          success: 'Échec et mat ! Ton roi bloque toutes les cases de fuite, la tour donne le coup final.',
          hint: 'Ton roi fait face au roi ennemi : la tour peut frapper sur la dernière rangée.',
        },
      },
      {
        fen: '8/4k3/8/4K3/8/7R/8/8 w - - 0 1',
        text: 'Quand les rois se font face, la tour donne échec pour repousser le roi ennemi d’une rangée. Repousse-le vers le bord !',
        task: {
          accepted: ['h3h7'],
          success: 'Parfait ! Échec : le roi noir doit reculer vers la 8e rangée. On répète le procédé jusqu’au mat du bord.',
          hint: 'Un échec de tour sur la rangée du roi le force à reculer.',
        },
      },
      {
        fen: '3k4/7R/4K3/8/8/8/8/8 b - - 0 1',
        text: 'La méthode complète : 1) coupe le roi avec la tour, 2) approche ton roi jusqu’à l’opposition, 3) échec de tour pour le faire reculer, 4) recommence jusqu’à la dernière rangée. Simple, mécanique, imparable.',
      },
    ],
  },
  {
    id: 'promotion',
    title: 'La promotion',
    icon: '🎖️',
    category: 'Finales',
    description: 'Transformer un petit pion en dame… ou mieux encore en cavalier !',
    steps: [
      {
        fen: '8/P4k2/8/8/8/8/8/4K3 w - - 0 1',
        text: 'Un pion qui atteint la dernière rangée se transforme en la pièce de ton choix — presque toujours une dame. Vas-y, couronne ton pion !',
        task: {
          accepted: ['a7a8q'],
          success: 'Une nouvelle dame ! Passer d’un pion à une dame, c’est le plus grand gain de matériel du jeu.',
          hint: 'Avance le pion a7 et choisis la dame.',
        },
      },
      {
        fen: '8/2q1P1k1/8/8/8/8/8/4K3 w - - 0 1',
        text: 'Mais parfois la dame n’est PAS le meilleur choix ! Ici, promouvoir en dame laisserait la dame noire en jeu. Trouve la « sous-promotion » magique qui gagne la dame noire !',
        task: {
          accepted: ['e7e8n'],
          success: 'Promotion en CAVALIER, échec… et fourchette sur le roi et la dame ! Le coup le plus stylé des échecs. 🐴',
          hint: 'Quelle pièce donnerait échec en e8 tout en attaquant la dame c7 ? Pense à la fourchette…',
        },
      },
      {
        fen: '4N3/2q3k1/8/8/8/8/8/4K3 b - - 0 1',
        text: 'Retiens : chaque pion passé est une future dame. En finale, escorte tes pions passés avec ton roi — et n’oublie pas que le cavalier peut faire des miracles à la promotion !',
      },
    ],
  },
  {
    id: 'enfilade',
    title: 'L’enfilade',
    icon: '🎣',
    category: 'Tactiques',
    description: 'Le clouage inversé : la grosse pièce devant, le butin derrière.',
    steps: [
      {
        fen: '4r3/8/8/4k3/8/8/8/R5K1 w - - 0 1',
        text: 'L’enfilade, c’est un clouage à l’envers : on attaque une grosse pièce qui, en s’écartant, laisse prendre celle qui est derrière. Ici, roi et tour noirs sont alignés sur la colonne e… Profite !',
        task: {
          accepted: ['a1e1'],
          success: 'Échec ! Le roi doit s’écarter de la colonne… et ta tour capturera la tour e8. Enfilade parfaite.',
          hint: 'Mets ta tour sur la colonne où le roi et la tour noire sont alignés.',
        },
      },
      {
        fen: '7q/8/5k2/8/8/8/3B4/4K3 w - - 0 1',
        text: 'Le fou aussi enfile ! Le roi f6 et la dame h8 partagent la grande diagonale. Attaque le roi : la dame tombera.',
        task: {
          accepted: ['d2c3'],
          success: 'Échec sur la diagonale ! Où que le roi aille, tu captures la dame h8 au coup suivant. Et si la dame s’interpose, tu la prends aussi !',
          hint: 'Amène le fou sur la grande diagonale a1-h8, celle du roi et de la dame.',
        },
      },
      {
        fen: '3B3k/8/8/8/8/8/8/4K3 b - - 0 1',
        text: 'Pour repérer les enfilades : cherche les alignements roi-dame, roi-tour ou dame-tour adverses. Une pièce à longue portée (dame, tour, fou) transforme ces alignements en butin !',
      },
    ],
  },
  {
    id: 'principes',
    title: 'Punir les fautes d’ouverture',
    icon: '⚖️',
    category: 'Ouvertures',
    description: 'Que faire quand l’adversaire sort sa dame trop tôt ? Le punir !',
    steps: [
      {
        fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
        text: 'Ton adversaire a sorti sa dame dès le 2e coup pour tenter le « mat du berger ». Erreur ! Développe une pièce EN GAGNANT DU TEMPS : défends e5 avec ton cavalier.',
        task: {
          accepted: ['b8c6'],
          success: 'Parfait : tu développes ET tu défends e5. La dame blanche, elle, n’a rien accompli.',
          hint: 'Quel cavalier peut défendre le pion e5 en se développant ?',
        },
      },
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
        text: 'Attention ! Le fou c4 et la dame h5 visent tous les deux f7 : c’est la menace de mat du berger. Trouve LE coup qui pare le mat en attaquant la dame !',
        task: {
          accepted: ['g7g6'],
          success: 'Excellent ! g6 bloque la diagonale ET attaque la dame : elle doit encore perdre un temps. Tu domines déjà le développement.',
          hint: 'Un petit coup de pion qui touche la dame et ferme la route vers f7…',
        },
      },
      {
        fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
        text: 'Moralité : ne sors pas ta dame trop tôt, et si l’adversaire le fait, développe-toi en l’attaquant. Chaque coup de dame adverse te fait gagner un temps de développement gratuit. La punition est automatique !',
      },
    ],
  },
];
