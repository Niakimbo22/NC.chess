import { useState } from 'react';
import OpeningLabel from '../components/OpeningLabel';
import { useNavigate } from 'react-router-dom';
import type { Color } from 'chess.js';
import Chessboard from '../components/board/Chessboard';
import { GameOverModal, MoveList, NavButtons, PlayerBar } from '../components/GamePanel';
import TimeControlPicker from '../components/TimeControlPicker';
import { TIME_CONTROLS, type TimeControl } from '../game/timeControls';
import { useChessGame } from '../game/useChessGame';
import { saveGameToHistory } from '../store/gameHistory';

export default function PlayLocal() {
  const [config, setConfig] = useState<{ tc: TimeControl; white: string; black: string } | null>(null);

  if (!config) {
    return <Setup onStart={(tc, white, black) => setConfig({ tc, white, black })} />;
  }
  return <LocalGame key={JSON.stringify(config)} config={config} onExit={() => setConfig(null)} />;
}

function Setup({ onStart }: { onStart: (tc: TimeControl, white: string, black: string) => void }) {
  const [tc, setTc] = useState<TimeControl>(TIME_CONTROLS.find((t) => t.id === '10+0')!);
  const [white, setWhite] = useState('Blancs');
  const [black, setBlack] = useState('Noirs');

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1>🪑 Sur le même écran</h1>
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3>Cadence</h3>
          <TimeControlPicker value={tc} onChange={setTc} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Joueur blancs
            <input value={white} onChange={(e) => setWhite(e.target.value)} maxLength={20} />
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            Joueur noirs
            <input value={black} onChange={(e) => setBlack(e.target.value)} maxLength={20} />
          </label>
        </div>
        <button className="primary" style={{ fontSize: 17, padding: 14 }} onClick={() => onStart(tc, white || 'Blancs', black || 'Noirs')}>
          Commencer la partie
        </button>
      </div>
    </div>
  );
}

function LocalGame({
  config,
  onExit,
}: {
  config: { tc: TimeControl; white: string; black: string };
  onExit: () => void;
}) {
  const navigate = useNavigate();
  const [flipped, setFlipped] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [drawOffered, setDrawOffered] = useState(false);

  const game = useChessGame({
    timeControl: config.tc,
    onGameEnd: () => {
      saveGameToHistory({
        mode: 'local',
        white: config.white,
        black: config.black,
        pgn: game.chessRef.current.pgn(),
        timeControl: config.tc.id,
      });
    },
  });

  const orientation: Color = flipped ? 'b' : 'w';
  const topColor: Color = orientation === 'w' ? 'b' : 'w';
  const bottomColor: Color = orientation;
  const nameOf = (c: Color) => (c === 'w' ? config.white : config.black);

  const isLive = game.viewIndex < 0;

  return (
    <div className="game-layout">
      <div className="game-board-col">
        <PlayerBar
          name={nameOf(topColor)}
          color={topColor}
          history={game.history}
          clockMs={game.clock?.[topColor]}
          clockActive={game.clockRunning && game.turn === topColor && !game.result}
        />
        <Chessboard
          fen={game.viewFen}
          orientation={orientation}
          playableColor={isLive && !game.result ? 'both' : null}
          onMove={(m) => {
            game.makeMove(m);
            setDrawOffered(false);
          }}
          lastMove={game.lastMove}
        />
        <PlayerBar
          name={nameOf(bottomColor)}
          color={bottomColor}
          history={game.history}
          clockMs={game.clock?.[bottomColor]}
          clockActive={game.clockRunning && game.turn === bottomColor && !game.result}
        />
      </div>
      <div className="game-side-col">
        <OpeningLabel history={game.history} />
        <MoveList history={game.history} viewIndex={game.viewIndex} onSelect={(i) => game.goTo(i)} />
        <NavButtons historyLength={game.history.length} viewIndex={game.viewIndex} onGoTo={game.goTo} />
        <div className="game-actions">
          {!game.result ? (
            <>
              <button onClick={() => game.undo(1)} disabled={game.history.length === 0}>↩ Annuler</button>
              {drawOffered ? (
                <button className="primary" onClick={() => game.agreeDraw()}>Accepter la nulle ?</button>
              ) : (
                <button onClick={() => setDrawOffered(true)}>½ Nulle</button>
              )}
              <button className="danger" onClick={() => game.resign(game.turn)}>🏳 Abandon</button>
            </>
          ) : (
            <>
              <button className="primary" onClick={onExit}>Nouvelle partie</button>
              <button onClick={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}>
                📊 Analyser
              </button>
            </>
          )}
          <button onClick={() => setFlipped(!flipped)}>🔄 Retourner</button>
        </div>
      </div>
      {game.result && !modalDismissed && (
        <GameOverModal
          result={game.result}
          playerColor="both"
          whiteName={config.white}
          blackName={config.black}
          onClose={() => setModalDismissed(true)}
          onNewGame={onExit}
          onAnalyze={() => navigate('/analysis', { state: { pgn: game.chessRef.current.pgn() } })}
        />
      )}
    </div>
  );
}
