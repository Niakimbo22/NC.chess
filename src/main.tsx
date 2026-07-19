import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import PlayHub from './pages/PlayHub';
import PlayLocal from './pages/PlayLocal';
import PlayBot from './pages/PlayBot';
import PlayFriend from './pages/PlayFriend';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import './index.css';

function Soon({ title }: { title: string }) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <h1>{title}</h1>
      <p style={{ color: 'var(--text-dim)' }}>Bientôt disponible — en construction 🚧</p>
    </div>
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'play', element: <PlayHub /> },
      { path: 'play/local', element: <PlayLocal /> },
      { path: 'play/bot', element: <PlayBot /> },
      { path: 'play/friend', element: <PlayFriend /> },
      { path: 'puzzles', element: <Soon title="🧩 Puzzles" /> },
      { path: 'lessons', element: <Soon title="🎓 Leçons" /> },
      { path: 'analysis', element: <Soon title="📊 Analyse" /> },
      { path: 'openings', element: <Soon title="📖 Ouvertures" /> },
      { path: 'profile', element: <Profile /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
