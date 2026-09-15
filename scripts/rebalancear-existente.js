#!/usr/bin/env node
// Aplica rebalancearPosicionesEM() al contenido YA publicado (uso puntual, no forma
// parte del flujo normal — el flujo normal ya rebalancea en publicar.js/PantallaImportar).
// Sube versión del manifest para que los dispositivos lo detecten en el próximo sync.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { rebalancearPosicionesEM } from '../src/datos/rebalanceo.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT_DIR = join(ROOT, 'public', 'content');
const EJERCICIOS_PATH = join(ROOT, 'public', 'ejercicios.json');
const MANIFEST_PATH = join(ROOT, 'public', 'manifest.json');

const fecha = new Date().toISOString().slice(0, 10);
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const nuevaVersion = (actual) => {
  const prefijo = `${fecha}-`;
  const n = actual?.startsWith(prefijo) ? parseInt(actual.slice(prefijo.length), 10) + 1 : 1;
  return `${prefijo}${n}`;
};

// public/content/ es ahora un directorio por asignatura con un .json por ficha
// (+ un index.json ligero) — antes era un único content/{subject}.json plano.
let totalEjCambiados = 0;
const todasFichas = [];

for (const subject of readdirSync(CONTENT_DIR)) {
  const subjectDir = join(CONTENT_DIR, subject);
  if (!statSync(subjectDir).isDirectory()) continue;

  const fichaFiles = readdirSync(subjectDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  let huboCambios = false;
  const fichasSubject = [];

  for (const file of fichaFiles) {
    const path = join(subjectDir, file);
    const ficha = JSON.parse(readFileSync(path, 'utf8'));
    const antes = JSON.stringify(ficha);
    const [rebalanceada] = rebalancearPosicionesEM([ficha]);
    const cambiado = antes !== JSON.stringify(rebalanceada);
    if (cambiado) {
      totalEjCambiados++;
      huboCambios = true;
      writeFileSync(path, JSON.stringify(rebalanceada, null, 2), 'utf8');
    }
    fichasSubject.push(rebalanceada);
  }

  const versionSubject = huboCambios
    ? nuevaVersion(manifest.asignaturas?.[subject]?.version)
    : (manifest.asignaturas?.[subject]?.version ?? nuevaVersion(null));
  manifest.asignaturas[subject] = { version: versionSubject };

  const indice = {
    version: versionSubject,
    subject,
    fichas: fichasSubject.map(f => ({ id: f.id, titulo: f.titulo, nivel: f.nivel, numEjercicios: f.ejercicios?.length ?? 0 })),
  };
  writeFileSync(join(subjectDir, 'index.json'), JSON.stringify(indice, null, 2), 'utf8');

  console.log(`${subject}: ${huboCambios ? 'rebalanceado' : 'sin cambios'} → v${versionSubject}`);
  todasFichas.push(...fichasSubject);
}
const versionGlobal = nuevaVersion(manifest.version);
manifest.version = versionGlobal;
manifest.fecha = fecha;
writeFileSync(EJERCICIOS_PATH, JSON.stringify({ version: versionGlobal, fecha, fichas: todasFichas }, null, 2), 'utf8');
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

console.log(`\nListo. ${totalEjCambiados} archivo(s) de asignatura con cambios. manifest.json → v${versionGlobal}`);
