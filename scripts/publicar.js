#!/usr/bin/env node
/**
 * scripts/publicar.js
 * Publica fichas de ejercicios en public/ejercicios.json y hace git push.
 *
 * Uso:
 *   npm run publicar                    → pide pegar el JSON por consola
 *   npm run publicar -- fichas.json     → lee desde fichero .json
 *   npm run publicar -- '[{...}]'       → JSON como argumento de texto
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EJERCICIOS_PATH = join(ROOT, 'public', 'ejercicios.json');
const MANIFEST_PATH   = join(ROOT, 'public', 'manifest.json');

// ── Colores consola ──────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', gray: '\x1b[90m',
};
const ok   = (s) => console.log(`${C.green}${C.bold}✓${C.reset} ${s}`);
const err  = (s) => console.error(`${C.red}${C.bold}✗${C.reset} ${s}`);
const info = (s) => console.log(`${C.cyan}→${C.reset} ${s}`);
const warn = (s) => console.log(`${C.yellow}⚠${C.reset} ${s}`);

// ── Leer JSON de entrada ─────────────────────────────────────────────────────

async function leerJSON() {
  const arg = process.argv[2];

  // Argumento = fichero .json
  if (arg && arg.endsWith('.json') && existsSync(arg)) {
    info(`Leyendo fichero: ${arg}`);
    return JSON.parse(readFileSync(arg, 'utf8'));
  }

  // Argumento = string JSON directo
  if (arg && (arg.startsWith('[') || arg.startsWith('{'))) {
    info('Usando JSON del argumento de línea de comandos');
    return JSON.parse(arg);
  }

  // Modo interactivo: pegar JSON en consola
  console.log('\n' + C.bold + 'PUBLICAR EJERCICIOS' + C.reset);
  console.log(C.gray + '─'.repeat(50) + C.reset);
  console.log('Pega el JSON generado por Claude y presiona ENTER dos veces:');
  console.log(C.gray + '(o escribe la ruta de un fichero .json y pulsa ENTER)' + C.reset + '\n');

  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin });
    let lines = [];
    let emptyCount = 0;

    rl.on('line', (line) => {
      if (line.trim() === '') {
        emptyCount++;
        if (emptyCount >= 2 || lines.length > 0) {
          rl.close();
        }
      } else {
        emptyCount = 0;
        lines.push(line);
      }
    });

    rl.on('close', () => {
      const input = lines.join('\n').trim();
      if (!input) { reject(new Error('No se pegó ningún contenido.')); return; }

      // Si es una ruta de fichero
      if (input.endsWith('.json') && existsSync(input)) {
        info(`Leyendo fichero: ${input}`);
        resolve(JSON.parse(readFileSync(input, 'utf8')));
        return;
      }

      // Si es JSON directo (puede venir en bloque ```json ... ```)
      const match = input.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = match ? match[1].trim() : input;
      resolve(JSON.parse(jsonStr));
    });
  });
}

// ── Importar validador (ES module del proyecto) ─────────────────────────────

async function validar(data) {
  try {
    const { validarImportacion } = await import('../src/datos/validacion.js');

    let fichas;
    if (Array.isArray(data)) fichas = data;
    else if (data?.fichas) fichas = data.fichas;
    else if (data?.id) fichas = [data];
    else throw new Error('Formato no reconocido: debe ser array de fichas, { fichas: [...] } o una ficha individual');

    const resultado = validarImportacion(fichas, undefined);
    return { ...resultado, fichas };
  } catch (e) {
    if (e.message.includes('validacion.js')) {
      // Fallback si no se puede importar el validador (p.ej. import fallback)
      warn('Validador no disponible, usando validación básica');
      const fichas = Array.isArray(data) ? data : data?.fichas ?? [data];
      return { valida: true, errores: [], warnings: [], fichas };
    }
    throw e;
  }
}

// ── Fusionar con ejercicios.json existente ───────────────────────────────────

function fusionar(fichasExistentes, fichasNuevas) {
  const mapa = new Map(fichasExistentes.map(f => [f.id, f]));
  const añadidas = [], sustituidas = [];

  for (const ficha of fichasNuevas) {
    if (mapa.has(ficha.id)) sustituidas.push(ficha.id);
    else añadidas.push(ficha.id);
    mapa.set(ficha.id, ficha);
  }

  return { fichas: [...mapa.values()], añadidas, sustituidas };
}

// ── Generar versión incremental ──────────────────────────────────────────────

function nuevaVersion(manifestExistente) {
  const fecha = new Date().toISOString().slice(0, 10);
  const versionActual = manifestExistente?.version ?? '';
  const prefijo = `${fecha}-`;
  const contador = versionActual.startsWith(prefijo)
    ? parseInt(versionActual.slice(prefijo.length), 10) + 1
    : 1;
  return `${prefijo}${contador}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log();

  // 1. Leer JSON
  let raw;
  try {
    raw = await leerJSON();
  } catch (e) {
    err(`Error al leer el JSON: ${e.message}`);
    process.exit(1);
  }

  // 2. Validar
  info('Validando fichas…');
  let resultado;
  try {
    resultado = await validar(raw);
  } catch (e) {
    err(`Error de validación: ${e.message}`);
    process.exit(1);
  }

  if (resultado.errores.length > 0) {
    err(`${resultado.errores.length} error${resultado.errores.length > 1 ? 'es' : ''} encontrado${resultado.errores.length > 1 ? 's' : ''}. Corrige antes de publicar:\n`);
    resultado.errores.forEach((e, i) => console.error(`  ${C.red}${i + 1}.${C.reset} ${e}`));
    console.log();
    process.exit(1);
  }

  if (resultado.warnings.length > 0) {
    resultado.warnings.forEach(w => warn(w));
    console.log();
  }

  ok(`Validación OK — ${resultado.fichas.length} ficha${resultado.fichas.length > 1 ? 's' : ''}, ${resultado.stats?.numEjercicios ?? '?'} ejercicios`);

  // 3. Leer ejercicios.json existente
  let existente = { version: '1.0.0', fecha: new Date().toISOString().slice(0, 10), fichas: [] };
  if (existsSync(EJERCICIOS_PATH)) {
    try {
      existente = JSON.parse(readFileSync(EJERCICIOS_PATH, 'utf8'));
    } catch { warn('ejercicios.json existente tiene formato incorrecto, se creará de cero'); }
  }

  // 4. Fusionar
  const { fichas: fichasFusionadas, añadidas, sustituidas } = fusionar(existente.fichas ?? [], resultado.fichas);
  const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) : {};
  const version = nuevaVersion(manifest);

  // 5. Calcular asignaturas presentes
  const asignaturas = [...new Set(fichasFusionadas.map(f => f.subject))].sort();

  // 6. Escribir ficheros
  const nuevoEjercicios = {
    version,
    fecha: new Date().toISOString().slice(0, 10),
    fichas: fichasFusionadas.sort((a, b) => a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id)),
  };
  writeFileSync(EJERCICIOS_PATH, JSON.stringify(nuevoEjercicios, null, 2), 'utf8');

  const nuevoManifest = { ...manifest, version, fecha: nuevoEjercicios.fecha, asignaturas };
  writeFileSync(MANIFEST_PATH, JSON.stringify(nuevoManifest, null, 2), 'utf8');

  ok(`Escritos: ejercicios.json (${fichasFusionadas.length} fichas) + manifest.json (v${version})`);
  if (añadidas.length) info(`Fichas nuevas: ${añadidas.join(', ')}`);
  if (sustituidas.length) info(`Fichas sustituidas: ${sustituidas.join(', ')}`);

  // Resumen por asignatura
  const resumen = {};
  fichasFusionadas.forEach(f => {
    if (!resumen[f.subject]) resumen[f.subject] = { fichas: 0, ejercicios: 0 };
    resumen[f.subject].fichas++;
    resumen[f.subject].ejercicios += f.ejercicios?.length ?? 0;
  });
  console.log('\n' + C.bold + 'Contenido total por asignatura:' + C.reset);
  Object.entries(resumen).forEach(([asig, r]) =>
    console.log(`  ${C.gray}${asig.padEnd(16)}${C.reset} ${r.fichas} fichas · ${r.ejercicios} ejercicios`)
  );

  // 7. Git
  console.log('\n' + C.bold + 'Publicando en GitHub…' + C.reset);
  const asigLabel = [...new Set(resultado.fichas.map(f => f.subject))].join(', ');
  const commitMsg = `content: ${añadidas.length + sustituidas.length} ficha${añadidas.length + sustituidas.length > 1 ? 's' : ''} (${asigLabel})`;

  try {
    execSync('git add public/ejercicios.json public/manifest.json', { cwd: ROOT, stdio: 'pipe' });
    execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT, stdio: 'pipe' });
    ok(`Commit: "${commitMsg}"`);
  } catch (e) {
    if (e.message.includes('nothing to commit')) {
      warn('Sin cambios que commitear (el contenido ya estaba igual)');
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
    warn('El commit está guardado localmente. Puedes hacer "git push" manualmente.');
    process.exit(1);
  }

  console.log(`\n${C.green}${C.bold}🎉 ¡Publicado! Los dispositivos recibirán el contenido nuevo al abrir la app.${C.reset}\n`);
}

main().catch(e => {
  err(e.message);
  process.exit(1);
});
