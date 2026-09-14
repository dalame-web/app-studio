import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')

// Vercel sirve la app en la raíz del dominio → base '/'.
// Capacitor necesita rutas relativas y su propia carpeta de salida: `npm run build:capacitor`.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'capacitor' ? './' : '/',
  build: mode === 'capacitor' ? { outDir: 'dist-capacitor' } : undefined,
  define: {
    // Accesible en cualquier componente como: __APP_VERSION__
    __APP_VERSION__: JSON.stringify(version),
  },
}))
