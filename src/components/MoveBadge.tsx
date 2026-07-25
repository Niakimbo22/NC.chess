import { MOVE_CLASS_INFO, type MoveClass } from '../engine/analysis';
import './moveBadge.css';

/**
 * Pastille ronde d'une classification de coup (★ meilleur, ?? gaffe…).
 * Le symbole seul est ambigu pour un débutant : c'est la couleur + la forme
 * qui font passer le message d'un coup d'œil, exactement comme sur un bulletin.
 */
export default function MoveBadge({
  cls,
  size = 26,
  title,
}: {
  cls: MoveClass;
  size?: number;
  title?: string;
}) {
  const info = MOVE_CLASS_INFO[cls];
  return (
    <span
      className="move-badge"
      style={{ width: size, height: size, background: info.color, fontSize: size * 0.55 }}
      title={title ?? `${info.label} — ${info.blurb}`}
      aria-label={info.label}
    >
      {info.symbol}
    </span>
  );
}
