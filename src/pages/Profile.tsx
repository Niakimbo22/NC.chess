import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATARS, useProfile } from '../store/profile';
import { loadGameHistory, deleteGameFromHistory, type SavedGame } from '../store/gameHistory';
import { getBot } from '../bots/bots';
import './profile.css';

export default function Profile() {
  const profile = useProfile();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile.pseudo);
  const [showAvatars, setShowAvatars] = useState(false);
  const [games, setGames] = useState<SavedGame[]>(() => loadGameHistory());

  const totals = useMemo(() => {
    let w = 0, l = 0, d = 0;
    for (const cat of Object.values(profile.stats)) {
      w += cat.wins; l += cat.losses; d += cat.draws;
    }
    return { w, l, d, total: w + l + d };
  }, [profile.stats]);

  return (
    <div className="profile">
      <div className="panel profile-header">
        <button className="profile-avatar" onClick={() => setShowAvatars(!showAvatars)} title="Changer d'avatar">
          {profile.avatar}
        </button>
        <div style={{ flex: 1 }}>
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                profile.setProfile({ pseudo: nameDraft.trim() || 'Joueur' });
                setEditingName(false);
              }}
            >
              <input autoFocus value={nameDraft} maxLength={20} onChange={(e) => setNameDraft(e.target.value)} />
              <button type="submit" className="primary" style={{ marginLeft: 8 }}>OK</button>
            </form>
          ) : (
            <h1 style={{ margin: 0, cursor: 'pointer' }} onClick={() => setEditingName(true)} title="Cliquer pour modifier">
              {profile.pseudo} ✏️
            </h1>
          )}
          <p style={{ color: 'var(--text-dim)', margin: '4px 0 0' }}>
            {totals.total} partie{totals.total > 1 ? 's' : ''} jouée{totals.total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="profile-elo">
          <span className="elo-value">{profile.elo}</span>
          <span className="elo-label">Elo</span>
        </div>
        <div className="profile-elo">
          <span className="elo-value">{profile.puzzleElo}</span>
          <span className="elo-label">Elo puzzle</span>
        </div>
      </div>

      {showAvatars && (
        <div className="panel avatar-gallery">
          {AVATARS.map((a) => (
            <button
              key={a}
              className={profile.avatar === a ? 'selected' : ''}
              onClick={() => {
                profile.setProfile({ avatar: a });
                setShowAvatars(false);
              }}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="profile-cols">
        <div className="panel">
          <h2>📈 Progression Elo</h2>
          <EloGraph history={profile.eloHistory} currentElo={profile.elo} />
          <div className="stats-summary">
            <span className="stat-win">{totals.w} V</span>
            <span className="stat-draw">{totals.d} N</span>
            <span className="stat-loss">{totals.l} D</span>
          </div>
          <table className="stats-table">
            <thead>
              <tr><th>Cadence</th><th>V</th><th>N</th><th>D</th></tr>
            </thead>
            <tbody>
              {Object.entries(profile.stats).map(([cat, s]) => (
                <tr key={cat}>
                  <td>{cat === 'none' ? 'sans pendule' : cat}</td>
                  <td className="stat-win">{s.wins}</td>
                  <td className="stat-draw">{s.draws}</td>
                  <td className="stat-loss">{s.losses}</td>
                </tr>
              ))}
              {Object.keys(profile.stats).length === 0 && (
                <tr><td colSpan={4} style={{ color: 'var(--text-dim)' }}>Joue une partie classée pour commencer !</td></tr>
              )}
            </tbody>
          </table>
          <h2 style={{ marginTop: 16 }}>🧩 Puzzles</h2>
          <p style={{ color: 'var(--text-dim)', margin: 0 }}>
            {profile.puzzleSolved} résolus · {profile.puzzleFailed} ratés · record rush : {profile.puzzleRushBest}
          </p>
        </div>

        <div className="panel">
          <h2>📜 Historique des parties</h2>
          <div className="game-history">
            {games.length === 0 && <p style={{ color: 'var(--text-dim)' }}>Aucune partie enregistrée pour l'instant.</p>}
            {games.slice(0, 50).map((g) => (
              <div key={g.id} className="game-row">
                <span className="game-mode">{g.mode === 'bot' ? getBot(g.botId ?? '')?.avatar ?? '🤖' : g.mode === 'p2p' ? '👥' : '🪑'}</span>
                <div className="game-info">
                  <span>{g.white} vs {g.black}</span>
                  <span className="game-meta">
                    {new Date(g.date).toLocaleDateString('fr-FR')} · {g.timeControl} {g.result ? `· ${g.result}` : ''}
                  </span>
                </div>
                <button title="Analyser" onClick={() => navigate('/analysis', { state: { pgn: g.pgn } })}>📊</button>
                <button
                  title="Supprimer"
                  onClick={() => {
                    deleteGameFromHistory(g.id);
                    setGames(loadGameHistory());
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        className="danger"
        onClick={() => {
          if (confirm('Tout remettre à zéro (Elo, stats, progression) ? Les parties enregistrées sont conservées.')) {
            profile.resetProgress();
          }
        }}
      >
        Réinitialiser ma progression
      </button>
    </div>
  );
}

function EloGraph({ history, currentElo }: { history: { date: number; elo: number }[]; currentElo: number }) {
  const points = history.length > 0 ? history.map((h) => h.elo) : [currentElo];
  if (points.length === 1) points.unshift(points[0]);
  const min = Math.min(...points) - 30;
  const max = Math.max(...points) + 30;
  const W = 320, H = 90;
  const path = points
    .map((elo, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((elo - min) / (max - min)) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="elo-graph" preserveAspectRatio="none">
      <path d={`${path} L${W},${H} L0,${H} Z`} fill="rgba(129, 182, 76, 0.15)" stroke="none" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  );
}
