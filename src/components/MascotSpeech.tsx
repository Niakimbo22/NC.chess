import { useState } from 'react';
import { NEO } from '../mascot/neo';
import './mascotSpeech.css';

/**
 * Bulle de dialogue de Néo, la mascotte de NC.chess. Affiche son avatar (le
 * cavalier doré) et une réplique. Le `tone` colore légèrement la bulle selon
 * l'humeur (réussite = doré, erreur = orange), et `key`-er le texte relance
 * l'animation d'apparition à chaque nouvelle phrase.
 */
export default function MascotSpeech({
  text,
  tone = 'neutral',
  compact = false,
}: {
  text: string;
  tone?: 'neutral' | 'success' | 'warn';
  compact?: boolean;
}) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className={`neo-speech ${tone} ${compact ? 'compact' : ''}`}>
      <div className="neo-avatar">
        {imgOk ? (
          <img src={NEO.avatar} alt={NEO.name} onError={() => setImgOk(false)} />
        ) : (
          <span className="neo-avatar-fallback">{NEO.emoji}</span>
        )}
      </div>
      <div className="neo-bubble">
        <span className="neo-name">{NEO.name}</span>
        <p className="neo-text" key={text}>{text}</p>
      </div>
    </div>
  );
}
