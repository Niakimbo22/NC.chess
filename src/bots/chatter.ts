// Répliques des bots : chaque IA « parle » au joueur selon sa personnalité.
// Catégories déclenchées pendant la partie (voir PlayBot.tsx) :
//  start     : début de partie
//  capture   : le bot vient de prendre une pièce
//  check     : le bot met le joueur en échec
//  advantage : le bot mène nettement au matériel
//  trouble   : le joueur prend une pièce / met le bot en échec / le bot est mené
//  win/loss/draw : fin de partie

export type ChatCategory =
  | 'start'
  | 'capture'
  | 'check'
  | 'advantage'
  | 'trouble'
  | 'win'
  | 'loss'
  | 'draw';

type Lines = Partial<Record<ChatCategory, string[]>>;

// Répliques génériques : filet de sécurité quand un bot n'a pas de ligne
// spécifique pour une catégorie.
const GENERIC: Record<ChatCategory, string[]> = {
  start: ['Bonne partie ! 🙂', 'C’est parti !', 'On y va ?'],
  capture: ['Je prends ! 😋', 'Merci pour la pièce.', 'Hop, dans ma poche.'],
  check: ['Échec ! ⚡', 'Attention à ton roi.', 'Échec, on se réveille !'],
  advantage: ['Je me sens bien là. 😎', 'La position me plaît.', 'Ça sent bon pour moi.'],
  trouble: ['Aïe… 😬', 'Ça se complique pour moi.', 'Hmm, bien joué.'],
  win: ['Bien joué à moi ! 🎉', 'GG ! Belle partie.', 'Victoire !'],
  loss: ['Bravo, tu m’as eu. 👏', 'Bien joué, tu mérites la victoire.', 'Chapeau !'],
  draw: ['Match nul, beau combat. 🤝', 'Égalité ! On remet ça ?', 'Partie serrée.'],
};

const CHATTER: Record<string, Lines> = {
  nino: {
    start: ['Coucou ! Je débute, sois gentil… 🐣', 'On joue ? J’apprends encore !'],
    capture: ['Oh, j’ai le droit de manger celle-là ? 😄', 'Miam !'],
    check: ['C’est ça un échec, non ? 😅'],
    trouble: ['Oups… j’ai fait une bêtise ?', 'Attends, ça se joue comment déjà ?'],
    win: ['J’ai gagné ?! Trop bien ! 🐣🎉'],
    loss: ['C’est pas grave, j’apprends ! 😊'],
  },
  lea: {
    start: ['Miam, des pièces à croquer ! 🐰', 'J’adore manger, prépare-toi !'],
    capture: ['Gnam gnam ! 🥕', 'Une de plus pour moi !'],
    advantage: ['J’ai plein de pièces à grignoter. 😋'],
    trouble: ['Hé ! Rends-moi ça ! 🐰', 'Zut, j’ai pas fait attention…'],
    win: ['Festin gagné ! 🥕🎉'],
    loss: ['Tu m’as coupé l’appétit… bien joué !'],
  },
  max: {
    start: ['Ouaf ! On joue, on joue ? 🐶', 'J’adore les échecs !!'],
    capture: ['Attrapé ! 🐾', 'Ouaf, je la prends !'],
    check: ['Échec ! Échec ! J’adore ça ! 🐶⚡', 'Roi en danger, ouaf !'],
    advantage: ['Je suis trop content là ! 🐕'],
    trouble: ['Ouin… 🐶', 'Oups, pas vu venir.'],
    win: ['OUAF ! J’ai gagné ! 🐶🏆'],
    loss: ['Bien joué ! On rejoue, dis, on rejoue ?'],
  },
  zoe: {
    start: ['Je vais jouer prudemment. 🐱', 'Pas de bêtises aujourd’hui.'],
    capture: ['Je récupère ça calmement.', 'Prise nette.'],
    trouble: ['Mmh, je dois faire attention. 🐱', 'Tu m’obliges à me défendre.'],
    advantage: ['Position saine, je progresse tranquillement.'],
    win: ['La patience paie. 🐱'],
    loss: ['Tu as mieux joué, bravo.'],
  },
  tom: {
    start: ['Prêt pour un peu de tactique ? 🎒', 'Je surveille les fourchettes !'],
    capture: ['Petite combinaison et je prends. 🎯'],
    check: ['Échec — et je prépare la suite. 🎒'],
    advantage: ['Ma tactique fonctionne. 😏'],
    trouble: ['Oh, joli coup, tu m’as surpris.'],
    win: ['La tactique gagne encore ! 🎒🏆'],
    loss: ['Bien vu, tu as déjoué mes pièges.'],
  },
  sacha: {
    start: ['Une gaffe et je punis. 🎯', 'Joue solide, sinon je frappe.'],
    capture: ['Erreur repérée, je punis.', 'Merci, je ne laisse rien passer.'],
    check: ['Échec. Reste concentré.'],
    advantage: ['Tu m’as donné l’avantage, je ne le lâche pas.'],
    trouble: ['Hmm, coup solide. Respect.'],
    win: ['Chaque imprécision se paie. 🎯'],
    loss: ['Tu as joué proprement. Bien mérité.'],
  },
  camille: {
    start: ['J’adore les positions fermées. 🐴', 'Laisse-moi manœuvrer mes cavaliers.'],
    capture: ['Mon cavalier saute et prend ! 🐴'],
    advantage: ['Mes cavaliers dominent le centre. 🐴'],
    trouble: ['Tu ouvres la position, malin…'],
    win: ['Manœuvre réussie ! 🐴'],
    loss: ['Tu as mieux navigué que moi, bravo.'],
  },
  boris: {
    start: ['J’ai vu passer bien des parties, petit. 🧔', 'Les classiques, toujours les classiques.'],
    capture: ['Comme dans les livres.', 'Prise positionnelle.'],
    advantage: ['La théorie est de mon côté. 🧔'],
    trouble: ['Tiens, tu connais tes classiques toi aussi.'],
    win: ['L’expérience l’emporte. 🧔'],
    loss: ['Belle leçon. Le vétéran s’incline.'],
  },
  elena: {
    start: ['Chaque coup aura un plan. 🦉', 'Observons… et exécutons.'],
    capture: ['Étape logique de mon plan. 🦉'],
    check: ['Échec — tout est calculé.'],
    advantage: ['Mon plan se déroule parfaitement.'],
    trouble: ['Intéressant… tu perturbes ma stratégie.'],
    win: ['La stratégie triomphe. 🦉'],
    loss: ['Ton plan valait le mien. Bravo.'],
  },
  karim: {
    start: ['Prépare-toi à l’attaque ! ⚔️', 'Je sacrifie, je mate. À toi de survivre.'],
    capture: ['En avant, je prends et j’attaque ! ⚔️'],
    check: ['Échec ! Et ce n’est que le début. 🔥'],
    advantage: ['L’attaque déferle. 😈'],
    trouble: ['Tu tiens le choc ? On verra.'],
    win: ['Attaque victorieuse ! ⚔️🔥'],
    loss: ['Tu as éteint mon feu. Respect.'],
  },
  vera: {
    start: ['Analyse en cours. Prépare-toi. 🤖', 'Probabilité de victoire calculée.'],
    capture: ['Capture optimale exécutée.', 'Séquence efficace.'],
    check: ['Échec. Précision 100 %.'],
    advantage: ['Avantage confirmé. Marge croissante. 🤖'],
    trouble: ['Anomalie détectée dans mes calculs…'],
    win: ['Résultat conforme aux prévisions. 🤖'],
    loss: ['Erreur système. Tu as surpassé la machine.'],
  },
  'magnus-jr': {
    start: ['Montre-moi ce que tu sais faire. 👑', 'Niveau champion du monde. Bonne chance.'],
    capture: ['Précis, comme il se doit. 👑'],
    check: ['Échec. Le filet se resserre.'],
    advantage: ['La couronne se rapproche. 👑'],
    trouble: ['Oh ? Tu joues vraiment bien.'],
    win: ['Le titre reste ici. 👑'],
    loss: ['Incroyable. Tu as battu un champion !'],
  },
  nc9000: {
    start: ['CALCUL INITIÉ. RÉSISTANCE INUTILE. 💀', 'Personne ne me bat. Personne.'],
    capture: ['SUPPRESSION.', 'CIBLE ÉLIMINÉE. 💀'],
    check: ['ÉCHEC. INÉLUCTABLE.'],
    advantage: ['DÉFAITE IMMINENTE POUR L’HUMAIN. 💀'],
    trouble: ['…recalcul en cours…'],
    win: ['FIN DE PARTIE. COMME PRÉVU. 💀'],
    loss: ['ERREUR FATALE. IMPOSSIBLE. TU… as gagné ?!'],
  },
};

export function botLine(botId: string, category: ChatCategory): string | null {
  const pool = CHATTER[botId]?.[category] ?? GENERIC[category];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
