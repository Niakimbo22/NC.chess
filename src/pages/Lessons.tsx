import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import Chessboard, { type Arrow, type BoardMove } from '../components/board/Chessboard';
import { LESSONS, type Lesson } from '../data/lessons';
import { speak, stopSpeaking } from '../coach/voice';
import { useSettings } from '../store/settings';
import { playSound } from '../audio/sounds';
import './lessons.css';

const DONE_KEY = 'ncchess-lessons-done';

function loadDone(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export default function Lessons() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [done, setDone] = useState<Set<string>>(loadDone);

  const markDone = useCallback((id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  if (lesson) {
    return (
      <LessonPlayer
        lesson={lesson}
        onFinish={() => {
          markDone(lesson.id);
          setLesson(null);
        }}
        onExit={() => setLesson(null)}
      />
    );
  }

  const categories = [...new Set(LESSONS.map((l) => l.category))];

  return (
    <div className="lessons-page">
      <h1>🎓 Leçons</h1>
      <p style={{ color: 'var(--text-dim)' }}>
        Des cours interactifs avec ton coach — {done.size}/{LESSONS.length} terminés.
      </p>
      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="lesson-category">{cat}</h2>
          <div className="lesson-grid">
            {LESSONS.filter((l) => l.category === cat).map((l) => (
              <button key={l.id} className="lesson-card" onClick={() => setLesson(l)}>
                <span className="lesson-icon">{l.icon}</span>
                <span className="lesson-title">
                  {l.title} {done.has(l.id) && <span className="lesson-done">✓</span>}
                </span>
                <span className="lesson-desc">{l.description}</span>
                <span className="lesson-steps">{l.steps.length} étapes</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LessonPlayer({
  lesson,
  onFinish,
  onExit,
}: {
  lesson: Lesson;
  onFinish: () => void;
  onExit: () => void;
}) {
  const settings = useSettings();
  const [stepIndex, setStepIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'hint' | 'success'>('hint');
  const [fen, setFen] = useState(lesson.steps[0].fen);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = lesson.steps[stepIndex];
  const isLast = stepIndex === lesson.steps.length - 1;

  // Nouvelle étape : position, lecture vocale
  useEffect(() => {
    setFen(step.fen);
    setSolved(false);
    setMessage(null);
    setLastMove(null);
    speak(step.text);
    return () => {
      stopSpeaking();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, lesson.id]);

  const playerColor = useMemo(() => new Chess(step.fen).turn(), [step.fen]);

  const onMove = useCallback(
    (bm: BoardMove) => {
      if (!step.task || solved) return;
      const uci = bm.from + bm.to + (bm.promotion ?? '');
      const chess = new Chess(fen);
      let move;
      try {
        move = chess.move({ from: bm.from, to: bm.to, promotion: bm.promotion });
      } catch {
        return;
      }
      if (step.task.accepted.includes(uci)) {
        setFen(chess.fen());
        setLastMove({ from: move.from, to: move.to });
        setSolved(true);
        setMessage(step.task.success);
        setMessageKind('success');
        playSound(chess.isCheckmate() ? 'Checkmate' : 'Confirmation');
        speak(step.task.success);
      } else {
        setFen(chess.fen());
        setLastMove({ from: move.from, to: move.to });
        playSound('Error');
        setMessage(step.task.hint);
        setMessageKind('hint');
        timerRef.current = setTimeout(() => {
          setFen(step.fen);
          setLastMove(null);
        }, 800);
      }
    },
    [step, fen, solved]
  );

  const canAdvance = !step.task || solved;

  return (
    <div className="lesson-layout">
      <div className="lesson-board-col">
        <div className="lesson-header panel">
          <span className="lesson-icon">{lesson.icon}</span>
          <strong>{lesson.title}</strong>
          <span className="lesson-progress">Étape {stepIndex + 1}/{lesson.steps.length}</span>
        </div>
        <Chessboard
          fen={fen}
          orientation={playerColor}
          playableColor={step.task && !solved ? playerColor : null}
          onMove={onMove}
          lastMove={lastMove}
          arrows={(step.arrows ?? []).map((a) => ({ ...a, color: 'rgba(61, 159, 232, 0.8)' })) as Arrow[]}
          markedSquares={step.marks ?? []}
        />
        <div className="lesson-progressbar">
          <div style={{ width: `${((stepIndex + (canAdvance ? 1 : 0.4)) / lesson.steps.length) * 100}%` }} />
        </div>
      </div>
      <div className="lesson-side-col">
        <div className="coach-box lesson-coach">
          <span className="coach-face">🧑‍🏫</span>
          <div>
            <p>{step.text}</p>
            {message && <p className={`lesson-msg ${messageKind}`}>{message}</p>}
          </div>
          {settings.coachVoice && (
            <button title="Réécouter" onClick={() => speak(message && messageKind === 'success' ? message : step.text)}>🔊</button>
          )}
        </div>
        {step.task && !solved && (
          <button onClick={() => { setMessage(step.task!.hint); setMessageKind('hint'); speak(step.task!.hint); }}>
            💡 Indice
          </button>
        )}
        <div className="game-actions">
          <button onClick={() => setStepIndex(Math.max(0, stepIndex - 1))} disabled={stepIndex === 0}>← Précédent</button>
          {isLast ? (
            <button className="primary" disabled={!canAdvance} onClick={onFinish}>🎉 Terminer la leçon</button>
          ) : (
            <button className="primary" disabled={!canAdvance} onClick={() => setStepIndex(stepIndex + 1)}>Continuer →</button>
          )}
        </div>
        <button onClick={onExit}>← Toutes les leçons</button>
      </div>
    </div>
  );
}
