import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Version de l'app : source de vérité = package.json, injectée à la
// compilation dans la constante globale __APP_VERSION__.
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// base './' : l'app fonctionne à la racine d'un domaine comme dans un
// sous-dossier (GitHub Pages). Le routing est en hash, donc aucun besoin
// de réécriture côté serveur.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'node',
  },
})
