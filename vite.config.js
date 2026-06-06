import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')

// GitHub Pages sirve la app bajo /app-studio/
// En dev (npm run dev) usamos '/' para que funcione localhost
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/app-studio/' : '/',
  define: {
    // Accesible en cualquier componente como: __APP_VERSION__
    __APP_VERSION__: JSON.stringify(version),
  },
}))
