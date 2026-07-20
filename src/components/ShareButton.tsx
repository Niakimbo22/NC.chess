import { useState } from 'react';
import './shareButton.css';

const SHARE_TEXT =
  'Rejoins-moi sur NC.chess ♟️ — entraînement d’échecs gratuit : bots, puzzles, analyse et parties entre amis.';

/**
 * Bouton « Inviter un ami / Partager l'appli ».
 * Utilise l'API de partage native du système (feuille de partage mobile)
 * quand elle est disponible, sinon copie le lien dans le presse-papiers.
 */
export default function ShareButton({ variant = 'full' }: { variant?: 'full' | 'sheet' }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    // Lien de l'app tel qu'ouvert actuellement (racine, sans le hash de route).
    const url = `${location.origin}${location.pathname}`;

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'NC.chess', text: SHARE_TEXT, url });
        return;
      } catch {
        // Partage annulé par l'utilisateur ou indisponible → repli sur la copie.
      }
    }

    try {
      await navigator.clipboard.writeText(`${SHARE_TEXT} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers inaccessible (contexte non sécurisé) : rien de plus à faire.
    }
  };

  return (
    <button className={`share-btn share-btn--${variant}`} onClick={share} type="button">
      <span className="share-btn-icon">{copied ? '✓' : '🔗'}</span>
      <span>{copied ? 'Lien copié !' : 'Inviter un ami'}</span>
    </button>
  );
}
