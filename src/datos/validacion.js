// Validador de fichas/ejercicios para importación (sin librerías externas)

const TIPOS_VALIDOS = [
  'EleccionMultiple', 'RellenarHueco', 'ArrastrarPalabras', 'OrdenarFrase',
  'UnirColumnas', 'ClasificarGrupos', 'CompletarSerie', 'SopaLetras',
  'MemoriaPareja', 'ProblemaVisual', 'ComprensionLectora',
];

const ASIGNATURAS_VALIDAS = ['matematicas', 'lengua', 'ciencias', 'social', 'ingles', 'valores'];

// Campos requeridos por tipo de ejercicio
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

function validarEjercicio(ej, idx, fichaId) {
  const errores = [];
  const ref = `ficha "${fichaId}" → ejercicio[${idx}]`;

  if (!ej.id) errores.push(`${ref}: falta "id"`);
  if (!ej.fichaId) errores.push(`${ref}: falta "fichaId"`);
  if (ej.fichaId && ej.fichaId !== fichaId) errores.push(`${ref}: fichaId no coincide con la ficha contenedora`);
  if (!ej.tipo) errores.push(`${ref}: falta "tipo"`);
  else if (!TIPOS_VALIDOS.includes(ej.tipo)) errores.push(`${ref}: tipo "${ej.tipo}" no es válido. Tipos: ${TIPOS_VALIDOS.join(', ')}`);

  if (ej.nivel !== undefined && ![1, 2, 3].includes(ej.nivel)) errores.push(`${ref}: nivel debe ser 1, 2 o 3`);

  const camposReq = CAMPOS_POR_TIPO[ej.tipo] ?? [];
  for (const campo of camposReq) {
    if (ej[campo] === undefined || ej[campo] === null) errores.push(`${ref}: falta campo "${campo}" para tipo ${ej.tipo}`);
  }

  // Validaciones específicas
  if (ej.tipo === 'EleccionMultiple' && Array.isArray(ej.opciones)) {
    const opcionesTexto = ej.opciones.map(o => typeof o === 'string' ? o : o?.texto);
    if (!opcionesTexto.includes(ej.respuestaCorrecta)) {
      errores.push(`${ref}: respuestaCorrecta "${ej.respuestaCorrecta}" no está en las opciones`);
    }
  }

  return errores;
}

export function validarFicha(ficha, opciones = {}) {
  const errores = [];
  const idsEjercicios = new Set();

  if (!ficha || typeof ficha !== 'object') {
    return { valida: false, errores: ['La ficha no es un objeto válido'] };
  }

  if (!ficha.id) errores.push('Falta "id" en la ficha');
  if (!ficha.subject) errores.push('Falta "subject" en la ficha');
  else if (!ASIGNATURAS_VALIDAS.includes(ficha.subject)) errores.push(`subject "${ficha.subject}" no válido. Válidos: ${ASIGNATURAS_VALIDAS.join(', ')}`);

  if (opciones.asignaturaEsperada && ficha.subject && ficha.subject !== opciones.asignaturaEsperada) {
    errores.push(`Ficha "${ficha.id}": subject es "${ficha.subject}" pero se está importando en "${opciones.asignaturaEsperada}"`);
  }

  if (!ficha.titulo) errores.push(`Ficha "${ficha.id}": falta "titulo"`);
  if (!ficha.contenido) errores.push(`Ficha "${ficha.id}": falta "contenido"`);
  if (!ficha.nivel || ![1, 2, 3].includes(ficha.nivel)) errores.push(`Ficha "${ficha.id}": "nivel" debe ser 1, 2 o 3`);

  if (!Array.isArray(ficha.ejercicios) || ficha.ejercicios.length === 0) {
    errores.push(`Ficha "${ficha.id}": debe tener un array "ejercicios" con al menos 1 ejercicio`);
  } else {
    for (let i = 0; i < ficha.ejercicios.length; i++) {
      const ej = ficha.ejercicios[i];
      if (idsEjercicios.has(ej.id)) errores.push(`Ficha "${ficha.id}": ID de ejercicio duplicado "${ej.id}"`);
      idsEjercicios.add(ej.id);
      errores.push(...validarEjercicio(ej, i, ficha.id));
    }
  }

  return { valida: errores.length === 0, errores };
}

export function validarImportacion(input, asignaturaEsperada) {
  // Acepta:
  //   - array de fichas
  //   - objeto con { fichas: [...] }
  //   - objeto que ES una ficha individual
  let fichas;
  if (Array.isArray(input)) fichas = input;
  else if (input?.fichas && Array.isArray(input.fichas)) fichas = input.fichas;
  else if (input?.id && input?.ejercicios) fichas = [input];
  else return { valida: false, errores: ['Formato no reconocido. Debe ser un array de fichas, un objeto con campo "fichas", o una ficha individual.'], fichas: [] };

  const errores = [];
  const idsFichas = new Set();
  const fichasValidadas = [];

  for (const ficha of fichas) {
    if (idsFichas.has(ficha.id)) errores.push(`ID de ficha duplicado en el bloque: "${ficha.id}"`);
    idsFichas.add(ficha.id);

    const { errores: errFicha } = validarFicha(ficha, { asignaturaEsperada });
    errores.push(...errFicha);
    fichasValidadas.push(ficha);
  }

  // Estadísticas
  const totalEjercicios = fichasValidadas.reduce((sum, f) => sum + (f.ejercicios?.length ?? 0), 0);

  return {
    valida: errores.length === 0,
    errores,
    fichas: fichasValidadas,
    stats: { numFichas: fichasValidadas.length, numEjercicios: totalEjercicios },
  };
}

export { TIPOS_VALIDOS, ASIGNATURAS_VALIDAS };
