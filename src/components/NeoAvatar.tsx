import { useState } from 'react';
import { NEO } from '../mascot/neo';
import './neoAvatar.css';

/**
 * Avatar réutilisable de Néo, la mascotte (le cavalier doré). Utilisé partout
 * où Néo prend la parole : coach des leçons, coach d'analyse, indices, etc.
 * Retombe sur l'emoji ♞ si l'image ne charge pas.
 */
export default function NeoAvatar({
  size = 40,
  spark = false,
  bob = false,
  className = '',
}: {
  size?: number;
  /** Affiche la petite étincelle ⚡ (l'énergie de Néo). */
  spark?: boolean;
  /** Petite animation de flottement. */
  bob?: boolean;
  className?: string;
}) {
  const [ok, setOk] = useState(true);
  return (
    <span
      className={`neo-av ${bob ? 'neo-av--bob' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {ok ? (
        <img src={NEO.avatar} alt={NEO.name} onError={() => setOk(false)} />
      ) : (
        <span className="neo-av-fallback" style={{ fontSize: size * 0.6 }}>{NEO.emoji}</span>
      )}
      {spark && <span className="neo-av-spark" style={{ fontSize: size * 0.34 }}>⚡</span>}
    </span>
  );
}
