import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import Home from './pages/Home';
import PlayHub from './pages/PlayHub';
import PlayLocal from './pages/PlayLocal';
import PlayBot from './pages/PlayBot';
import PlayNeo from './pages/PlayNeo';
import PlayFriend from './pages/PlayFriend';
import Settings from './pages/Settings';
import Analysis from './pages/Analysis';
import Puzzles from './pages/Puzzles';
import Lessons from './pages/Lessons';
import Openings from './pages/Openings';
import Profile from './pages/Profile';
import './index.css';

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'play', element: <PlayHub /> },
      { path: 'play/local', element: <PlayLocal /> },
      { path: 'play/bot', element: <PlayBot /> },
      { path: 'play/neo', element: <PlayNeo /> },
      { path: 'play/friend', element: <PlayFriend /> },
      { path: 'puzzles', element: <Puzzles /> },
      { path: 'lessons', element: <Lessons /> },
      { path: 'analysis', element: <Analysis /> },
      { path: 'openings', element: <Openings /> },
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

// PWA : installable et utilisable hors ligne (tout tourne en local)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
