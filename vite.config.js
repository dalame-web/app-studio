import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')
const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(__dirname, 'public', 'content')
const MANIFEST_PATH = join(__dirname, 'public', 'manifest.json')

// Middleware SOLO de `npm run dev` (configureServer nunca se ejecuta en
// `vite build`/`vite build --mode capacitor` — cero efecto en producción/APK).
// Deja que el editor local (editor.html) guarde una ficha directamente en
// public/content/{subject}/ del disco, sin publicar a git, para poder verla
// en la app real (localhost:5173/) usando "Borrar contenido y recargar" del
// admin — misma ruta de sincronización que ya existe, ningún cambio ahí.
function editorLocalPlugin() {
  return {
    name: 'guardar-ficha-local',
    configureServer(server) {
      server.middlewares.use('/__editor-api/guardar-ficha', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const ficha = JSON.parse(body);
            if (!ficha?.id || !ficha?.subject) throw new Error('Ficha sin id/subject');

            const dir = join(CONTENT_DIR, ficha.subject);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, `${ficha.id}.json`), JSON.stringify(ficha, null, 2), 'utf8');

            // Regenerar el index.json de esa asignatura a partir de TODOS sus
            // archivos en disco (igual que hace scripts/publicar.js).
            const fichas = readdirSync(dir)
              .filter(f => f.endsWith('.json') && f !== 'index.json')
              .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')))
              .map(f => ({ id: f.id, titulo: f.titulo, nivel: f.nivel, numEjercicios: f.ejercicios?.length ?? 0 }));
            const versionLocal = `local-${Date.now()}`;
            const indice = { version: versionLocal, subject: ficha.subject, fichas };
            writeFileSync(join(dir, 'index.json'), JSON.stringify(indice, null, 2), 'utf8');

            // manifest.json es lo que la app mira PRIMERO para saber qué asignaturas
            // sincronizar y con qué versión — sin esto, una asignatura nueva (o una
            // ya existente sin subir de versión) nunca se llega ni a pedir.
            const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : { asignaturas: {} };
            manifest.asignaturas = { ...manifest.asignaturas, [ficha.subject]: { version: versionLocal } };
            writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (e) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    },
  };
}

// Vercel sirve la app en la raíz del dominio → base '/'.
// Capacitor necesita rutas relativas y su propia carpeta de salida: `npm run build:capacitor`.
export default defineConfig(({ command, mode }) => ({
  plugins: [react(), command === 'serve' && editorLocalPlugin()].filter(Boolean),
  base: mode === 'capacitor' ? './' : '/',
  build: mode === 'capacitor' ? { outDir: 'dist-capacitor' } : undefined,
  define: {
    // Accesible en cualquier componente como: __APP_VERSION__
    __APP_VERSION__: JSON.stringify(version),
  },
}))
