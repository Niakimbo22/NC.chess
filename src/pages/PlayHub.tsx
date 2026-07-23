import { Link } from 'react-router-dom';
import { NEO } from '../mascot/neo';
import './home.css';
import './playHub.css';

const MODES = [
  { to: '/play/bot', icon: '🤖', title: 'Contre une IA', desc: 'Des adversaires du débutant (250 Elo) au monstre (3200 Elo), chacun avec sa personnalité.' },
  { to: '/play/friend', icon: '👥', title: 'Entre amis', desc: 'Crée un salon, partage le code (ex. AF3P) ou le lien, et jouez en direct.' },
  { to: '/play/local', icon: '🪑', title: 'Sur le même écran', desc: 'Le mode « pass and play » : deux joueurs sur le même appareil.' },
];

export default function PlayHub() {
  return (
    <div className="home">
      <div className="home-hero">
        <h1>♟️ Jouer</h1>
        <p>Choisis ton mode de jeu.</p>
      </div>

      {/* Mode vedette : la partie guidée contre Néo. */}
      <Link to="/play/neo" className="neo-feature">
        <div className="neo-feature-avatar">
          <img src={NEO.avatar} alt="Néo" />
          <span className="neo-feature-spark">⚡</span>
        </div>
        <div className="neo-feature-text">
          <span className="neo-feature-badge">Nouveau · Mode éducatif</span>
          <h2>Jouer contre <span className="gold-text">Néo</span></h2>
          <p>
            Une partie guidée par ton cavalier coach : il te prévient avant les gaffes,
            félicite tes bons coups et te souffle un plan à la demande. Choisis ta difficulté.
          </p>
          <span className="neo-feature-cta">Commencer une partie guidée →</span>
        </div>
      </Link>

      <div className="home-grid">
        {MODES.map((c) => (
          <Link key={c.to} to={c.to} className="home-card">
            <span className="home-card-icon">{c.icon}</span>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
