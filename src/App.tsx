import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import InstallPwaButton from './components/InstallPwaButton';
import ShareButton from './components/ShareButton';
import { useSwipeNav } from './nav/useSwipeNav';
import { APP_VERSION } from './version';
import './app.css';

// Onglets principaux (barre du bas sur mobile, en haut sur desktop).
const PRIMARY_NAV = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/play', label: 'Jouer', icon: '♟️' },
  { to: '/puzzles', label: 'Puzzles', icon: '🧩' },
  { to: '/analysis', label: 'Analyse', icon: '📊' },
];

// Onglets secondaires : visibles dans la sidebar desktop, rangés dans la
// feuille « Plus » sur mobile pour désencombrer la barre du bas.
const SECONDARY_NAV = [
  { to: '/lessons', label: 'Leçons', icon: '🎓' },
  { to: '/openings', label: 'Ouvertures', icon: '📖' },
  { to: '/profile', label: 'Profil', icon: '👤' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
];

// Ordre de navigation par glissement (toutes les sections principales).
const SWIPE_ORDER = [...PRIMARY_NAV, ...SECONDARY_NAV].map((i) => i.to);

export default function App() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();

  useSwipeNav(SWIPE_ORDER);

  // Referme la feuille « Plus » à chaque changement de page.
  useEffect(() => setSheetOpen(false), [location.pathname]);

  // Sens de la transition entre pages : glissement gauche/droite selon le
  // déplacement dans SWIPE_ORDER (cohérent avec le swipe tactile), simple
  // fondu pour les pages hors de cet ordre.
  //
  // On calcule le sens PENDANT le rendu (mémorisé par route) et non dans un
  // effet : sinon le conteneur se monte avec un ancien sens puis change de
  // classe, ce qui relance l'animation CSS en plein vol → image figée/décalée
  // sur les pages lourdes (ex. Réglages et ses aperçus de thèmes).
  const navRef = useRef<{ path: string; dir: 'fwd' | 'back' | 'fade' }>({
    path: location.pathname,
    dir: 'fade',
  });
  if (navRef.current.path !== location.pathname) {
    const prevIdx = SWIPE_ORDER.indexOf(navRef.current.path);
    const curIdx = SWIPE_ORDER.indexOf(location.pathname);
    navRef.current = {
      path: location.pathname,
      dir: prevIdx === -1 || curIdx === -1 ? 'fade' : curIdx > prevIdx ? 'fwd' : 'back',
    };
  }
  const dir = navRef.current.dir;

  return (
    <div className="app-layout">
      <nav className="app-sidebar">
        <NavLink to="/" className="app-logo">
          <img src={`${import.meta.env.BASE_URL}icons/knight-medallion.svg`} alt="" />
          <span>NC<em>.chess</em></span>
        </NavLink>

        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `app-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="app-nav-icon">{item.icon}</span>
            <span className="app-nav-label">{item.label}</span>
          </NavLink>
        ))}

        {/* Secondaires : affichés dans la sidebar desktop, masqués en mobile. */}
        {SECONDARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-nav-item app-nav-item--secondary ${isActive ? 'active' : ''}`}
          >
            <span className="app-nav-icon">{item.icon}</span>
            <span className="app-nav-label">{item.label}</span>
          </NavLink>
        ))}

        {/* Bouton « Plus » : seulement sur mobile (ouvre la feuille). */}
        <button
          type="button"
          className={`app-nav-item app-nav-more ${sheetOpen ? 'active' : ''}`}
          onClick={() => setSheetOpen((v) => !v)}
        >
          <span className="app-nav-icon">⋯</span>
          <span className="app-nav-label">Plus</span>
        </button>

        <div className="app-sidebar-footer">
          <ShareButton />
          <InstallPwaButton />
          <div className="app-version">v{APP_VERSION}</div>
        </div>
      </nav>

      {/* Feuille « Plus » (mobile) : sections secondaires + partage + install. */}
      {sheetOpen && (
        <div className="nav-sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="nav-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="nav-sheet-handle" />
            {SECONDARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-sheet-item ${isActive ? 'active' : ''}`}
              >
                <span className="app-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="nav-sheet-sep" />
            <ShareButton variant="sheet" />
            <InstallPwaButton />
          </div>
        </div>
      )}

      <main className="app-main">
        <div key={location.pathname} className={`page-transition page-transition--${dir}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
