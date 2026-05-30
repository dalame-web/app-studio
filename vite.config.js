import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages sirve la app bajo /app-studio/
// En dev (npm run dev) usamos '/' para que funcione localhost
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/app-studio/' : '/',
}))
