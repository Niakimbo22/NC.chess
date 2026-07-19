import { useCallback, useEffect, useRef, useState } from 'react';
import OpeningLabel from '../components/OpeningLabel';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Color } from 'chess.js';
import Chessboard from '../components/board/Chessboard';
import { GameOverModal, MoveList, NavButtons, PlayerBar } from '../components/GamePanel';
import TimeControlPicker from '../components/TimeControlPicker';
import { TIME_CONTROLS, customTimeControl, type TimeControl } from '../game/timeControls';
import { useChessGame, type EndReason } from '../game/useChessGame';
import { P2PSession, generateRoomCode, normalizeRoomCode, type P2PMessage, type PlayerInfo } from '../p2p/session';
import { useProfile } from '../store/profile';
import { saveGameToHistory } from '../store/gameHistory';
import { playSound } from '../audio/sounds';
import './playFriend.css';

interface MatchConfig {
  session: P2PSession;
  myColor: Color;
  opponent: PlayerInfo;
  tc: TimeControl;
}

export default function PlayFriend() {
  const [searchParams] = useSearchParams();
  const urlCode = normalizeRoomCode(searchParams.get('code') ?? '');
  const [match, setMatch] = useState<MatchConfig | null>(null);
  const [rematchKey, setRematchKey] = useState(0);

  if (match) {
    return (
      <FriendGame
        key={`${rematchKey}-${match.myColor}`}
        match={match}
        onRematch={(newColor) => {
          setMatch({ ...match, myColor: newColor });
          setRematchKey((k) => k + 1);
        }}
        onExit={() => {
          match.session.close();
          setMatch(null);
        }}
      />
    );
  }
  return <Lobby initialCode={urlCode} onMatchReady={setMatch} />;
}

function Lobby({ initialCode, onMatchReady }: { initialCode: string; onMatchReady: (m: MatchConfig) => void }) {
  const profile = useProfile();
  const [mode, setMode] = useState<'menu' | 'hosting' | 'joining'>(initialCode ? 'joining' : 'menu');
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS.find((t) => t.id === '10+0')!);
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const sessionRef = useRef<P2PSession | null>(null);
  const autoJoinDone = useRef(false);

  const me: PlayerInfo = { name: profile.pseudo, avatar: profile.avatar, elo: profile.elo };


  const host = useCallback(() => {
    setError('');
    const roomCode = generateRoomCode();
    setCode(roomCode);
    setMode('hosting');
    setStatus('Création du salon…');
    const chosenTc = tc;
    const session = new P2PSession('host', roomCode, {
      onOpen: () => setStatus('En attente d’un adversaire…'),
      onError: (msg) => setError(msg),
      onMessage: (msg) => {
        if (msg.type === 'hello') {
          const guestColor: Color = Math.random() < 0.5 ? 'w' : 'b';
          session.send({
            type: 'start',
            guestColor,
            tcInitial: chosenTc.initial,
            tcIncrement: chosenTc.increment,
            host: me,
          });
          playSound('NewChallenge');
          onMatchReady({
            session,
            myColor: guestColor === 'w' ? 'b' : 'w',
            opponent: msg.player,
            tc: chosenTc,
          });
        }
      },
    });
    sessionRef.current = session;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tc, profile.pseudo, profile.avatar, profile.elo, onMatchReady]);

  const join = useCallback(
    (codeToJoin: string) => {
      const clean = normalizeRoomCode(codeToJoin);
      if (clean.length < 4) {
        setError('Code invalide (4 caractères, ex. AF3P).');
        return;
      }
      setError('');
      setMode('joining');
      setStatus('Connexion au salon…');
      const session = new P2PSession('guest', clean, {
        onOpen: () => setStatus(`Recherche du salon ${clean}…`),
        onConnected: () => {
          setStatus('Connecté ! Salutations…');
          session.send({ type: 'hello', player: me });
        },
        onError: (msg) => {
          setError(msg);
          setMode('menu');
        },
        onMessage: (msg) => {
          if (msg.type === 'start') {
            playSound('NewChallenge');
            const tcRecv =
              msg.tcInitial == null
                ? TIME_CONTROLS[0]
                : TIME_CONTROLS.find((t) => t.initial === msg.tcInitial && t.increment === msg.tcIncrement) ??
                  customTimeControl(msg.tcInitial, msg.tcIncrement);
            onMatchReady({ session, myColor: msg.guestColor, opponent: msg.host, tc: tcRecv });
          }
        },
      });
      sessionRef.current = session;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile.pseudo, profile.avatar, profile.elo, onMatchReady]
  );

  // Auto-join depuis un lien d'invitation. Le cleanup gère aussi le
  // double-montage de StrictMode : on referme et on ré-arme le flag pour
  // que la seconde exécution recrée la session proprement.
  useEffect(() => {
    if (initialCode && !autoJoinDone.current) {
      autoJoinDone.current = true;
      join(initialCode);
    }
    return () => {
      if (sessionRef.current && !sessionRef.current.connected) {
        sessionRef.current.close();
        sessionRef.current = null;
        autoJoinDone.current = false;
      }
    };
  }, [initialCode, join]);

  const inviteLink = `${location.origin}${location.pathname}#/play/friend?code=${code}`;

  if (mode === 'hosting') {
    return (
      <div className="friend-lobby">
        <h1>👥 Salon créé !</h1>
        <div className="panel friend-waiting">
          <p>Partage ce code avec ton ami :</p>
          <div className="room-code">{code.split('').map((c, i) => <span key={i}>{c}</span>)}</div>
          <button
            className="primary"
            onClick={() => {
              navigator.clipboard.writeText(inviteLink).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
          >
            {copied ? '✓ Lien copié !' : '🔗 Copier le lien d’invitation'}
          </button>
          <p className="friend-status">{error || status}<span className="dots" /></p>
          <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Cadence : {tc.name}</p>
          <button onClick={() => { sessionRef.current?.close(); setMode('menu'); }}>Annuler</button>
        </div>
      </div>
    );
  }

  if (mode === 'joining') {
    return (
      <div className="friend-lobby">
        <h1>👥 Rejoindre un salon</h1>
        <div className="panel friend-waiting">
          {error ? <p style={{ color: 'var(--danger)' }}>{error}</p> : <p className="friend-status">{status}<span className="dots" /></p>}
          <button onClick={() => { sessionRef.current?.close(); setMode('menu'); }}>Annuler</button>
        </div>
      </div>
    );
  }

  return (
    <div className="friend-lobby">
      <h1>👥 Jouer entre amis</h1>
      <p style={{ color: 'var(--text-dim)' }}>
        Connexion directe de navigateur à navigateur — crée un salon et partage le code, comme <strong>AF3P</strong>.
      </p>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      <div className="friend-cols">
        <div className="panel">
          <h2>Créer un salon</h2>
          <h3 style={{ fontSize: 14, color: 'var(--text-dim)' }}>Cadence</h3>
          <TimeControlPicker value={tc} onChange={setTc} />
          <button className="primary" style={{ width: '100%', marginTop: 14, fontSize: 16 }} onClick={host}>
            ♟️ Créer le salon
          </button>
        </div>
        <div className="panel">
          <h2>Rejoindre avec un code</h2>
          <input
            className="join-input"
            placeholder="AF3P"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(normalizeRoomCode(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && join(joinCode)}
          />
          <button className="primary" style={{ width: '100%', marginTop: 14, fontSize: 16 }} onClick={() => join(joinCode)}>
            🚪 Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
}

function FriendGame({
  match,
  onRematch,
  onExit,
}: {
  match: MatchConfig;
  onRematch: (newColor: Color) => void;
  onExit: () => void;
}) {
  const navigate = useNavigate();
  const profile = useProfile();
  const { session, myColor, opponent, tc } = match;
  const oppColor: Color = myColor === 'w' ? 'b' : 'w';

  const [chatMessages, setChatMessages] = useState<{ mine: boolean; text: string }[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [drawIncoming, setDrawIncoming] = useState(false);
  const [drawPending, setDrawPending] = useState(false);
  const [rematchIncoming, setRematchIncoming] = useState(false);
  const [rematchPending, setRematchPending] = useState(false);
  const [oppDisconnected, setOppDisconnected] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const savedRef = useRef(false);

  const flashBanner = useCallback((text: string) => {
    setBanner(text);
    setTimeout(() => setBanner(null), 3500);
  }, []);

  const game = useChessGame({
    timeControl: tc,
    onGameEnd: (result) => {
      if (savedRef.current) return;
      savedRef.current = true;
      const score = result.winner === null ? 0.5 : result.winner === myColor ? 1 : 0;
      playSound(score === 1 ? 'Victory' : score === 0 ? 'Defeat' : 'Draw');
      if (result.reason === 'timeout') {
        session.send({ type: 'end', winner: result.winner, reason: result.reason });
      }
      saveGameToHistory({
        mode: 'p2p',
        white: myColor === 'w' ? profile.pseudo : opponent.name,
        black: myColor === 'b' ? profile.pseudo : opponent.name,
        pgn: game.chessRef.current.pgn(),
        timeControl: tc.id,
        result: result.winner === null ? '1/2-1/2' : result.winner === 'w' ? '1-0' : '0-1',
      });
    },
  });

  const gameRef = useRef(game);
  gameRef.current = game;

  // Réception des messages
  useEffect(() => {
    const events = {
      onMessage: (msg: P2PMessage) => {
        const g = gameRef.current;
        switch (msg.type) {
          case 'move': {
            g.applySanOrUci(msg.uci);
            if (msg.clockW != null && msg.clockB != null) g.syncClock(msg.clockW, msg.clockB);
            break;
          }
          case 'chat':
            setChatMessages((m) => [...m, { mine: false, text: msg.text }]);
            playSound('GenericNotify');
            break;
          case 'drawOffer':
            setDrawIncoming(true);
            playSound('GenericNotify');
            break;
          case 'drawAccept':
            g.agreeDraw();
            setDrawPending(false);
            break;
          case 'drawDecline':
            setDrawPending(false);
            flashBanner(`${opponent.name} refuse la nulle.`);
            break;
          case 'resign':
            g.endGame({ winner: myColor, reason: 'resign' });
            break;
          case 'end':
            g.endGame({ winner: msg.winner, reason: msg.reason as EndReason });
            break;
          case 'rematchOffer':
            setRematchIncoming(true);
            setModalDismissed(true);
            playSound('NewChallenge');
            break;
          case 'rematchAccept':
            onRematch(oppColor);
            break;
          case 'stateRequest':
            session.send({
              type: 'state',
              moves: g.history.map((m) => m.from + m.to + (m.promotion ?? '')),
              clockW: g.clock?.w ?? null,
              clockB: g.clock?.b ?? null,
            });
            break;
          case 'state': {
            // Resynchronisation après reconnexion : rejoue les coups manquants
            const current = g.history.length;
            for (let i = current; i < msg.moves.length; i++) g.applySanOrUci(msg.moves[i]);
            if (msg.clockW != null && msg.clockB != null) g.syncClock(msg.clockW, msg.clockB);
            break;
          }
        }
      },
      onDisconnected: () => {
        setOppDisconnected(true);
        flashBanner(`${opponent.name} s’est déconnecté…`);
      },
      onConnected: () => {
        setOppDisconnected(false);
        flashBanner(`${opponent.name} est de retour !`);
        session.send({ type: 'stateRequest' });
      },
      onError: () => {},
    };
    // Remplace les handlers du lobby par ceux de la partie
    session.events = events;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Reconnexion automatique de l'invité
  useEffect(() => {
    if (!oppDisconnected || session.role !== 'guest' || game.result) return;
    const interval = setInterval(() => session.reconnect(), 4000);
    return () => clearInterval(interval);
  }, [oppDisconnected, session, game.result]);

  const isLive = game.viewIndex < 0;

  return (
    <div className="game-layout">
      <div className="game-board-col">
        <PlayerBar
          name={opponent.name}
          rating={opponent.elo}
          avatar={opponent.avatar}
          color={oppColor}
          history={game.history}
          clockMs={game.clock?.[oppColor]}
          clockActive={game.clockRunning && game.turn === oppColor && !game.result}
          subtitle={oppDisconnected ? '🔌 déconnecté…' : undefined}
        />
        <Chessboard
          fen={game.viewFen}
          orientation={myColor}
          playableColor={isLive && !game.result ? myColor : null}
          onMove={(m) => {
            const played = game.makeMove(m);
            if (played) {
              const c = gameRef.current.clock;
              session.send({ type: 'move', uci: played.from + played.to + (played.promotion ?? ''), clockW: c?.w ?? null, clockB: c?.b ?? null });
            }
          }}
          lastMove={game.lastMove}
        />
        <PlayerBar
          name={profile.pseudo}
          rating={profile.elo}
          avatar={profile.avatar}
          color={myColor}
          history={game.history}
          clockMs={game.clock?.[myColor]}
          clockActive={game.clockRunning && game.turn === myColor && !game.result}
        />
      </div>
      <div className="game-side-col">
        <div className="room-badge">Salon <strong>{session.code}</strong></div>
        {banner && <div className="bot-message">{banner}</div>}
        {drawIncoming && !game.result && (
          <div className="bot-message">
            {opponent.name} propose la nulle.
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="primary" onClick={() => { session.send({ type: 'drawAccept' }); gameRef.current.agreeDraw(); setDrawIncoming(false); }}>Accepter</button>
              <button onClick={() => { session.send({ type: 'drawDecline' }); setDrawIncoming(false); }}>Refuser</button>
            </div>
          </div>
        )}
        {rematchIncoming && (
          <div className="bot-message">
            {opponent.name} propose une revanche !
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button className="primary" onClick={() => { session.send({ type: 'rematchAccept' }); setRematchIncoming(false); onRematch(oppColor); }}>C’est parti !</button>
              <button onClick={() => setRematchIncoming(false)}>Non merci</button>
            </div>
          </div>
        )}
        <OpeningLabel history={game.history} />
        <MoveList history={game.history} viewIndex={game.viewIndex} onSelect={game.goTo} />
        <NavButtons historyLength={game.history.length} viewIndex={game.viewIndex} onGoTo={game.goTo} />
        <div className="game-actions">
          {!game.result ? (
            <>
              <button
                disabled={drawPending}
                onClick={() => { session.send({ type: 'drawOffer' }); setDrawPending(true); flashBanner('Proposition de nulle envoyée.'); }}
              >
                ½ Nulle
              </button>
              <button
                className="danger"
                onClick={() => {
                  session.send({ type: 'resign' });
                  game.resign(myColor);
                }}
              >
                🏳 Abandon
              </button>
            </>
          ) : (
            <>
              <button
                className="primary"
                disabled={rematchPending}
                onClick={() => { session.send({ type: 'rematchOffer' }); setRematchPending(true); flashBanner('Proposition de revanche envoyée…'); }}
              >
                ⚔️ Revanche
              </button>
              <button onClick={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}>📊 Analyser</button>
              <button onClick={onExit}>Quitter</button>
            </>
          )}
        </div>
        <div className="chat">
          <div className="chat-messages">
            {chatMessages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.mine ? 'mine' : ''}`}>{m.text}</div>
            ))}
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              const text = chatDraft.trim();
              if (!text) return;
              session.send({ type: 'chat', text });
              setChatMessages((m) => [...m, { mine: true, text }]);
              setChatDraft('');
            }}
          >
            <input placeholder="Discuter…" value={chatDraft} maxLength={200} onChange={(e) => setChatDraft(e.target.value)} />
            <button type="submit">➤</button>
          </form>
        </div>
      </div>
      {game.result && !modalDismissed && (
        <GameOverModal
          result={game.result}
          playerColor={myColor}
          whiteName={myColor === 'w' ? profile.pseudo : opponent.name}
          blackName={myColor === 'b' ? profile.pseudo : opponent.name}
          onClose={() => setModalDismissed(true)}
          onAnalyze={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}
        />
      )}
    </div>
  );
}
