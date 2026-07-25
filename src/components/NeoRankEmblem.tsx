/**
 * Blason de rang de Néo. Les cinq niveaux partageaient le même médaillon : rien
 * ne les distinguait. Chaque rang a maintenant sa propre identité complète —
 * forme du blason, motif de fond, métal — et non un cavalier identique avec une
 * pastille dans le coin. Le cavalier reste le point commun : c'est la mascotte.
 *
 * Tout est en SVG inline, avec des identifiants de dégradé uniques par rang :
 * deux blasons affichés côte à côte partageraient sinon les mêmes `defs`.
 */

type Rank = 'eveil' | 'apprenti' | 'tacticien' | 'stratege' | 'maitre';

interface RankSkin {
  /** Métal du cavalier et du cadre, du plus tendre au plus éclatant. */
  metal: [string, string, string];
  /** Fond du blason. */
  bg: [string, string];
  /** Couleur du motif qui identifie le style. */
  accent: string;
  /** Contour du blason : c'est lui qui donne la silhouette. */
  frame: string;
  pips: number;
}

const SKINS: Record<Rank, RankSkin> = {
  // Cercle tendre, cuivre d'aube : on débute, la lumière se lève.
  eveil: {
    metal: ['#f8dcae', '#c9863a', '#8a5620'],
    bg: ['#33281a', '#151110'],
    accent: '#f2a93f',
    frame: 'M50 2A48 48 0 1 1 49.9 2Z',
    pips: 1,
  },
  // Écu arrondi, or clair : l'apprenti travaille ses gammes.
  apprenti: {
    metal: ['#fcf0c6', '#d9b74b', '#9a7a24'],
    bg: ['#302b1c', '#141310'],
    accent: '#a6d96a',
    frame: 'M24 3H76A21 21 0 0 1 97 24V76A21 21 0 0 1 76 97H24A21 21 0 0 1 3 76V24A21 21 0 0 1 24 3Z',
    pips: 2,
  },
  // Écu pointu, or vif : le duelliste.
  tacticien: {
    metal: ['#fff6d2', '#e3bd3e', '#a37f1c'],
    bg: ['#2c2c21', '#12130f'],
    accent: '#6fd0ea',
    frame: 'M50 2L94 16C94 56 79 84 50 98C21 84 6 56 6 16Z',
    pips: 3,
  },
  // Hexagone, or profond : le manœuvrier qui lit le plan.
  stratege: {
    metal: ['#ffeaa6', '#cfa62f', '#7c5d12'],
    bg: ['#22262d', '#0f1114'],
    accent: '#a98cf2',
    frame: 'M50 2L92 26V74L50 98L8 74V26Z',
    pips: 4,
  },
  // Cercle couronné et lauré, obsidienne et or blanc : le maître.
  maitre: {
    metal: ['#ffffff', '#ffe382', '#bd8f13'],
    bg: ['#1d1d23', '#07070a'],
    accent: '#ff9b6a',
    frame: 'M50 8A44 44 0 1 1 49.9 8Z',
    pips: 5,
  },
};

const KNIGHT_PATHS = (
  <>
    <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
    <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
  </>
);

/** Rayons partant d'un point, pour les fonds « aube » et « aura ». */
function rays(cx: number, cy: number, count: number, len: number, width: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 * i) / count;
    return (
      <path
        key={i}
        d={`M${cx} ${cy}L${cx + Math.cos(a) * len - Math.sin(a) * width} ${
          cy + Math.sin(a) * len + Math.cos(a) * width
        }L${cx + Math.cos(a) * len + Math.sin(a) * width} ${
          cy + Math.sin(a) * len - Math.cos(a) * width
        }Z`}
      />
    );
  });
}

/** Grand motif de fond, propre au style. Il occupe le blason, pas un coin. */
function Motif({ rank, skin, uid }: { rank: Rank; skin: RankSkin; uid: string }) {
  switch (rank) {
    case 'eveil': // Aube : soleil qui se lève derrière le cavalier.
      return (
        <g>
          <g fill={skin.accent} opacity={0.22}>
            {rays(50, 86, 13, 66, 4.5)}
          </g>
          {/* Le soleil reste bas et discret : plus haut et plus opaque, il
              avalait le cavalier, qui est du même cuivre. */}
          <circle cx="50" cy="88" r="21" fill={skin.accent} opacity={0.3} />
          <path d="M4 88h92" stroke={skin.accent} strokeWidth={2.6} opacity={0.8} />
        </g>
      );
    case 'apprenti': // Grand livre ouvert, le cavalier se dresse dessus.
      return (
        <g opacity={0.85}>
          <path
            d="M48.5 66C39 58 26 57 14 62v26c12-5 25-4 34.5 4z"
            fill={skin.accent}
            opacity={0.5}
          />
          <path
            d="M51.5 66C61 58 74 57 86 62v26c-12-5-25-4-34.5 4z"
            fill={skin.accent}
            opacity={0.5}
          />
          <path d="M50 66V92" stroke={`url(#${uid}-metal)`} strokeWidth={2.6} />
          <g stroke={skin.accent} strokeWidth={1.2} opacity={0.85}>
            <path d="M20 68h22M20 75h22M58 68h22M58 75h22" />
          </g>
        </g>
      );
    case 'tacticien': // Deux sabres croisés en grand, derrière le cavalier.
      return (
        <g opacity={0.6}>
          <g stroke={skin.accent} strokeWidth={5} strokeLinecap="round">
            <path d="M16 84L84 20" />
            <path d="M84 84L16 20" />
          </g>
          <g fill={skin.accent}>
            <circle cx="16" cy="84" r="5" />
            <circle cx="84" cy="84" r="5" />
          </g>
        </g>
      );
    case 'stratege': // Rose des vents pleine largeur + trame du plan.
      return (
        <g>
          <g stroke={skin.accent} strokeWidth={0.8} opacity={0.3}>
            <path d="M20 32h60M20 50h60M20 68h60M32 20v60M50 20v60M68 20v60" />
          </g>
          <g fill={skin.accent} opacity={0.45}>
            <path d="M50 8 57 43 92 50 57 57 50 92 43 57 8 50 43 43Z" />
          </g>
          <circle cx="50" cy="50" r="7" fill={skin.bg[1]} opacity={0.7} />
        </g>
      );
    case 'maitre': // Aura + couronne de laurier.
      return (
        <g>
          <g fill={skin.accent} opacity={0.18}>
            {rays(50, 52, 16, 46, 3.2)}
          </g>
          {/* Laurier : deux branches sur la moitié basse seulement. Réparties
              sur tout le tour, les feuilles formaient un rang de perles. */}
          <g fill={`url(#${uid}-metal)`}>
            {Array.from({ length: 5 }, (_, i) => {
              const deg = 100 + i * 18.75;
              const a = (deg * Math.PI) / 180;
              const x = 50 + Math.cos(a) * 37;
              const y = 52 + Math.sin(a) * 37;
              return (
                <g key={`l${i}`}>
                  <ellipse cx={x} cy={y} rx={7} ry={3.1} transform={`rotate(${deg + 90} ${x} ${y})`} />
                  <ellipse
                    cx={100 - x}
                    cy={y}
                    rx={7}
                    ry={3.1}
                    transform={`rotate(${-deg - 90} ${100 - x} ${y})`}
                  />
                </g>
              );
            })}
          </g>
        </g>
      );
  }
}

export default function NeoRankEmblem({
  levelId,
  size = 56,
  className = '',
}: {
  /** Identifiant du niveau (« neo-tacticien ») : le rang en est déduit. */
  levelId: string;
  size?: number;
  className?: string;
}) {
  const candidate = levelId.replace(/^neo-/, '') as Rank;
  const rank: Rank = candidate in SKINS ? candidate : 'apprenti';
  const skin = SKINS[rank];
  const uid = `neo-${rank}`;
  // Le maître porte la couronne : son cavalier descend pour lui faire place.
  const knightY = rank === 'maitre' ? 58 : rank === 'apprenti' ? 47 : 52;
  const knightScale = rank === 'apprenti' ? 1.45 : 1.6;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`neo-emblem neo-emblem--${rank} ${className}`}
      role="img"
      aria-label={`Blason ${rank}`}
    >
      <defs>
        <linearGradient id={`${uid}-metal`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={skin.metal[0]} />
          <stop offset="48%" stopColor={skin.metal[1]} />
          <stop offset="100%" stopColor={skin.metal[2]} />
        </linearGradient>
        <radialGradient id={`${uid}-bg`} cx="34%" cy="24%" r="90%">
          <stop offset="0%" stopColor={skin.bg[0]} />
          <stop offset="100%" stopColor={skin.bg[1]} />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <path d={skin.frame} />
        </clipPath>
      </defs>

      {/* Fond et motif, rognés à la silhouette du blason. */}
      <g clipPath={`url(#${uid}-clip)`}>
        <path d={skin.frame} fill={`url(#${uid}-bg)`} />
        <Motif rank={rank} skin={skin} uid={uid} />
      </g>

      {/* Le cadre : c'est lui qui donne au rang sa silhouette reconnaissable. */}
      <path d={skin.frame} fill="none" stroke={`url(#${uid}-metal)`} strokeWidth={3.4} />
      {skin.pips >= 3 && (
        <path
          d={skin.frame}
          fill="none"
          stroke={`url(#${uid}-metal)`}
          strokeWidth={1}
          opacity={0.6}
          transform="translate(50 50) scale(0.88) translate(-50 -50)"
        />
      )}

      {/* Le cavalier de Néo — le point commun à tous les rangs. */}
      <g
        transform={`translate(50 ${knightY}) scale(${knightScale}) translate(-22 -24)`}
        fill={`url(#${uid}-metal)`}
        stroke={skin.bg[1]}
        strokeWidth={0.8}
      >
        {KNIGHT_PATHS}
      </g>

      {/* Couronne du maître, posée sur la tête. */}
      {rank === 'maitre' && (
        <g transform="translate(50 19)" fill={`url(#${uid}-metal)`} stroke="#07070a" strokeWidth={0.9}>
          <path d="M-15 11V-9l7.5 7.5L0-10.5l7.5 9L15-9V11Z" />
          <circle cx="0" cy="-13.5" r="3" fill={skin.accent} />
        </g>
      )}
    </svg>
  );
}
