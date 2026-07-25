import { useState } from 'react';
import { TIME_CONTROLS, customTimeControl, type TimeControl } from '../game/timeControls';
import './timeControlPicker.css';

/**
 * Sélecteur de cadence. L'ancienne version alignait treize grosses cartes
 * identiques sur deux colonnes : il fallait scroller pour tout voir et rien ne
 * hiérarchisait les choix. Ici les cadences sont groupées par famille, en
 * pastilles compactes, avec le temps en gros et l'incrément en exposant — on
 * voit tout d'un coup d'œil.
 */

interface Family {
  key: string;
  label: string;
  icon: string;
  hint: string;
}

const FAMILIES: Family[] = [
  { key: 'bullet', label: 'Bullet', icon: '🚀', hint: 'ça va très vite' },
  { key: 'blitz', label: 'Blitz', icon: '⚡', hint: 'nerveux' },
  { key: 'rapide', label: 'Rapide', icon: '⏱️', hint: 'le bon équilibre' },
  { key: 'classique', label: 'Classique', icon: '🐢', hint: 'tout le temps de réfléchir' },
];

/** « 10 min » → 10 ; « 3 | 2 » → 3. Le libellé sert de source unique. */
function splitName(tc: TimeControl): { main: string; inc: string | null } {
  if (tc.initial == null) return { main: '∞', inc: null };
  const minutes = tc.initial % 60 === 0 ? String(tc.initial / 60) : (tc.initial / 60).toFixed(2);
  return { main: minutes, inc: tc.increment > 0 ? `+${tc.increment}` : null };
}

export default function TimeControlPicker({
  value,
  onChange,
}: {
  value: TimeControl;
  onChange: (tc: TimeControl) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customMin, setCustomMin] = useState(15);
  const [customInc, setCustomInc] = useState(10);

  const noClock = TIME_CONTROLS[0];
  const isCustom = value.id.startsWith('custom');

  return (
    <div className="tcp">
      {/* Récapitulatif : la cadence retenue, toujours lisible en un coup d'œil. */}
      <div className="tcp-readout">
        <span className="tcp-readout-value">
          {value.initial == null ? '∞' : splitName(value).main}
          {value.increment > 0 && <em>+{value.increment}</em>}
        </span>
        <span className="tcp-readout-label">
          {value.initial == null ? 'Sans pendule' : value.name}
          <small>{isCustom ? 'cadence personnalisée' : familyHint(value.category)}</small>
        </span>
      </div>

      <button
        type="button"
        className={`tcp-noclock ${value.id === noClock.id ? 'selected' : ''}`}
        onClick={() => onChange(noClock)}
      >
        <span className="tcp-noclock-icon">∞</span>
        <span>
          <strong>Sans pendule</strong>
          <small>prends le temps d’écouter Néo</small>
        </span>
      </button>

      {FAMILIES.map((f) => {
        const items = TIME_CONTROLS.filter((tc) => tc.category === f.key);
        if (items.length === 0) return null;
        return (
          <div className="tcp-family" key={f.key}>
            <span className="tcp-family-head">
              <span className="tcp-family-icon">{f.icon}</span>
              {f.label}
              <small>{f.hint}</small>
            </span>
            <div className="tcp-chips">
              {items.map((tc) => {
                const { main, inc } = splitName(tc);
                return (
                  <button
                    type="button"
                    key={tc.id}
                    className={`tcp-chip ${value.id === tc.id ? 'selected' : ''}`}
                    onClick={() => onChange(tc)}
                  >
                    <span className="tcp-chip-main">{main}</span>
                    {inc && <span className="tcp-chip-inc">{inc}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        className={`tcp-custom-toggle ${isCustom ? 'selected' : ''}`}
        onClick={() => setShowCustom(!showCustom)}
      >
        🛠️ {isCustom ? value.name : 'Cadence personnalisée'}
      </button>

      {showCustom && (
        <div className="tcp-custom">
          <label>
            Minutes
            <input
              type="number"
              min={0.25}
              max={180}
              step={0.25}
              value={customMin}
              onChange={(e) => setCustomMin(Number(e.target.value))}
            />
          </label>
          <label>
            Incrément (s)
            <input
              type="number"
              min={0}
              max={180}
              value={customInc}
              onChange={(e) => setCustomInc(Number(e.target.value))}
            />
          </label>
          <button
            className="primary"
            onClick={() => {
              onChange(customTimeControl(Math.max(15, Math.round(customMin * 60)), Math.max(0, customInc)));
              setShowCustom(false);
            }}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}

function familyHint(category: string): string {
  return FAMILIES.find((f) => f.key === category)?.label ?? '';
}
