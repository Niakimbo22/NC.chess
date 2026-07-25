import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import './gameSheet.css';

const MOBILE_QUERY = '(max-width: 900px)';

/**
 * Tiroir de partie. Sur mobile l'échiquier doit occuper l'écran : tout le
 * secondaire (liste des coups, ouverture, navigation, abandon, réglages) vit
 * ici et ne s'ouvre que sur demande. Sur grand écran le contenu est rendu tel
 * quel dans la colonne latérale, sans bouton ni tiroir.
 *
 * Le panneau est monté dans <body> via un portail : « .app-main > * » porte une
 * animation d'entrée en fill-mode « both », donc un transform permanent, et un
 * ancêtre transformé sert de référentiel à position: fixed — le tiroir se
 * retrouvait ancré au layout de la partie au lieu de la fenêtre.
 */
export default function GameSheet({
  children,
  label = 'Partie',
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Passage en grand écran : le contenu redevient inline, on referme.
  useEffect(() => {
    if (!isMobile) setOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Grand écran : pas de tiroir du tout.
  if (!isMobile) return <>{children}</>;

  const panel = (
    <>
      <div
        className={`game-sheet-backdrop ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />
      <div className={`game-sheet ${open ? 'open' : ''}`} role="dialog" aria-modal="true">
        <div className="game-sheet-head">
          <span className="game-sheet-handle" />
          <button type="button" className="game-sheet-close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div className="game-sheet-body">
          {children}
          <Link to="/settings" className="game-sheet-settings" onClick={() => setOpen(false)}>
            ⚙️ Réglages
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="game-sheet-toggle"
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <span aria-hidden="true">☰</span> {label}
      </button>
      {typeof document !== 'undefined' && createPortal(panel, document.body)}
    </>
  );
}
