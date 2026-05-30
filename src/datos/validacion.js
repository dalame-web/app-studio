// Validador estricto de fichas/ejercicios para importación (sin librerías externas)
// Detecta tanto errores DURO (rompen la app) como WARNINGS (mala UX pero ejecutable)

const TIPOS_VALIDOS = [
  'EleccionMultiple', 'RellenarHueco', 'ArrastrarPalabras', 'OrdenarFrase',
  'UnirColumnas', 'ClasificarGrupos', 'CompletarSerie', 'SopaLetras',
  'MemoriaPareja', 'ProblemaVisual', 'ComprensionLectora',
];

const ASIGNATURAS_VALIDAS = ['matematicas', 'lengua', 'ciencias', 'social', 'ingles', 'valores'];

const CAMPOS_POR_TIPO = {
  EleccionMultiple:   ['enunciado', 'opciones', 'respuestaCorrecta'],
  RellenarHueco:      ['enunciado', 'respuestaCorrecta'],
  ArrastrarPalabras:  ['fraseConHuecos', 'banco', 'respuestasCorrectas'],
  OrdenarFrase:       ['palabrasDesordenadas', 'fraseCorrecta'],
  UnirColumnas:       ['parejas'],
  ClasificarGrupos:   ['grupos', 'items'],
  CompletarSerie:     ['serie', 'opciones', 'respuestaCorrecta'],
  SopaLetras:         ['palabras', 'cuadricula'],
  MemoriaPareja:      ['parejas'],
  ProblemaVisual:     ['enunciado', 'respuestaCorrecta'],
  ComprensionLectora: ['texto', 'preguntas'],
};

// Emojis "spoiler" prohibidos en opciones de EleccionMultiple
const EMOJIS_SPOILER = ['✅', '❌', '✔', '✓', '✗', '⭕', '❎', '🟢', '🔴'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizar(s) {
  return String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function aplanarEnGrid(grid) {
  return grid.flat().map(c => String(c ?? '').toUpperCase()).join('');
}

function palabraEnGrid(palabra, grid) {
  if (!Array.isArray(grid) || grid.length === 0) return false;
  const p = String(palabra).toUpperCase();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  // Horizontal LTR/RTL + Vertical UP/DOWN (sin diagonales para simplificar)
  for (let r = 0; r < rows; r++) {
    const fila = (grid[r] ?? []).map(c => String(c ?? '').toUpperCase()).join('');
    if (fila.includes(p) || fila.split('').reverse().join('').includes(p)) return true;
  }
  for (let c = 0; c < cols; c++) {
    let col = '';
    for (let r = 0; r < rows; r++) col += String(grid[r]?.[c] ?? '').toUpperCase();
    if (col.includes(p) || col.split('').reverse().join('').includes(p)) return true;
  }
  return false;
}

function duplicados(arr) {
  const counts = {};
  for (const x of arr) counts[x] = (counts[x] ?? 0) + 1;
  return Object.keys(counts).filter(k => counts[k] > 1);
}

// ── Validadores por tipo ────────────────────────────────────────────────────

function validarEleccionMultiple(ej, ref, ficha, errores, warnings) {
  const ops = ej.opciones;
  if (!Array.isArray(ops) || ops.length < 2) {
    errores.push(`${ref}: EleccionMultiple necesita al menos 2 opciones`);
    return;
  }
  const textos = ops.map(o => typeof o === 'string' ? o : o?.texto);
  const dup = duplicados(textos);
  if (dup.length) errores.push(`${ref}: opciones duplicadas: ${dup.join(', ')}`);
  if (!textos.includes(ej.respuestaCorrecta))
    errores.push(`${ref}: respuestaCorrecta "${ej.respuestaCorrecta}" no está en las opciones`);

  // Anti-spoiler: emoji "✅" o similar delata la respuesta
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op && typeof op === 'object' && op.emoji && EMOJIS_SPOILER.includes(op.emoji)) {
      errores.push(`${ref}: la opción "${op.texto}" tiene emoji "${op.emoji}" que delata la respuesta. Quita todos los emojis "✅/❌" de las opciones (déjalos vacíos "").`);
    }
  }
}

function validarRellenarHueco(ej, ref, ficha, errores, warnings) { // OK: ya tenía ficha
  if (typeof ej.enunciado !== 'string' || !ej.enunciado.includes('[___]'))
    errores.push(`${ref}: RellenarHueco necesita "[___]" en el enunciado`);
  if (!ej.respuestaCorrecta || String(ej.respuestaCorrecta).trim() === '')
    errores.push(`${ref}: respuestaCorrecta vacía`);

  // Warning: respuesta no aparece en la ficha
  const contexto = `${ficha?.contenido ?? ''} ${(ficha?.ejemplos ?? []).join(' ')} ${(ficha?.palabrasClave ?? []).join(' ')}`;
  if (ej.respuestaCorrecta && !normalizar(contexto).includes(normalizar(ej.respuestaCorrecta))) {
    warnings.push(`${ref}: la respuesta "${ej.respuestaCorrecta}" no aparece en contenido/ejemplos/palabrasClave de la ficha. El niño no tiene cómo deducirla.`);
  }
}

function validarArrastrarPalabras(ej, ref, ficha, errores, warnings) {
  const banco = Array.isArray(ej.banco) ? ej.banco : [];
  const resps = Array.isArray(ej.respuestasCorrectas) ? ej.respuestasCorrectas : [];
  const huecos = (ej.fraseConHuecos?.match(/\[___\]/g) ?? []).length;

  if (huecos === 0) errores.push(`${ref}: fraseConHuecos no contiene ningún "[___]"`);
  if (huecos !== resps.length)
    errores.push(`${ref}: la frase tiene ${huecos} huecos pero respuestasCorrectas tiene ${resps.length}. Deben coincidir.`);

  const dupBanco = duplicados(banco);
  if (dupBanco.length) errores.push(`${ref}: banco tiene palabras duplicadas: ${dupBanco.join(', ')}. El motor de drag&drop necesita IDs únicos.`);

  const dupResp = duplicados(resps);
  if (dupResp.length) errores.push(`${ref}: respuestasCorrectas tiene palabras duplicadas: ${dupResp.join(', ')}. Cada palabra del banco solo se puede arrastrar a UN hueco.`);

  for (const r of resps) {
    if (!banco.includes(r)) errores.push(`${ref}: respuesta "${r}" no está en el banco`);
  }

  if (banco.length < resps.length + 1)
    warnings.push(`${ref}: el banco debería tener al menos 1 distractor (palabra que NO sea respuesta correcta).`);
}

function validarOrdenarFrase(ej, ref, ficha, errores, warnings) {
  const palabras = Array.isArray(ej.palabrasDesordenadas) ? ej.palabrasDesordenadas : [];
  if (palabras.length < 3) errores.push(`${ref}: palabrasDesordenadas debería tener al menos 3 palabras`);
  if (typeof ej.fraseCorrecta !== 'string') {
    errores.push(`${ref}: fraseCorrecta debe ser string`);
    return;
  }
  // Verifica que las palabras coincidan (multiconjunto, case-insensitive)
  const palabrasFrase = ej.fraseCorrecta.trim().split(/\s+/);
  if (palabrasFrase.length !== palabras.length) {
    errores.push(`${ref}: fraseCorrecta tiene ${palabrasFrase.length} palabras pero palabrasDesordenadas tiene ${palabras.length}. Deben tener la misma cantidad.`);
  }
  const sortLower = arr => [...arr].map(p => p.toLowerCase()).sort();
  const aFrase = sortLower(palabrasFrase);
  const aDesord = sortLower(palabras);
  if (JSON.stringify(aFrase) !== JSON.stringify(aDesord)) {
    errores.push(`${ref}: las palabras de fraseCorrecta no coinciden con palabrasDesordenadas. Frase: [${palabrasFrase.join(' ')}]. Desordenadas: [${palabras.join(' ')}]`);
  }
}

function validarUnirColumnas(ej, ref, ficha, errores, warnings) {
  const parejas = Array.isArray(ej.parejas) ? ej.parejas : [];
  if (parejas.length !== 4) errores.push(`${ref}: UnirColumnas necesita EXACTAMENTE 4 parejas (tiene ${parejas.length})`);
  const izq = parejas.map(p => p?.izquierda);
  const der = parejas.map(p => p?.derecha);
  const dupI = duplicados(izq);
  const dupD = duplicados(der);
  if (dupI.length) errores.push(`${ref}: parejas con "izquierda" duplicada: ${dupI.join(', ')}`);
  if (dupD.length) errores.push(`${ref}: parejas con "derecha" duplicada: ${dupD.join(', ')}`);
  for (let i = 0; i < parejas.length; i++) {
    if (!parejas[i]?.izquierda || !parejas[i]?.derecha)
      errores.push(`${ref}: pareja[${i}] tiene "izquierda" o "derecha" vacía`);
  }
}

function validarClasificarGrupos(ej, ref, ficha, errores, warnings) {
  const grupos = Array.isArray(ej.grupos) ? ej.grupos : [];
  const items  = Array.isArray(ej.items) ? ej.items : [];
  if (grupos.length < 2 || grupos.length > 3) errores.push(`${ref}: ClasificarGrupos necesita 2 o 3 grupos (tiene ${grupos.length})`);
  if (items.length < 4) errores.push(`${ref}: ClasificarGrupos necesita al menos 4 items (tiene ${items.length})`);

  const idsGrupos = new Set(grupos.map(g => g?.id));
  const idsItems  = items.map(i => i?.id);
  const dupItems  = duplicados(idsItems);
  if (dupItems.length) errores.push(`${ref}: items con id duplicado: ${dupItems.join(', ')}. Rompe el drag&drop.`);

  const itemsPorGrupo = {};
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it?.grupoId) errores.push(`${ref}: item[${i}] sin grupoId`);
    else if (!idsGrupos.has(it.grupoId)) errores.push(`${ref}: item "${it.id}" tiene grupoId "${it.grupoId}" que no existe en grupos`);
    else itemsPorGrupo[it.grupoId] = (itemsPorGrupo[it.grupoId] ?? 0) + 1;
  }
  for (const g of grupos) {
    if (!itemsPorGrupo[g.id]) errores.push(`${ref}: el grupo "${g.id}" (${g.nombre}) no tiene ningún item asignado`);
  }
}

function validarCompletarSerie(ej, ref, ficha, errores, warnings) {
  const serie = Array.isArray(ej.serie) ? ej.serie : [];
  const nulls = serie.filter(x => x === null).length;
  if (nulls === 0) errores.push(`${ref}: CompletarSerie debe tener exactamente 1 null en serie (es el hueco)`);
  if (nulls > 1) errores.push(`${ref}: CompletarSerie tiene ${nulls} nulls. Solo se permite 1 hueco.`);
  const ops = Array.isArray(ej.opciones) ? ej.opciones : [];
  if (ops.length < 2) errores.push(`${ref}: CompletarSerie necesita al menos 2 opciones`);
  if (!ops.includes(ej.respuestaCorrecta)) errores.push(`${ref}: respuestaCorrecta "${ej.respuestaCorrecta}" no está en opciones`);
}

function validarSopaLetras(ej, ref, ficha, errores, warnings) {
  const grid = Array.isArray(ej.cuadricula) ? ej.cuadricula : [];
  if (grid.length !== 8) errores.push(`${ref}: la cuadrícula debe tener 8 filas (tiene ${grid.length})`);
  for (let r = 0; r < grid.length; r++) {
    if (!Array.isArray(grid[r]) || grid[r].length !== 8)
      errores.push(`${ref}: la fila ${r} de la cuadrícula no tiene 8 columnas`);
  }
  const palabras = Array.isArray(ej.palabras) ? ej.palabras : [];
  if (palabras.length === 0) errores.push(`${ref}: SopaLetras necesita al menos 1 palabra`);
  for (const p of palabras) {
    if (!palabraEnGrid(p, grid))
      errores.push(`${ref}: la palabra "${p}" no aparece en la cuadrícula (ni horizontal ni vertical). El niño no podrá encontrarla.`);
  }
}

function validarMemoriaPareja(ej, ref, ficha, errores, warnings) {
  const parejas = Array.isArray(ej.parejas) ? ej.parejas : [];
  if (parejas.length !== 6) errores.push(`${ref}: MemoriaPareja necesita EXACTAMENTE 6 parejas (tiene ${parejas.length}). El grid es 3x4.`);
  const todosValores = parejas.flatMap(p => [p?.a, p?.b]);
  const dup = duplicados(todosValores);
  if (dup.length) errores.push(`${ref}: hay valores duplicados entre cartas: ${dup.join(', ')}. Confunde al jugador.`);
  for (let i = 0; i < parejas.length; i++) {
    if (!parejas[i]?.a || !parejas[i]?.b) errores.push(`${ref}: pareja[${i}] tiene "a" o "b" vacío`);
  }
}

function validarProblemaVisual(ej, ref, ficha, errores, warnings) {
  const esNumerico = !!ej.esNumerico;
  if (!esNumerico) {
    if (!Array.isArray(ej.opciones) || ej.opciones.length < 2)
      errores.push(`${ref}: ProblemaVisual sin esNumerico necesita al menos 2 opciones`);
    else if (!ej.opciones.includes(ej.respuestaCorrecta))
      errores.push(`${ref}: respuestaCorrecta "${ej.respuestaCorrecta}" no está en opciones`);
  }
  if (ej.visual) {
    if (ej.visual.cantidad > 30) errores.push(`${ref}: visual.cantidad ${ej.visual.cantidad} es excesiva (no caben tantos emojis). Máximo 30.`);
  }
}

function validarComprensionLectora(ej, ref, ficha, errores, warnings) {
  const preguntas = Array.isArray(ej.preguntas) ? ej.preguntas : [];
  if (preguntas.length < 2) errores.push(`${ref}: ComprensionLectora necesita al menos 2 preguntas`);
  if (preguntas.length > 5) warnings.push(`${ref}: ${preguntas.length} preguntas es mucho para 3º Primaria. Recomendado 3-4.`);

  const numPalabras = String(ej.texto ?? '').trim().split(/\s+/).length;
  if (numPalabras > 120) warnings.push(`${ref}: el texto tiene ${numPalabras} palabras. Para 3º Primaria, máximo recomendado 100.`);

  for (let i = 0; i < preguntas.length; i++) {
    const p = preguntas[i];
    const refP = `${ref} → pregunta[${i}]`;
    if (!['EleccionMultiple', 'RellenarHueco'].includes(p?.tipo))
      errores.push(`${refP}: tipo "${p?.tipo}" no permitido. Solo EleccionMultiple o RellenarHueco dentro de ComprensionLectora.`);
    if (!p?.enunciado) errores.push(`${refP}: falta enunciado`);
    if (!p?.respuestaCorrecta) errores.push(`${refP}: falta respuestaCorrecta`);
    if (p?.tipo === 'EleccionMultiple') {
      const ops = Array.isArray(p.opciones) ? p.opciones : [];
      if (ops.length < 2) errores.push(`${refP}: necesita al menos 2 opciones`);
      else if (!ops.includes(p.respuestaCorrecta))
        errores.push(`${refP}: respuestaCorrecta "${p.respuestaCorrecta}" no está en opciones`);
    }
    if (p?.tipo === 'RellenarHueco' && typeof p.enunciado === 'string' && !p.enunciado.includes('[___]')) {
      errores.push(`${refP}: enunciado de RellenarHueco debe contener "[___]"`);
    }
  }
}

const VALIDADORES = {
  EleccionMultiple:   validarEleccionMultiple,
  RellenarHueco:      validarRellenarHueco,
  ArrastrarPalabras:  validarArrastrarPalabras,
  OrdenarFrase:       validarOrdenarFrase,
  UnirColumnas:       validarUnirColumnas,
  ClasificarGrupos:   validarClasificarGrupos,
  CompletarSerie:     validarCompletarSerie,
  SopaLetras:         validarSopaLetras,
  MemoriaPareja:      validarMemoriaPareja,
  ProblemaVisual:     validarProblemaVisual,
  ComprensionLectora: validarComprensionLectora,
};

// ── Validador principal ─────────────────────────────────────────────────────

function validarEjercicio(ej, idx, ficha, errores, warnings) {
  const ref = `ficha "${ficha.id}" → ejercicio[${idx}] "${ej?.id ?? '?'}"`;

  if (!ej || typeof ej !== 'object') { errores.push(`${ref}: no es un objeto válido`); return; }
  if (!ej.id) errores.push(`${ref}: falta "id"`);
  if (!ej.fichaId) errores.push(`${ref}: falta "fichaId"`);
  if (ej.fichaId && ej.fichaId !== ficha.id) errores.push(`${ref}: fichaId "${ej.fichaId}" no coincide con la ficha contenedora "${ficha.id}"`);
  if (ej.subject && ficha.subject && ej.subject !== ficha.subject)
    errores.push(`${ref}: subject "${ej.subject}" no coincide con el de la ficha "${ficha.subject}"`);
  if (!ej.tipo) { errores.push(`${ref}: falta "tipo"`); return; }
  if (!TIPOS_VALIDOS.includes(ej.tipo)) {
    errores.push(`${ref}: tipo "${ej.tipo}" no es válido. Permitidos: ${TIPOS_VALIDOS.join(', ')}`);
    return;
  }

  if (ej.nivel !== undefined && ![1, 2, 3].includes(ej.nivel))
    errores.push(`${ref}: nivel debe ser 1, 2 o 3 (recibido: ${ej.nivel})`);
  if (ej.tiempoEstimado !== undefined && (typeof ej.tiempoEstimado !== 'number' || ej.tiempoEstimado <= 0))
    warnings.push(`${ref}: tiempoEstimado debería ser un número positivo`);

  const camposReq = CAMPOS_POR_TIPO[ej.tipo] ?? [];
  for (const campo of camposReq) {
    if (ej[campo] === undefined || ej[campo] === null) {
      errores.push(`${ref}: falta campo "${campo}" (requerido para tipo ${ej.tipo})`);
    }
  }

  const validador = VALIDADORES[ej.tipo];
  if (validador) validador(ej, ref, ficha, errores, warnings);
  // Ajuste: algunos validadores no usan ficha
  // (los que sí: RellenarHueco para warning de contexto)
}

export function validarFicha(ficha, opciones = {}) {
  const errores = [];
  const warnings = [];

  if (!ficha || typeof ficha !== 'object') {
    return { valida: false, errores: ['La ficha no es un objeto válido'], warnings: [] };
  }

  if (!ficha.id) errores.push('Falta "id" en la ficha');
  if (!ficha.subject) errores.push('Falta "subject" en la ficha');
  else if (!ASIGNATURAS_VALIDAS.includes(ficha.subject))
    errores.push(`subject "${ficha.subject}" no válido. Válidos: ${ASIGNATURAS_VALIDAS.join(', ')}`);

  if (opciones.asignaturaEsperada && ficha.subject && ficha.subject !== opciones.asignaturaEsperada) {
    errores.push(`Ficha "${ficha.id}": subject es "${ficha.subject}" pero se está importando en "${opciones.asignaturaEsperada}"`);
  }

  if (!ficha.titulo) errores.push(`Ficha "${ficha.id}": falta "titulo"`);
  if (!ficha.contenido) errores.push(`Ficha "${ficha.id}": falta "contenido"`);
  if (!ficha.nivel || ![1, 2, 3].includes(ficha.nivel))
    errores.push(`Ficha "${ficha.id}": "nivel" debe ser 1, 2 o 3`);

  if (!Array.isArray(ficha.ejercicios) || ficha.ejercicios.length === 0) {
    errores.push(`Ficha "${ficha.id}": debe tener un array "ejercicios" con al menos 1 ejercicio`);
  } else {
    const idsEjercicios = new Set();
    const distribucionNiveles = { 1: 0, 2: 0, 3: 0 };

    for (let i = 0; i < ficha.ejercicios.length; i++) {
      const ej = ficha.ejercicios[i];
      if (ej?.id) {
        if (idsEjercicios.has(ej.id)) errores.push(`Ficha "${ficha.id}": ID de ejercicio duplicado "${ej.id}"`);
        idsEjercicios.add(ej.id);
      }
      if (ej?.nivel && distribucionNiveles[ej.nivel] !== undefined) distribucionNiveles[ej.nivel]++;
      validarEjercicio(ej, i, ficha, errores, warnings);
    }

    // Warning de distribución (3+3+2)
    if (ficha.ejercicios.length >= 8) {
      const { 1: n1, 2: n2, 3: n3 } = distribucionNiveles;
      if (n1 < 2 || n2 < 2 || n3 < 1)
        warnings.push(`Ficha "${ficha.id}": distribución de niveles desequilibrada (nivel 1: ${n1}, nivel 2: ${n2}, nivel 3: ${n3}). Recomendado 3+3+2.`);
    } else {
      warnings.push(`Ficha "${ficha.id}": tiene ${ficha.ejercicios.length} ejercicios. Recomendado mínimo 8.`);
    }
  }

  return { valida: errores.length === 0, errores, warnings };
}

export function validarImportacion(input, asignaturaEsperada) {
  let fichas;
  if (Array.isArray(input)) fichas = input;
  else if (input?.fichas && Array.isArray(input.fichas)) fichas = input.fichas;
  else if (input?.id && input?.ejercicios) fichas = [input];
  else return {
    valida: false,
    errores: ['Formato no reconocido. Debe ser un array de fichas, un objeto con campo "fichas", o una ficha individual.'],
    warnings: [],
    fichas: [],
  };

  const errores = [];
  const warnings = [];
  const idsFichas = new Set();
  const idsEjerciciosGlobal = new Set();
  const fichasValidadas = [];

  for (const ficha of fichas) {
    if (ficha?.id) {
      if (idsFichas.has(ficha.id)) errores.push(`ID de ficha duplicado en el bloque: "${ficha.id}"`);
      idsFichas.add(ficha.id);
    }

    // IDs únicos de ejercicios entre todas las fichas del bloque
    for (const ej of ficha?.ejercicios ?? []) {
      if (ej?.id) {
        if (idsEjerciciosGlobal.has(ej.id))
          errores.push(`ID de ejercicio duplicado entre fichas del bloque: "${ej.id}"`);
        idsEjerciciosGlobal.add(ej.id);
      }
    }

    const res = validarFicha(ficha, { asignaturaEsperada });
    errores.push(...res.errores);
    warnings.push(...res.warnings);
    fichasValidadas.push(ficha);
  }

  const totalEjercicios = fichasValidadas.reduce((sum, f) => sum + (f.ejercicios?.length ?? 0), 0);

  return {
    valida: errores.length === 0,
    errores,
    warnings,
    fichas: fichasValidadas,
    stats: { numFichas: fichasValidadas.length, numEjercicios: totalEjercicios },
  };
}

export { TIPOS_VALIDOS, ASIGNATURAS_VALIDAS };
