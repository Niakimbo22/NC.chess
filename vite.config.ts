import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' : l'app fonctionne à la racine d'un domaine comme dans un
// sous-dossier (GitHub Pages). Le routing est en hash, donc aucun besoin
// de réécriture côté serveur.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
