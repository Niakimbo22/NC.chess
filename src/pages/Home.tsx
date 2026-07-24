import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../store/profile';
import MascotSpeech from '../components/MascotSpeech';
import { neoSay } from '../mascot/neo';
import './home.css';

const CARDS = [
  { to: '/play/neo', icon: '♞', title: 'Jouer contre Néo', desc: 'Une partie guidée par ton cavalier coach. Le mode le plus éducatif.' },
  { to: '/play/bot', icon: '🤖', title: 'Jouer contre une IA', desc: 'Des bots de tous les niveaux, du débutant au grand maître.' },
  { to: '/play/friend', icon: '👥', title: 'Jouer entre amis', desc: 'Crée un salon avec un code (ex. AF3P) et joue en direct.' },
  { to: '/play/local', icon: '🪑', title: 'Sur le même écran', desc: 'Deux joueurs, un seul appareil, chacun son tour.' },
  { to: '/puzzles', icon: '🧩', title: 'Puzzles illimités', desc: 'Des milliers d’exercices tactiques pour progresser.' },
  { to: '/drills', icon: '🎯', title: 'Défis', desc: 'Des exercices ciblés, une compétence à la fois, avec Néo comme instructeur.' },
  { to: '/lessons', icon: '🎓', title: 'Leçons', desc: 'Apprends les ouvertures, tactiques et finales avec le coach.' },
  { to: '/analysis', icon: '📊', title: 'Analyse', desc: 'Analyse illimitée de tes parties avec Stockfish.' },
];

export default function Home() {
  const profile = useProfile();
  const dailyDone = localStorage.getItem('ncchess-daily') === new Date().toISOString().slice(0, 10);
  const neoWelcome = useMemo(() => neoSay('welcome'), []);

  return (
    <div className="home">
      <div className="home-hero">
        <h1>
          Bienvenue, <span className="brand">{profile.pseudo}</span> {profile.avatar}
        </h1>
        <p>Toutes les fonctionnalités premium des échecs, 100 % gratuites. Entraîne-toi, joue, progresse.</p>
        <div className="home-neo"><MascotSpeech text={neoWelcome} /></div>
        <div className="home-stats">
          <Link to="/profile" className="home-stat">
            <span className="home-stat-value">{profile.elo}</span>
            <span className="home-stat-label">Elo</span>
          </Link>
          <Link to="/profile" className="home-stat">
            <span className="home-stat-value">{profile.puzzleElo}</span>
            <span className="home-stat-label">Elo puzzle</span>
          </Link>
          <Link to="/puzzles" className="home-stat">
            <span className="home-stat-value">{dailyDone ? '✅' : '🧩'}</span>
            <span className="home-stat-label">Puzzle du jour</span>
          </Link>
        </div>
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
