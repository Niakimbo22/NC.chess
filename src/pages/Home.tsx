import { Link } from 'react-router-dom';
import './home.css';

const CARDS = [
  { to: '/play/bot', icon: '🤖', title: 'Jouer contre une IA', desc: 'Des bots de tous les niveaux, du débutant au grand maître.' },
  { to: '/play/friend', icon: '👥', title: 'Jouer entre amis', desc: 'Crée un salon avec un code (ex. AF3P) et joue en direct.' },
  { to: '/play/local', icon: '🪑', title: 'Sur le même écran', desc: 'Deux joueurs, un seul appareil, chacun son tour.' },
  { to: '/puzzles', icon: '🧩', title: 'Puzzles illimités', desc: 'Des milliers d’exercices tactiques pour progresser.' },
  { to: '/lessons', icon: '🎓', title: 'Leçons', desc: 'Apprends les ouvertures, tactiques et finales avec le coach.' },
  { to: '/analysis', icon: '📊', title: 'Analyse', desc: 'Analyse illimitée de tes parties avec Stockfish.' },
];

export default function Home() {
  return (
    <div className="home">
      <div className="home-hero">
        <h1>
          Bienvenue sur <span className="brand">NC<em>.chess</em></span>
        </h1>
        <p>Toutes les fonctionnalités premium des échecs, 100 % gratuites. Entraîne-toi, joue, progresse.</p>
      </div>
      <div className="home-grid">
        {CARDS.map((c) => (
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
