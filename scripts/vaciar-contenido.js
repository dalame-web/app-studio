#!/usr/bin/env node
/**
 * scripts/vaciar-contenido.js
 * Vacía ejercicios.json (fichas: []) y sube a GitHub con una nueva versión.
 * Todos los dispositivos detectarán la nueva versión y borrarán su contenido local al sincronizar.
 *
 * Uso:
 *   npm run vaciar
 */

import { writeFileSync, existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT            = join(__dirname, '..');
const EJERCICIOS_PATH = join(ROOT, 'public', 'ejercicios.json');
const MANIFEST_PATH   = join(ROOT, 'public', 'manifest.json');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};
const ok   = (s) => console.log(`${C.green}${C.bold}✓${C.reset} ${s}`);
const err  = (s) => console.error(`${C.red}${C.bold}✗${C.reset} ${s}`);
const info = (s) => console.log(`${C.cyan}→${C.reset} ${s}`);
const warn = (s) => console.log(`${C.yellow}⚠${C.reset} ${s}`);

function nuevaVersion(manifestExistente) {
  const fecha = new Date().toISOString().slice(0, 10);
  const versionActual = manifestExistente?.version ?? '';
  const prefijo = `${fecha}-`;
  const contador = versionActual.startsWith(prefijo)
    ? parseInt(versionActual.slice(prefijo.length), 10) + 1
    : 1;
  return `${prefijo}${contador}`;
}

console.log(`\n${C.bold}VACIAR CONTENIDO${C.reset}`);
console.log(`${C.yellow}Esto borrará todos los ejercicios del servidor.${C.reset}`);
console.log(`Los dispositivos lo detectarán y borrarán su caché local al sincronizar.\n`);

// Leer manifest actual
const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  : {};

const version = nuevaVersion(manifest);
const fecha   = new Date().toISOString().slice(0, 10);

// Escribir ejercicios.json vacío
const nuevoEjercicios = { version, fecha, fichas: [] };
writeFileSync(EJERCICIOS_PATH, JSON.stringify(nuevoEjercicios, null, 2), 'utf8');
ok(`ejercicios.json vaciado (fichas: []) — versión ${version}`);

// Actualizar manifest
const nuevoManifest = { ...manifest, version, fecha, asignaturas: [] };
writeFileSync(MANIFEST_PATH, JSON.stringify(nuevoManifest, null, 2), 'utf8');
ok(`manifest.json actualizado — versión ${version}`);

// Git commit + push
info('Publicando en GitHub…');
try {
  execSync('git add public/ejercicios.json public/manifest.json', { cwd: ROOT, stdio: 'pipe' });
  execSync(`git commit -m "content: vaciado completo (v${version})"`, { cwd: ROOT, stdio: 'pipe' });
  ok('Commit creado');
} catch (e) {
  if (e.message?.includes('nothing to commit')) {
    warn('Sin cambios que commitear (ya estaba vacío)');
    process.exit(0);
  }
  err(`Git commit fallido: ${e.stderr?.toString() ?? e.message}`);
  process.exit(1);
}

try {
  execSync('git push origin main', { cwd: ROOT, stdio: 'pipe' });
  ok('Push a GitHub completado');
} catch (e) {
  err(`Git push fallido: ${e.stderr?.toString() ?? e.message}`);
  warn('Commit guardado localmente. Haz "git push" manualmente.');
  process.exit(1);
}

console.log(`
${C.green}${C.bold}🎉 Listo.${C.reset}

Próximos pasos en cada dispositivo (tablet, móvil, etc.):
  1. Abre la app
  2. Entra al admin (PIN 1234)
  3. Toca "${C.bold}Borrar contenido y recargar desde cero${C.reset}"
  4. La app borra el contenido local y queda lista para el nuevo contenido

Cuando tengas las fichas nuevas generadas:
  → npm run publicar   (pega el JSON de Claude)
`);
