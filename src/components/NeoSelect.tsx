import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './neoSelect.css';

export interface NeoOption {
  value: string;
  label: string;
  icon?: string;
  /** Ligne secondaire, plus discrète, sous le libellé. */
  hint?: string;
}

interface Props {
  value: string;
  options: NeoOption[];
  onChange: (value: string) => void;
  /** Pastille de tête optionnelle, ex. « Thème ». */
  label?: string;
  ariaLabel?: string;
  /** Prend toute la largeur disponible. */
  block?: boolean;
  disabled?: boolean;
}

interface PopPos {
  left: number;
  top: number;
  width: number;
  /** Le panneau s'ouvre-t-il vers le haut (pas assez de place en bas) ? */
  up: boolean;
  maxHeight: number;
}

/**
 * Déroulant maison. Remplace les `<select>` natifs qui ouvraient le vilain menu
 * système du téléphone : ici tout est stylé et animé, dans la charte dorée de
 * l'app. Le panneau est rendu dans un portail en position fixe, pour échapper à
 * tout contexte d'empilement / débordement des cartes voisines. Fermé au clic
 * extérieur, à `Escape` ou à la sélection. Clavier : ↑/↓/Entrée/Home/Fin.
 */
export default function NeoSelect({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  block = false,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // index survolé au clavier
  const [pos, setPos] = useState<PopPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  const close = useCallback(() => setOpen(false), []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setActive(selectedIndex);
    setOpen(true);
  }, [disabled, selectedIndex]);

  const pick = useCallback(
    (v: string) => {
      onChange(v);
      close();
    },
    [onChange, close]
  );

  // Calcule la position du panneau sous (ou au-dessus de) le déclencheur.
  const reposition = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - margin;
    const spaceAbove = r.top - margin;
    const up = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(320, Math.max(140, (up ? spaceAbove : spaceBelow)));
    setPos({
      left: r.left,
      top: up ? r.top - margin : r.bottom + margin,
      width: r.width,
      up,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Repositionne au scroll / redimensionnement tant que le panneau est ouvert.
  useEffect(() => {
    if (!open) return;
    const onMove = () => reposition();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, reposition]);

  // Fermeture au clic hors du composant (déclencheur + panneau portalisé).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || popRef.current?.contains(target)) return;
      close();
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open, close]);

  // Amène l'option active dans la zone visible quand on navigue au clavier.
  useEffect(() => {
    if (!open || !popRef.current) return;
    const el = popRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options[active]) pick(options[active].value);
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={`neo-select ${block ? 'block' : ''} ${open ? 'open' : ''}`}
      onKeyDown={onKeyDown}
    >
      {label && <span className="neo-select-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className="neo-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
      >
        <span className="neo-select-value">
          {selected?.icon && <span className="neo-select-value-icon">{selected.icon}</span>}
          <span className="neo-select-value-text">{selected?.label ?? '—'}</span>
        </span>
        <span className="neo-select-chevron" aria-hidden="true">▾</span>
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={popRef}
            className={`neo-select-pop ${pos.up ? 'up' : ''}`}
            role="listbox"
            id={listId}
            tabIndex={-1}
            style={{
              left: pos.left,
              top: pos.top,
              width: pos.width,
              maxHeight: pos.maxHeight,
              transform: pos.up ? 'translateY(-100%)' : undefined,
            }}
          >
            {options.map((o, i) => (
              <button
                type="button"
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`neo-select-option ${o.value === value ? 'selected' : ''} ${i === active ? 'active' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(o.value)}
              >
                {o.icon && <span className="neo-select-option-icon">{o.icon}</span>}
                <span className="neo-select-option-body">
                  <span className="neo-select-option-label">{o.label}</span>
                  {o.hint && <span className="neo-select-option-hint">{o.hint}</span>}
                </span>
                <span className="neo-select-check" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
