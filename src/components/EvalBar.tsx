import './evalBar.css';

/** Barre d'évaluation verticale. cp : point de vue des blancs (±10000 ≈ mat). */
export default function EvalBar({ cp, flipped }: { cp: number; flipped?: boolean }) {
  const isMate = Math.abs(cp) >= 9000;
  // Pourcentage de la barre pour les blancs (sigmoïde douce)
  const whiteShare = isMate
    ? cp > 0 ? 100 : 0
    : 50 + 50 * (2 / (1 + Math.exp(-0.004 * Math.max(-1200, Math.min(1200, cp)))) - 1);
  const label = isMate
    ? `M${Math.max(1, 10000 - Math.abs(cp))}`
    : (Math.abs(cp) / 100).toFixed(1);

  return (
    <div className={`eval-bar ${flipped ? 'flipped' : ''}`} title={`Évaluation : ${cp > 0 ? '+' : ''}${(cp / 100).toFixed(2)}`}>
      <div className="eval-bar-white" style={{ height: `${whiteShare}%` }} />
      <span className={`eval-bar-label ${cp >= 0 ? 'on-white' : 'on-black'}`}>{label}</span>
    </div>
  );
}
