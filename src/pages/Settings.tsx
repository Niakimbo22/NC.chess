import { useEffect, useState } from 'react';
import { useSettings } from '../store/settings';
import { BOARD_THEMES, PIECE_SETS, SOUND_PACKS, pieceUrl } from '../themes/boardThemes';
import { playSound } from '../audio/sounds';
import { currentVoiceName, listFrenchVoices, resetVoiceCache, speak, stopSpeaking, voiceIsRobotic } from '../coach/voice';
import { APP_VERSION } from '../version';
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
        <h2>🗣️ Voix de Néo</h2>
        <Toggle
          label="Lire les messages à voix haute"
          checked={s.coachVoice}
          onChange={(v) => {
            stopSpeaking();
            s.set({ coachVoice: v });
            // La première phrase doit partir du geste de l'utilisateur : c'est
            // ce qui autorise la synthèse sur iOS, en plus de la faire entendre.
            if (v) setTimeout(() => speak('Bonjour, je suis Néo. Voix activée.', { force: true }), 0);
          }}
        />
        <p className="voice-hint">
          Coupée par défaut : la voix ne vient pas de NC.chess mais du moteur de
          synthèse de ton appareil, et certaines sont franchement pénibles. Néo
          écrit tout, de toute façon — la voix est un bonus, jamais une obligation.
        </p>
        {s.coachVoice && <VoicePicker />}
      </section>

      <button className="danger" onClick={() => s.reset()}>Réinitialiser tous les réglages</button>

      <section className="panel about-panel">
        <h2>ℹ️ À propos</h2>
        <div className="about-row">
          <span>Version</span>
          <span className="about-version">v{APP_VERSION}</span>
        </div>
        <p className="about-note">
          NC<em>.chess</em> — entraînement d’échecs, 100 % gratuit. Tout tourne
          en local sur ton appareil.
        </p>
      </section>
    </div>
  );
}

function VoicePicker() {
  const s = useSettings();
  const [voices, setVoices] = useState(listFrenchVoices());
  const [robotic, setRobotic] = useState(false);

  useEffect(() => {
    // Les voix arrivent parfois après le chargement de la page
    const refresh = () => {
      setVoices(listFrenchVoices());
      setRobotic(voiceIsRobotic());
    };
    refresh();
    if ('speechSynthesis' in window) {
      speechSynthesis.addEventListener('voiceschanged', refresh);
      return () => speechSynthesis.removeEventListener('voiceschanged', refresh);
    }
  }, []);

  return (
    <>
    {/* Les voix ne viennent pas de l'app mais du moteur de synthèse du téléphone :
        on ne peut pas en fabriquer une meilleure, seulement le dire clairement et
        proposer celles qui sont installées. */}
    {robotic && (
      <p className="voice-note">
        ⚠️ La voix française utilisée est <strong>{currentVoiceName()}</strong> — une
        voix de synthèse au timbre très plat. NC.chess ne peut pas la remplacer : les
        voix viennent du système, pas de l’app. Deux solutions : installer un autre
        moteur de synthèse (Réglages Android → Gestion générale → Synthèse vocale),
        puis revenir choisir la nouvelle voix ici — ou couper la voix, Néo écrit tout
        de toute façon.
      </p>
    )}
    {/* Le débit, la hauteur et la verbosité restent réglables même sans voix
        française installée : ils s'appliquent à celle que le système fournira. */}
    {voices.length === 0 ? (
      <p className="voice-hint">Aucune voix française détectée sur cet appareil.</p>
    ) : (
      <div className="slider-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <span>Voix :</span>
        <select
          style={{ flex: 1 }}
          value={s.coachVoiceName ?? ''}
          onChange={(e) => {
            s.set({ coachVoiceName: e.target.value || null });
            resetVoiceCache();
            setRobotic(voiceIsRobotic()); // l'avertissement doit suivre le choix
            setTimeout(() => speak('Bonjour ! Je suis ton coach d’échecs.', { force: true }), 100);
          }}
        >
          <option value="">Automatique (meilleure voix détectée)</option>
          {voices.map((v) => (
            <option key={v.name} value={v.name}>{v.name}</option>
          ))}
        </select>
      </div>
    )}

    {/* Combien Néo parle : c'est le vrai bouton « supportable ». Par défaut il
        se tait sauf quand ça compte ou quand on lui demande. */}
    <div className="voice-scope">
      <span>Néo parle…</span>
      <div className="voice-scope-choices">
        <button
          className={s.coachVoiceScope === 'key' ? 'selected' : ''}
          onClick={() => s.set({ coachVoiceScope: 'key' })}
        >
          Seulement quand ça compte
          <em>Avertissement avant une gaffe, conseil demandé, fin de partie.</em>
        </button>
        <button
          className={s.coachVoiceScope === 'all' ? 'selected' : ''}
          onClick={() => s.set({ coachVoiceScope: 'all' })}
        >
          Tout lire à voix haute
          <em>Leçons, défis et messages d’ambiance en plus.</em>
        </button>
      </div>
    </div>

    {/* Débit et hauteur : d'un téléphone à l'autre la même voix passe de
        « posée » à « criarde ». Deux curseurs valent mieux qu'un long discours. */}
    <label className="slider-row">
      Débit : {s.coachVoiceRate.toFixed(2)}×
      <input
        type="range" min={0.7} max={1.3} step={0.05}
        value={s.coachVoiceRate}
        onChange={(e) => s.set({ coachVoiceRate: Number(e.target.value) })}
      />
    </label>
    <label className="slider-row">
      Hauteur : {s.coachVoicePitch.toFixed(2)}
      <input
        type="range" min={0.7} max={1.3} step={0.05}
        value={s.coachVoicePitch}
        onChange={(e) => s.set({ coachVoicePitch: Number(e.target.value) })}
      />
    </label>

    <div className="voice-test-row">
      <button onClick={() => speak('Bonjour ! Je suis Néo, ton coach d’échecs. Attention à ta dame.', { force: true })}>
        ▶ Écouter
      </button>
      <button onClick={stopSpeaking}>⏹ Stop</button>
    </div>
    </>
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
