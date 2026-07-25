import MoveBadge from './MoveBadge';
import {
  MOVE_CLASS_INFO,
  MOVE_CLASS_ORDER,
  PHASE_LABEL,
  phaseGrades,
  type GameAnalysis,
  type MoveClass,
  type Phase,
  type ReviewSummary,
} from '../engine/analysis';
import './gameReport.css';

const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];

function gradeOfAccuracy(acc: number): { label: string; color: string } {
  if (acc >= 90) return { label: 'excellent', color: '#81b64c' };
  if (acc >= 80) return { label: 'très bon', color: '#96bc4b' };
  if (acc >= 70) return { label: 'bon', color: '#e8a33d' };
  if (acc >= 55) return { label: 'correct', color: '#e58f2a' };
  return { label: 'à retravailler', color: '#e02828' };
}

/**
 * Écran d'accueil de la revue : le bulletin de la partie, côte à côte.
 * On voit d'abord qui a fait quoi, puis on lance la revue guidée. Le mur de
 * texte détaillé reste accessible, mais il n'est plus la première chose qu'on
 * a sous les yeux.
 */
export default function GameReport({
  analysis,
  summary,
  white,
  black,
  bookPlies,
  onStartGuided,
  onOpenDetails,
  onSeek,
  onBack,
}: {
  analysis: GameAnalysis;
  summary: ReviewSummary | null;
  white: string;
  black: string;
  bookPlies: number;
  onStartGuided: () => void;
  onOpenDetails: () => void;
  onSeek: (cursor: number) => void;
  onBack: () => void;
}) {
  const grades = phaseGrades(analysis, bookPlies);
  const gw = gradeOfAccuracy(analysis.accuracy.w);
  const gb = gradeOfAccuracy(analysis.accuracy.b);
  const shown = MOVE_CLASS_ORDER.filter(
    (cls) => analysis.counts.w[cls] + analysis.counts.b[cls] > 0
  );

  return (
    <div className="report">
      <header className="report-head">
        <button className="report-back" onClick={onBack} aria-label="Retour">←</button>
        <h1>Bilan de la partie</h1>
      </header>

      {summary && <p className="report-verdict">{summary.headline}</p>}

      <div className="report-players">
        <div className="report-player">
          <span className="report-avatar report-avatar--w">♔</span>
          <span className="report-name">{white}</span>
        </div>
        <span className="report-vs">vs</span>
        <div className="report-player">
          <span className="report-avatar report-avatar--b">♚</span>
          <span className="report-name">{black}</span>
        </div>
      </div>

      <div className="report-accuracy">
        <div className="report-acc-card">
          <span className="report-acc-value" style={{ color: gw.color }}>{analysis.accuracy.w.toFixed(1)}</span>
          <span className="report-acc-grade">{gw.label}</span>
        </div>
        <span className="report-acc-title">Précision</span>
        <div className="report-acc-card">
          <span className="report-acc-value" style={{ color: gb.color }}>{analysis.accuracy.b.toFixed(1)}</span>
          <span className="report-acc-grade">{gb.label}</span>
        </div>
      </div>

      <div className="report-table">
        {shown.map((cls: MoveClass) => (
          <div key={cls} className="report-row" title={MOVE_CLASS_INFO[cls].blurb}>
            <span className="report-count" style={{ color: MOVE_CLASS_INFO[cls].color }}>
              {analysis.counts.w[cls]}
            </span>
            <span className="report-row-mid">
              <MoveBadge cls={cls} size={24} />
              <span className="report-row-label">{MOVE_CLASS_INFO[cls].label}</span>
            </span>
            <span className="report-count" style={{ color: MOVE_CLASS_INFO[cls].color }}>
              {analysis.counts.b[cls]}
            </span>
          </div>
        ))}
      </div>

      <div className="report-table report-phases">
        {PHASES.map((phase) => (
          <div key={phase} className="report-row">
            <span className="report-phase-cell">
              {grades[phase].w ? <MoveBadge cls={grades[phase].w!} size={24} /> : <span className="report-dash">—</span>}
            </span>
            <span className="report-row-mid report-phase-label">{PHASE_LABEL[phase]}</span>
            <span className="report-phase-cell">
              {grades[phase].b ? <MoveBadge cls={grades[phase].b!} size={24} /> : <span className="report-dash">—</span>}
            </span>
          </div>
        ))}
      </div>

      {summary && summary.keyMoments.length > 0 && (
        <div className="report-moments">
          <h2>Moments-clés</h2>
          {summary.keyMoments.map((k, i) => (
            <button key={i} className="report-moment" onClick={() => onSeek(k.cursor)}>
              {k.text}
            </button>
          ))}
        </div>
      )}

      <div className="report-actions">
        <button className="primary report-cta" onClick={onStartGuided}>
          ▶ Démarrer le bilan
        </button>
        <button onClick={onOpenDetails}>🔎 Analyse détaillée</button>
      </div>
    </div>
  );
}
