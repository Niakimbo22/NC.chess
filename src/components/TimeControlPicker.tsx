import { useState } from 'react';
import { TIME_CONTROLS, customTimeControl, type TimeControl } from '../game/timeControls';
import './timeControlPicker.css';

const CATEGORY_ICONS: Record<string, string> = {
  none: '∞',
  bullet: '🚀',
  blitz: '⚡',
  rapide: '⏱️',
  classique: '🐢',
};

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

  return (
    <div className="tcp">
      <div className="tcp-grid">
        {TIME_CONTROLS.map((tc) => (
          <button
            key={tc.id}
            className={`tcp-btn ${value.id === tc.id ? 'selected' : ''}`}
            onClick={() => onChange(tc)}
          >
            <span className="tcp-icon">{CATEGORY_ICONS[tc.category]}</span>
            <span>{tc.name}</span>
          </button>
        ))}
        <button
          className={`tcp-btn ${value.id.startsWith('custom') ? 'selected' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
        >
          <span className="tcp-icon">🛠️</span>
          <span>{value.id.startsWith('custom') ? value.name : 'Personnalisé'}</span>
        </button>
      </div>
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
