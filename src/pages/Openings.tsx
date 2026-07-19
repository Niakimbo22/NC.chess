import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import Chessboard from '../components/board/Chessboard';
import {
  loadOpenings,
  findOpening,
  continuationsAfter,
  searchOpenings,
  type Opening,
} from '../data/openingBook';
import './openings.css';

export default function Openings() {
  const [ready, setReady] = useState(false);
  const chessRef = useRef(new Chess());
  const [sans, setSans] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadOpenings().then(() => setReady(true));
  }, []);

  const fen = useMemo(() => {
    const chess = new Chess();
    for (const san of sans) chess.move(san);
    chessRef.current = chess;
    return chess.fen();
  }, [sans]);

  const opening = useMemo(() => (ready ? findOpening(sans) : null), [sans, ready]);
  const continuations = useMemo(() => (ready ? continuationsAfter(sans) : []), [sans, ready]);
  const results = useMemo(() => (ready && query ? searchOpenings(query) : []), [query, ready]);

  const lastMove = useMemo(() => {
    const chess = chessRef.current;
    const hist = chess.history({ verbose: true });
    const last = hist[hist.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [fen]);

  const loadLine = (o: Opening) => {
    setQuery('');
    setSans(o.line.split(' '));
  };

  if (!ready) {
    return <div style={{ textAlign: 'center', paddingTop: 80 }}><h1>📖 Chargement du livre d'ouvertures…</h1></div>;
  }

  return (
    <div className="openings-layout">
      <div className="openings-board-col">
        <div className="opening-name panel">
          {opening ? (
            <>
              <span className="opening-eco">{opening.eco}</span>
              <strong>{opening.name}</strong>
            </>
          ) : sans.length === 0 ? (
            <span style={{ color: 'var(--text-dim)' }}>Position de départ — joue un coup ou choisis une ligne</span>
          ) : (
            <span style={{ color: 'var(--text-dim)' }}>Hors du livre d'ouvertures</span>
          )}
        </div>
        <Chessboard
          fen={fen}
          orientation={flipped ? 'b' : 'w'}
          playableColor="both"
          onMove={(m) => {
            try {
              const chess = new Chess(fen);
              const move = chess.move({ from: m.from, to: m.to, promotion: m.promotion });
              setSans([...sans, move.san]);
            } catch { /* coup illégal */ }
          }}
          lastMove={lastMove}
        />
        <div className="review-nav">
          <button onClick={() => setSans([])} disabled={sans.length === 0}>⏮ Départ</button>
          <button onClick={() => setSans(sans.slice(0, -1))} disabled={sans.length === 0}>↩ Retour</button>
          <button onClick={() => setFlipped(!flipped)}>🔄</button>
        </div>
        <div className="opening-moves panel">
          {sans.map((s, i) => (
            <button key={i} className="opening-move-chip" onClick={() => setSans(sans.slice(0, i + 1))}>
              {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}{s}
            </button>
          ))}
        </div>
      </div>

      <div className="openings-side-col">
        <input
          placeholder="🔍 Chercher une ouverture (Sicilienne, London…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 ? (
          <div className="opening-results">
            {results.map((o, i) => (
              <button key={i} className="opening-result" onClick={() => loadLine(o)}>
                <span className="opening-eco">{o.eco}</span>
                <span className="opening-result-name">{o.name}</span>
                <span className="opening-result-line">{o.line}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="opening-continuations">
            <h3>Coups du livre</h3>
            {continuations.length === 0 && (
              <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                Plus de théorie ici — tu es en terrain libre !
              </p>
            )}
            {continuations.slice(0, 18).map((c) => (
              <button
                key={c.san}
                className="continuation-row"
                onClick={() => setSans([...sans, c.san])}
              >
                <span className="continuation-san">{c.san}</span>
                <span className="continuation-name">{c.reached.name}</span>
                <span className="continuation-count">{c.count} ligne{c.count > 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
