import { NavLink, Outlet } from 'react-router-dom';
import InstallPwaButton from './components/InstallPwaButton';
import './app.css';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/play', label: 'Jouer', icon: '♟️' },
  { to: '/puzzles', label: 'Puzzles', icon: '🧩' },
  { to: '/lessons', label: 'Leçons', icon: '🎓' },
  { to: '/analysis', label: 'Analyse', icon: '📊' },
  { to: '/openings', label: 'Ouvertures', icon: '📖' },
  { to: '/profile', label: 'Profil', icon: '👤' },
  { to: '/settings', label: 'Réglages', icon: '⚙️' },
];

export default function App() {
  return (
    <div className="app-layout">
      <nav className="app-sidebar">
        <NavLink to="/" className="app-logo">
          <img src={`${import.meta.env.BASE_URL}icons/knight-medallion.svg`} alt="" />
          <span>NC<em>.chess</em></span>
        </NavLink>
        {NAV_ITEMS.map((item) => (
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
        <InstallPwaButton compact />
        <div className="app-sidebar-footer">
          <InstallPwaButton />
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
