import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AVATARS,
  BANNER_THEMES,
  FLAIRS,
  bannerGradient,
  flairLabel,
  useProfile,
} from '../store/profile';
import { useFriends, extractFriendCode, pairRoomCode, type Friend } from '../store/friends';
import { loadGameHistory, deleteGameFromHistory, type SavedGame } from '../store/gameHistory';
import { getBot } from '../bots/bots';
import './profile.css';

export default function Profile() {
  const profile = useProfile();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
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
      {/* En-tête façon carte de joueur : bannière + avatar + identité */}
      <div className="profile-card">
        <div className="profile-banner" style={{ background: bannerGradient(profile.banner) }}>
          <button className="profile-edit-btn" onClick={() => setEditing(true)}>
            ✎ Modifier le profil
          </button>
        </div>
        <div className="profile-card-body">
          <div className="profile-avatar-ring">
            <span className="profile-avatar-emoji">{profile.avatar}</span>
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">
              {profile.pseudo}
              {profile.country && <span className="profile-country">{profile.country}</span>}
            </h1>
            {profile.flair && <span className="profile-flair">{flairLabel(profile.flair)}</span>}
            <p className="profile-bio">
              {profile.bio || 'Aucune présentation pour l’instant. Clique sur « Modifier le profil ».'}
            </p>
            <p className="profile-count">
              {totals.total} partie{totals.total > 1 ? 's' : ''} jouée{totals.total > 1 ? 's' : ''}
            </p>
          </div>
          <div className="profile-elos">
            <div className="profile-elo">
              <span className="elo-value">{profile.elo}</span>
              <span className="elo-label">Elo</span>
            </div>
            <div className="profile-elo">
              <span className="elo-value">{profile.puzzleElo}</span>
              <span className="elo-label">Elo puzzle</span>
            </div>
          </div>
        </div>
      </div>

      {editing && <EditProfileModal onClose={() => setEditing(false)} />}

      <FriendsSection onChallenge={(code) => navigate(`/play/friend?pair=${code}`)} />

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
          if (confirm('Tout remettre à zéro (Elo, stats, progression) ? Ton profil et tes parties enregistrées sont conservés.')) {
            profile.resetProgress();
          }
        }}
      >
        Réinitialiser ma progression
      </button>
    </div>
  );
}

// -------------------------------------------------- Modale d'édition du profil

function EditProfileModal({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const [pseudo, setPseudo] = useState(profile.pseudo);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [banner, setBanner] = useState(profile.banner);
  const [flair, setFlair] = useState(profile.flair);
  const [country, setCountry] = useState(profile.country);
  const [bio, setBio] = useState(profile.bio);

  const save = () => {
    profile.setProfile({
      pseudo: pseudo.trim() || 'Joueur',
      avatar,
      banner,
      flair,
      country: country.trim(),
      bio: bio.trim(),
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card edit-profile" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Modifier le profil</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="modal-body">
          {/* Aperçu en direct */}
          <div className="edit-preview" style={{ background: bannerGradient(banner) }}>
            <span className="edit-preview-avatar">{avatar}</span>
            <div>
              <strong>{pseudo || 'Joueur'} {country}</strong>
              <div className="edit-preview-flair">{flairLabel(flair)}</div>
            </div>
          </div>

          <label className="field">
            <span>Pseudo</span>
            <input value={pseudo} maxLength={20} onChange={(e) => setPseudo(e.target.value)} autoFocus />
          </label>

          <div className="field">
            <span>Avatar</span>
            <div className="avatar-picker">
              {AVATARS.map((a) => (
                <button key={a} className={avatar === a ? 'selected' : ''} onClick={() => setAvatar(a)}>{a}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Bannière</span>
            <div className="banner-picker">
              {BANNER_THEMES.map((b) => (
                <button
                  key={b.id}
                  className={banner === b.id ? 'selected' : ''}
                  style={{ background: b.gradient }}
                  title={b.label}
                  onClick={() => setBanner(b.id)}
                />
              ))}
            </div>
          </div>

          <label className="field">
            <span>Titre</span>
            <select value={flair} onChange={(e) => setFlair(e.target.value)}>
              {FLAIRS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Drapeau / emoji (optionnel)</span>
            <input value={country} maxLength={4} placeholder="🇫🇷" onChange={(e) => setCountry(e.target.value)} />
          </label>

          <label className="field">
            <span>Présentation</span>
            <textarea value={bio} maxLength={140} rows={2} placeholder="Un mot sur toi, ton style de jeu…" onChange={(e) => setBio(e.target.value)} />
          </label>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Annuler</button>
          <button className="primary" onClick={save}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------- Section Amis

function FriendsSection({ onChallenge }: { onChallenge: (pairCode: string) => void }) {
  const profile = useProfile();
  const friends = useFriends();
  const [tab, setTab] = useState<'code' | 'pseudo'>('code');
  const [codeInput, setCodeInput] = useState('');
  const [pseudoInput, setPseudoInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const inviteHandled = useRef(false);

  const inviteLink = `${location.origin}${location.pathname}#/profile?friend=${friends.myCode}`;

  // Ajout automatique via un lien d'invitation #/profile?friend=CODE
  useEffect(() => {
    const invited = searchParams.get('friend');
    if (!invited || inviteHandled.current) return;
    inviteHandled.current = true;
    const code = extractFriendCode(invited);
    const id = friends.addFriend({ pseudo: `Ami ${code.slice(0, 4)}`, code });
    setFeedback(
      id
        ? 'Ami ajouté en attente via le lien ! Il passera en « confirmé » dès votre première partie ensemble.'
        : 'Cet ami est déjà dans ta liste (ou c’est ton propre code).'
    );
    setTimeout(() => setFeedback(''), 4500);
    searchParams.delete('friend');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, friends]);

  const copyCode = () => {
    navigator.clipboard.writeText(friends.myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareCode = async () => {
    const text = `Ajoute-moi sur NC.chess ♟️ — mon code ami : ${friends.myCode}`;
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'NC.chess', text, url: inviteLink }); return; } catch { /* annulé */ }
    }
    navigator.clipboard.writeText(`${text} ${inviteLink}`);
    setFeedback('Lien d’invitation copié.');
    setTimeout(() => setFeedback(''), 2500);
  };

  const addByCode = () => {
    const code = extractFriendCode(codeInput);
    if (code.replace('-', '').length < 8) {
      setFeedback('Code invalide (format XXXX-XXXX).');
      return;
    }
    const id = friends.addFriend({ pseudo: `Ami ${code.slice(0, 4)}`, code });
    setFeedback(
      id
        ? 'Demande envoyée à ta liste ! Elle passera en « confirmé » dès votre première partie ensemble (ou en confirmant à la main).'
        : 'Cet ami est déjà dans ta liste (ou c’est ton propre code).'
    );
    if (id) setCodeInput('');
    setTimeout(() => setFeedback(''), 4500);
  };

  const addByPseudo = () => {
    const name = pseudoInput.trim();
    if (!name) return;
    friends.addFriend({ pseudo: name });
    setFeedback(`« ${name} » ajouté en attente. Renseigne son code plus tard pour pouvoir le défier et le confirmer.`);
    setPseudoInput('');
    setTimeout(() => setFeedback(''), 3500);
  };

  return (
    <div className="panel friends-panel">
      <h2>👥 Mes amis</h2>

      <div className="my-code">
        <div>
          <span className="my-code-label">Mon code ami</span>
          <span className="my-code-value">{friends.myCode}</span>
        </div>
        <div className="my-code-actions">
          <button onClick={copyCode}>{copied ? '✓ Copié' : '📋 Copier'}</button>
          <button className="primary" onClick={shareCode}>🔗 Partager</button>
        </div>
      </div>

      <div className="add-friend">
        <div className="add-friend-tabs">
          <button className={tab === 'code' ? 'active' : ''} onClick={() => setTab('code')}>Par code / lien</button>
          <button className={tab === 'pseudo' ? 'active' : ''} onClick={() => setTab('pseudo')}>Par pseudo</button>
        </div>
        {tab === 'code' ? (
          <div className="add-friend-row">
            <input
              placeholder="Code ami ou lien (ex. AF3P-B2K9)"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addByCode()}
            />
            <button className="primary" onClick={addByCode}>Ajouter</button>
          </div>
        ) : (
          <div className="add-friend-row">
            <input
              placeholder="Pseudo de ton ami"
              value={pseudoInput}
              maxLength={20}
              onChange={(e) => setPseudoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addByPseudo()}
            />
            <button className="primary" onClick={addByPseudo}>Ajouter</button>
          </div>
        )}
        {feedback && <p className="add-friend-feedback">{feedback}</p>}
      </div>

      {(() => {
        // Rétro-compat : les amis enregistrés avant l'ajout du statut n'ont pas
        // de champ `status` → on les traite comme déjà confirmés.
        const confirmed = friends.friends.filter((f) => (f.status ?? 'confirmed') === 'confirmed');
        const pending = friends.friends.filter((f) => (f.status ?? 'confirmed') === 'pending');

        const row = (f: Friend) => (
          <div key={f.id} className="friend-row">
            <span className="friend-avatar">{f.avatar}</span>
            <div className="friend-info">
              <FriendName friend={f} onRename={(name) => friends.updateFriend(f.id, { pseudo: name })} />
              <span className="friend-code">{f.code || 'code non renseigné'}</span>
            </div>
            {(f.status ?? 'confirmed') === 'pending' && (
              <button title="Confirmer manuellement (sans jouer ensemble)" onClick={() => friends.confirmFriend(f.id)}>
                ✓ Confirmer
              </button>
            )}
            {f.code ? (
              <button
                className="primary"
                title="Défier dans un salon privé"
                onClick={() => onChallenge(pairRoomCode(friends.myCode, f.code))}
              >
                ⚔️ Défier
              </button>
            ) : (
              <AddCodeButton onSet={(code) => friends.updateFriend(f.id, { code })} />
            )}
            <button title="Retirer" onClick={() => friends.removeFriend(f.id)}>🗑️</button>
          </div>
        );

        return (
          <>
            <div className="friends-list">
              <h3 className="friends-subheading">Amis confirmés ({confirmed.length})</h3>
              {confirmed.length === 0 && (
                <p style={{ color: 'var(--text-dim)', margin: '4px 0 0' }}>
                  Aucun ami confirmé pour l’instant. Échange ton code avec quelqu’un, puis jouez une partie ensemble (ou confirme à la main) !
                </p>
              )}
              {confirmed.map(row)}
            </div>

            {pending.length > 0 && (
              <div className="friends-list friends-list--pending">
                <h3 className="friends-subheading">⏳ Demandes en attente ({pending.length})</h3>
                <p className="friends-note" style={{ margin: '0 0 6px' }}>
                  Ajoutés d’un seul côté (code collé, lien ouvert…) — rien ne prouve encore que c’est
                  réciproque. Ils passent en « confirmé » automatiquement dès votre première partie
                  ensemble, ou tu peux confirmer à la main.
                </p>
                {pending.map(row)}
              </div>
            )}
          </>
        );
      })()}
      <p className="friends-note">
        Le défi ouvre un salon privé partagé : quand ton ami clique aussi sur « Défier » (ou reçoit le lien),
        vous vous retrouvez automatiquement — pas besoin de vous rééchanger un code.
      </p>
      {profile.pseudo === 'Joueur' && (
        <p className="friends-note">💡 Pense à choisir un pseudo dans « Modifier le profil » : c’est lui que voient tes amis.</p>
      )}
    </div>
  );
}

function FriendName({ friend, onRename }: { friend: { pseudo: string }; onRename: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(friend.pseudo);
  if (editing) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); onRename(draft.trim() || friend.pseudo); setEditing(false); }}
        style={{ display: 'flex', gap: 4 }}
      >
        <input autoFocus value={draft} maxLength={20} onChange={(e) => setDraft(e.target.value)} style={{ padding: '2px 6px', fontSize: 14 }} />
        <button type="submit" style={{ padding: '2px 8px' }}>OK</button>
      </form>
    );
  }
  return (
    <span className="friend-name" onClick={() => setEditing(true)} title="Renommer">
      {friend.pseudo}
    </span>
  );
}

function AddCodeButton({ onSet }: { onSet: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if (!open) return <button onClick={() => setOpen(true)}>+ code</button>;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSet(val); setOpen(false); }}
      style={{ display: 'flex', gap: 4 }}
    >
      <input autoFocus placeholder="XXXX-XXXX" value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 100, padding: '4px 6px', fontSize: 13 }} />
      <button type="submit" className="primary" style={{ padding: '4px 8px' }}>OK</button>
    </form>
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
