import { useEffect, useState } from 'react';
import { useSettings } from '../store/settings';
import { BOARD_THEMES, PIECE_SETS, SOUND_PACKS, pieceUrl } from '../themes/boardThemes';
import { playSound } from '../audio/sounds';
import { listFrenchVoices, resetVoiceCache, speak } from '../coach/voice';
import './settings.css';

export default function Settings() {
  const s = useSettings();

  return (
    <div className="settings">
      <h1>⚙️ Réglages</h1>

      <section className="panel">
        <h2>🎨 Thème de l'échiquier</h2>
        <div className="theme-grid">
          {BOARD_THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-card ${s.boardTheme === t.id ? 'selected' : ''}`}
              onClick={() => s.set({ boardTheme: t.id })}
            >
              <span className="theme-preview">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} style={{ background: i % 3 === 0 ? t.light : t.dark }} />
                ))}
              </span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>♞ Jeu de pièces</h2>
        <div className="piece-grid">
          {PIECE_SETS.map((p) => (
            <button
              key={p.id}
              className={`piece-card ${s.pieceSet === p.id ? 'selected' : ''}`}
              onClick={() => s.set({ pieceSet: p.id })}
            >
              <span className="piece-preview">
                <img src={pieceUrl(p.id, 'w', 'n')} alt="" />
                <img src={pieceUrl(p.id, 'b', 'q')} alt="" />
              </span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>🔊 Sons</h2>
        <Toggle label="Sons activés" checked={s.soundEnabled} onChange={(v) => s.set({ soundEnabled: v })} />
        <div className="sound-packs">
          {SOUND_PACKS.map((p) => (
            <button
              key={p.id}
              className={`sound-card ${s.soundPack === p.id ? 'selected' : ''}`}
              onClick={() => {
                s.set({ soundPack: p.id });
                setTimeout(() => playSound('Move'), 50);
                setTimeout(() => playSound('Capture'), 450);
              }}
            >
              🎵 {p.name}
            </button>
          ))}
        </div>
        <label className="slider-row">
          Volume : {Math.round(s.volume * 100)} %
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => s.set({ volume: Number(e.target.value) })}
            onMouseUp={() => playSound('Move')}
          />
        </label>
      </section>

      <section className="panel">
        <h2>🎛️ Jeu</h2>
        <Toggle label="Afficher les coups légaux" checked={s.showLegalMoves} onChange={(v) => s.set({ showLegalMoves: v })} />
        <Toggle label="Surligner le dernier coup" checked={s.highlightLastMove} onChange={(v) => s.set({ highlightLastMove: v })} />
        <Toggle label="Coordonnées (a-h, 1-8)" checked={s.showCoordinates} onChange={(v) => s.set({ showCoordinates: v })} />
        <Toggle label="Pré-coups (jouer pendant le tour adverse)" checked={s.premoveEnabled} onChange={(v) => s.set({ premoveEnabled: v })} />
        <Toggle label="Promotion automatique en dame" checked={s.autoQueen} onChange={(v) => s.set({ autoQueen: v })} />
        <Toggle label="Confirmer chaque coup (anti-doigt qui glisse)" checked={s.confirmMove} onChange={(v) => s.set({ confirmMove: v })} />
        <Toggle label="Barre d'évaluation (analyse)" checked={s.showEvalBar} onChange={(v) => s.set({ showEvalBar: v })} />
        <label className="slider-row">
          Vitesse d'animation : {s.animationMs === 0 ? 'désactivée' : `${s.animationMs} ms`}
          <input
            type="range"
            min={0}
            max={500}
            step={20}
            value={s.animationMs}
            onChange={(e) => s.set({ animationMs: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="panel">
        <h2>🗣️ Coach</h2>
        <Toggle label="Voix du coach (synthèse vocale)" checked={s.coachVoice} onChange={(v) => s.set({ coachVoice: v })} />
        {s.coachVoice && <VoicePicker />}
      </section>

      <button className="danger" onClick={() => s.reset()}>Réinitialiser tous les réglages</button>
    </div>
  );
}

function VoicePicker() {
  const s = useSettings();
  const [voices, setVoices] = useState(listFrenchVoices());

  useEffect(() => {
    // Les voix arrivent parfois après le chargement de la page
    const refresh = () => setVoices(listFrenchVoices());
    refresh();
    if ('speechSynthesis' in window) {
      speechSynthesis.addEventListener('voiceschanged', refresh);
      return () => speechSynthesis.removeEventListener('voiceschanged', refresh);
    }
  }, []);

  if (voices.length === 0) {
    return <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Aucune voix française détectée sur ce système.</p>;
  }

  return (
    <div className="slider-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <span>Voix :</span>
      <select
        style={{ flex: 1 }}
        value={s.coachVoiceName ?? ''}
        onChange={(e) => {
          s.set({ coachVoiceName: e.target.value || null });
          resetVoiceCache();
          setTimeout(() => speak('Bonjour ! Je suis ton coach d’échecs.'), 100);
        }}
      >
        <option value="">Automatique (meilleure voix détectée)</option>
        {voices.map((v) => (
          <option key={v.name} value={v.name}>{v.name}</option>
        ))}
      </select>
      <button onClick={() => speak('Bonjour ! Je suis ton coach d’échecs. En avant pour la victoire !')}>▶ Tester</button>
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" />
      </button>
    </label>
  );
}
