import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync, execFileSync } from 'child_process'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')
const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(__dirname, 'public', 'content')
const MANIFEST_PATH = join(__dirname, 'public', 'manifest.json')
const EJERCICIOS_PATH = join(__dirname, 'public', 'ejercicios.json')

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function responder(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Escribe index.json de una asignatura y bump de manifest.json a partir de una
// lista de fichas YA DECIDIDA por el caller — nunca escanea disco. Usada tanto
// por el guardado local (una ficha) como por publicar (la lista filtrada por
// exclusiones), para que el índice publicado jamás referencie una ficha que no
// se ha subido de verdad (si no, la app la ve en el índice y el fetch da 404).
function escribirIndice(subject, fichas) {
  const dir = join(CONTENT_DIR, subject);
  const resumen = fichas
    .map(f => ({ id: f.id, titulo: f.titulo, nivel: f.nivel, numEjercicios: f.ejercicios?.length ?? 0 }));
  const versionLocal = `local-${Date.now()}`;

  // Nunca borrar la carpeta ni la entrada del manifest solo porque de momento
  // tenga 0 fichas — eso pasa también si aún no se ha creado ninguna (p.ej. una
  // asignatura recién vaciada a propósito por otro flujo). Se deja un index.json
  // vacío: la app sincroniza igual, sin arriesgarse a borrar carpetas por error.
  if (!existsSync(dir)) return resumen;
  writeFileSync(join(dir, 'index.json'), JSON.stringify({ version: versionLocal, subject, fichas: resumen }, null, 2), 'utf8');

  const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : { asignaturas: {} };
  manifest.asignaturas = { ...manifest.asignaturas, [subject]: { version: versionLocal } };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  return resumen;
}

// Reconstruye index.json de una asignatura a partir de TODOS sus .json en disco.
// Solo para guardado local de una ficha suelta (fuera del flujo de publicar):
// ahí no hay concepto de "excluida", así que leer disco es correcto.
function regenerarIndice(subject) {
  const dir = join(CONTENT_DIR, subject);
  const archivos = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json') : [];
  const fichas = archivos.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  return escribirIndice(subject, fichas);
}

// Compara public/content/ (+ ejercicios.json/manifest.json) en disco contra el
// último commit de git — qué ficha es nueva, cuál se editó, cuál se borró.
// 'ruta' siempre es relativa a la raíz del repo (para pasarla tal cual a git).
function obtenerCambios() {
  // -uall: sin esto, git colapsa una carpeta nueva entera (p.ej. una asignatura
  // que antes no tenía fichas) en una sola línea "?? public/content/xxx/" en vez
  // de listar cada archivo — y esa línea no es ningún .json, así que se perdía.
  const salida = execFileSync('git', ['status', '--porcelain', '-uall', '--', 'public/content/'], { cwd: __dirname, encoding: 'utf8' });
  return salida.split('\n').filter(Boolean).map(linea => {
    const codigo = linea.slice(0, 2);
    const ruta = linea.slice(3).trim().replace(/\\/g, '/');
    const estado = codigo.includes('D') ? 'eliminada' : codigo.includes('?') ? 'nueva' : 'modificada';
    return { ruta, estado };
  }).filter(c => c.ruta.endsWith('.json') && !c.ruta.endsWith('/index.json'));
}

function tituloDeCambio(c) {
  try {
    const texto = c.estado === 'eliminada'
      ? execFileSync('git', ['show', `HEAD:${c.ruta}`], { cwd: __dirname, encoding: 'utf8' })
      : readFileSync(join(__dirname, c.ruta), 'utf8');
    return JSON.parse(texto).titulo;
  } catch {
    return null;
  }
}

// Middleware SOLO de `npm run dev` (configureServer nunca se ejecuta en
// `vite build`/`vite build --mode capacitor` — cero efecto en producción/APK).
// Da al editor local (editor.html) tres cosas que un navegador no puede hacer
// solo: escribir fichas en disco, borrarlas, y publicar a git — todo sin pasar
// por una terminal.
function editorLocalPlugin() {
  return {
    name: 'editor-local-api',
    configureServer(server) {
      // Guardar una ficha en public/content/{subject}/ sin publicar a git —
      // para verla en la app real con "Borrar contenido y recargar" del admin.
      server.middlewares.use('/__editor-api/guardar-ficha', async (req, res) => {
        if (req.method !== 'POST') return responder(res, 405, { error: 'method not allowed' });
        try {
          const ficha = await leerCuerpo(req);
          if (!ficha?.id || !ficha?.subject) throw new Error('Ficha sin id/subject');
          const dir = join(CONTENT_DIR, ficha.subject);
          mkdirSync(dir, { recursive: true });
          writeFileSync(join(dir, `${ficha.id}.json`), JSON.stringify(ficha, null, 2), 'utf8');
          regenerarIndice(ficha.subject);
          responder(res, 200, { ok: true });
        } catch (e) {
          responder(res, 500, { error: e.message });
        }
      });

      // Borrar una ficha del disco (no toca IndexedDB ni git — solo el archivo local).
      server.middlewares.use('/__editor-api/borrar-ficha', async (req, res) => {
        if (req.method !== 'POST') return responder(res, 405, { error: 'method not allowed' });
        try {
          const { subject, id } = await leerCuerpo(req);
          if (!subject || !id) throw new Error('Falta subject o id');
          const archivo = join(CONTENT_DIR, subject, `${id}.json`);
          if (existsSync(archivo)) unlinkSync(archivo);
          regenerarIndice(subject);
          responder(res, 200, { ok: true });
        } catch (e) {
          responder(res, 500, { error: e.message });
        }
      });

      // Lista lo que cambió en public/content/ desde el último commit — para
      // que el editor lo enseñe ANTES de publicar (nueva/modificada/eliminada,
      // con título) y el usuario decida qué entra y qué se queda fuera.
      server.middlewares.use('/__editor-api/cambios-pendientes', (req, res) => {
        if (req.method !== 'GET') return responder(res, 405, { error: 'method not allowed' });
        try {
          const cambios = obtenerCambios().map(c => {
            const [, , subject, archivo] = c.ruta.split('/');
            return { ...c, subject, id: archivo?.replace('.json', ''), titulo: tituloDeCambio(c) };
          });
          responder(res, 200, { cambios });
        } catch (e) {
          responder(res, 500, { error: e.message });
        }
      });

      // Publica a git SOLO lo que no esté en `excluir` (rutas tal cual las
      // devuelve /cambios-pendientes). Lo excluido: una eliminación se deshace
      // en disco (se recupera el archivo); una ficha nueva o modificada se deja
      // tal cual está en disco pero NO se sube — sigue pendiente para la próxima.
      // ejercicios.json/index.json se reconstruyen usando SIEMPRE la última
      // versión publicada (git HEAD) para lo excluido, para que lo publicado
      // quede consistente con lo que de verdad se está subiendo.
      server.middlewares.use('/__editor-api/publicar', async (req, res) => {
        if (req.method !== 'POST') return responder(res, 405, { error: 'method not allowed' });
        try {
          const { validarFicha } = await import('./src/datos/validacion.js');
          const { rebalancearPosicionesEM } = await import('./src/datos/rebalanceo.js');

          const { excluir = [] } = await leerCuerpo(req);
          const excluirSet = new Set(excluir);
          const cambios = obtenerCambios();

          // Deshacer en disco las eliminaciones que el usuario ha desmarcado —
          // así "excluir" una baja de verdad evita que se pierda el archivo.
          for (const c of cambios) {
            if (c.estado === 'eliminada' && excluirSet.has(c.ruta)) {
              execFileSync('git', ['checkout', 'HEAD', '--', c.ruta], { cwd: __dirname, stdio: 'pipe' });
            }
          }

          const subjects = existsSync(CONTENT_DIR) ? readdirSync(CONTENT_DIR) : [];
          let todasFichas = [];
          const errores = [];
          const rutasIncluidas = [];
          for (const subject of subjects) {
            const dir = join(CONTENT_DIR, subject);
            const archivos = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json');
            for (const file of archivos) {
              const ruta = `public/content/${subject}/${file}`;
              const cambio = cambios.find(c => c.ruta === ruta);
              const excluida = cambio && excluirSet.has(ruta);

              if (excluida && cambio.estado === 'nueva') continue; // no publicada todavía, se omite del todo

              const textoFuente = (excluida && cambio.estado === 'modificada')
                ? execFileSync('git', ['show', `HEAD:${ruta}`], { cwd: __dirname, encoding: 'utf8' }) // versión ya publicada
                : readFileSync(join(dir, file), 'utf8'); // versión en disco (nueva o modificada incluida, o sin cambios)

              const ficha = JSON.parse(textoFuente);
              const resultado = validarFicha(ficha);
              if (!resultado.valida) errores.push(`${subject}/${file}: ${resultado.errores.join(' | ')}`);
              todasFichas.push(ficha);
              if (!excluida) rutasIncluidas.push(ruta);
            }
          }
          if (errores.length > 0) return responder(res, 400, { error: 'Hay fichas que no pasan la validación', detalles: errores });

          todasFichas = rebalancearPosicionesEM(todasFichas);
          // Solo se reescribe en disco lo que se va a publicar de verdad — una
          // ficha excluida no se toca, se queda con el contenido que tenía.
          for (const ficha of todasFichas) {
            const ruta = `public/content/${ficha.subject}/${ficha.id}.json`;
            if (rutasIncluidas.includes(ruta) || !cambios.some(c => c.ruta === ruta)) {
              writeFileSync(join(__dirname, ruta), JSON.stringify(ficha, null, 2), 'utf8');
            }
          }
          for (const subject of subjects) {
            escribirIndice(subject, todasFichas.filter(f => f.subject === subject));
          }

          const fecha = new Date().toISOString().slice(0, 10);
          const fichasOrdenadas = [...todasFichas].sort((a, b) => a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id));
          const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
          const versionGlobal = `${fecha}-${Date.now().toString(36)}`;
          manifest.version = versionGlobal;
          manifest.fecha = fecha;
          writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
          writeFileSync(EJERCICIOS_PATH, JSON.stringify({ version: versionGlobal, fecha, fichas: fichasOrdenadas }, null, 2), 'utf8');

          try {
            // git add SOLO lo incluido — nunca la carpeta entera, para no
            // arrastrar sin querer una ficha excluida que sigue modificada en disco.
            execFileSync('git', ['add', 'public/ejercicios.json', 'public/manifest.json', ...subjects.map(s => `public/content/${s}/index.json`), ...rutasIncluidas], { cwd: __dirname, stdio: 'pipe' });
            execSync(`git commit -m "content: publicado desde el editor local (${rutasIncluidas.length} fichas)"`, { cwd: __dirname, stdio: 'pipe' });
          } catch (e) {
            if (!e.message.includes('nothing to commit')) throw new Error(`git commit falló: ${e.stderr?.toString() ?? e.message}`, { cause: e });
            return responder(res, 200, { ok: true, sinCambios: true });
          }
          execSync('git push origin main', { cwd: __dirname, stdio: 'pipe' });

          responder(res, 200, { ok: true, numFichas: rutasIncluidas.length, excluidas: excluir.length });
        } catch (e) {
          responder(res, 500, { error: e.stderr?.toString() ?? e.message });
        }
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
