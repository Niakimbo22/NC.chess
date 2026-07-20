import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Navigation par glissement horizontal (mobile) : balayer vers la gauche
 * ouvre le menu suivant, vers la droite le précédent, selon l'ordre `order`.
 *
 * Sécurités :
 * - ignore les gestes qui démarrent sur l'échiquier ou un champ de saisie
 *   (pour ne pas casser le drag des pièces ni la sélection de texte) ;
 * - n'agit que sur un balayage franchement horizontal et assez long ;
 * - ne fait rien si la route courante n'est pas dans `order` (ex. en pleine
 *   partie sur /play/bot), ce qui évite de sortir d'une partie par accident.
 */
export function useSwipeNav(order: string[]) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest('.nc-board, input, textarea, select, .chat, [data-no-swipe]')) {
        tracking = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Balayage horizontal net : au moins 70px et deux fois plus horizontal
      // que vertical.
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;

      const idx = order.indexOf(location.pathname);
      if (idx === -1) return;
      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= order.length) return;
      navigate(order[nextIdx]);
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [order, location.pathname, navigate]);
}
