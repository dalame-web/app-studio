#!/usr/bin/env node
/**
 * scripts/notebooklm-a-json.js
 * Pipeline completo: chat de NotebookLM (gratis, sin API de pago) → ficha
 * JSON lista para el editor de la app. No genera contenido nuevo por su
 * cuenta — reestructura lo que NotebookLM ya escribió, y construye por
 * código lo que es puramente mecánico (ver "QUÉ HACE" abajo).
 *
 * ── USO NORMAL (recomendado) ────────────────────────────────────────────
 * node scripts/notebooklm-a-json.js
 *   1. Elige la asignatura de una lista (idioma y módulo numérico de
 *      Matemáticas se resuelven solos).
 *   2. El id de la ficha se calcula solo (mira public/content/{subject}/index.json).
 *   3. Copia el prompt completo al portapapeles (comando `clip` de Windows) —
 *      pégalo como FUENTE en NotebookLM (+ Añadir fuentes → Texto copiado).
 *   4. Copia el mensaje corto del chat al portapapeles — pégalo en el chat.
 *   5. Pega aquí la respuesta completa de NotebookLM (escribe FIN para
 *      terminar, o Ctrl+D) y el script hace TODO lo demás solo.
 *
 * Uso manual (pruebas/automatización):
 *   node scripts/notebooklm-a-json.js <fichaId> <subject>                  (pega el texto en terminal)
 *   node scripts/notebooklm-a-json.js <material.txt> <fichaId> <subject>   (lee de fichero)
 *
 * ── QUÉ HACE, SIN INTERVENCIÓN MANUAL ────────────────────────────────────
 * - Parsea las 6-8 secciones del texto, tolerante a variaciones reales de
 *   NotebookLM: cabeceras traducidas al inglés, secciones pegadas en un
 *   párrafo sin saltos de línea, "[***]" en vez de "[___]".
 * - Construye los 11 tipos de ejercicio: 8 desde el texto de NotebookLM,
 *   y 3 (SopaLetras, MemoriaPareja, UnirColumnas) 100% por código desde
 *   PALABRAS CLAVE, sin pedirle nada nuevo al chat.
 * - SopaLetras: algoritmo real de colocación (no un LLM) + autocomprobación
 *   letra a letra antes de aceptar el ejercicio.
 * - Nivel de cada EleccionMultiple: por código, según cuántos distractores
 *   comparten categoría con la respuesta (señal de "confusión", más fiable
 *   que pedirle al LLM que se autoevalúe) — detecta también el patrón
 *   "contraejemplo" (cuál no pertenece), que tiene la señal invertida.
 * - Baraja todo lo que la app NO baraja sola (ArrastrarPalabras.banco,
 *   ClasificarGrupos.items, CompletarSerie.opciones) — sin esto, la
 *   respuesta correcta queda siempre en la misma posición y el ejercicio
 *   se vuelve trivial por posición, no por conocimiento.
 * - Avisa (sin bloquear) de posibles términos inventados fuera del material
 *   y de ejercicios que evalúan el mismo concepto dos veces.
 * - Etiqueta la ficha con el curso activo (src/config.js → CURSO_ACTUAL),
 *   para que la app sepa distinguir fichas de distintos cursos y solo
 *   muestre las del curso en el que está el niño ahora mismo.
 * - Reequilibra posiciones (rebalanceo.js) y valida contra las reglas
 *   reales de la app (validacion.js) — igual que hace `npm run publicar`.
 * - Escribe el JSON en public/content/{subject}/{fichaId}.json + index.json
 *   (visible ya en el editor: npm run dev → /editor.html). NO toca git —
 *   eso sigue siendo `npm run publicar`, aparte y deliberado.
 * - Guarda un log persistente de cada ejecución en material-temp/notebooklm-a-json.log.
 *
 * Fuente de verdad del prompt: PROMPT-FICHAS.md ("EL PROMPT DE NOTEBOOKLM").
 * Si se cambia aquí, cambiar también allí (y viceversa).
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CURSO_ACTUAL } from '../src/config.js';

// idioma y modulo numérico según la tabla de PROMPT-FICHAS.md — colegio
// bilingüe: Ciencias/Sociales/Inglés en inglés, el resto en español.
const ASIGNATURAS = [
  { id: 'matematicas', prefijo: 'mat', nombre: 'Matemáticas', idioma: 'ESPAÑOL DE ESPAÑA (no uses vocabulario ni expresiones latinoamericanas)', incluirMate: true },
  { id: 'lengua', prefijo: 'len', nombre: 'Lengua', idioma: 'ESPAÑOL DE ESPAÑA (no uses vocabulario ni expresiones latinoamericanas)', incluirMate: false },
  { id: 'ciencias', prefijo: 'cie', nombre: 'Ciencias Naturales', idioma: 'INGLÉS', incluirMate: false },
  { id: 'social', prefijo: 'soc', nombre: 'Ciencias Sociales', idioma: 'INGLÉS', incluirMate: false },
  { id: 'ingles', prefijo: 'ing', nombre: 'Inglés', idioma: 'INGLÉS', incluirMate: false },
  { id: 'valores', prefijo: 'val', nombre: 'Valores Cívicos', idioma: 'ESPAÑOL DE ESPAÑA (no uses vocabulario ni expresiones latinoamericanas)', incluirMate: false },
];

const NOMBRE_FUENTE = 'INSTRUCCIONES PARA GENERAR MATERIAL DE LA FICHA';
const MENSAJE_CHAT = `Genera el material de la ficha siguiendo las instrucciones de la fuente "${NOMBRE_FUENTE}".`;

// El mismo prompt de PROMPT-FICHAS.md ("EL PROMPT DE NOTEBOOKLM"), con el
// Edad aproximada por curso de Primaria en España (empieza a los 6 años) —
// solo para que NotebookLM calibre vocabulario/complejidad, no se usa para
// nada más.
const EDAD_POR_CURSO = { 1: '6-7', 2: '7-8', 3: '8-9', 4: '9-10', 5: '10-11', 6: '11-12' };

// idioma resuelto, curso/edad real (antes el prompt era idéntico para
// cualquier curso — CURSO_ACTUAL solo etiquetaba la ficha después, nunca
// llegaba a NotebookLM, así que una ficha de 6º pedía la misma complejidad
// que una de 3º) y las 2 secciones numéricas incluidas solo si la asignatura
// es Matemáticas. Fuente única de verdad: si se cambia el prompt, cambiar
// aquí Y en PROMPT-FICHAS.md.
function construirPrompt(asignatura, curso) {
  const seccionesMate = `

## PROBLEMAS NUMERICOS (solo Matemáticas)
Basándote en el tipo de operación o cálculo que enseña el material (suma,
resta, multiplicación, división, tablas de multiplicar, fracciones...),
genera 6 problemas cortos de práctica usando números que tú elijas (no
tienen que estar literalmente en el texto, pero la OPERACIÓN sí debe ser la
que enseña el material). Calcula tú mismo el resultado correcto y
compruébalo dos veces antes de escribirlo. Varía la dificultad: 2 sencillos,
2 intermedios, 2 con dos pasos o números más grandes. Formato:
N1: enunciado corto con los números | Operacion: suma|resta|multiplicacion|division | Resultado: numero

## SERIES NUMERICAS (solo Matemáticas)
4 series numéricas del tipo que enseña el material (de 2 en 2, de 5 en 5,
tabla del 3, múltiplos de...), 5 números cada una, UNO sustituido por HUECO
en una posición distinta en cada serie (no siempre al final). Formato:
S1: 5, 10, HUECO, 20, 25 | Respuesta: 15`;

  return `INSTRUCCIONES PARA GENERAR MATERIAL DE LA FICHA (${asignatura.nombre})

Cuando te pida en el chat "${MENSAJE_CHAT}", sigue EXACTAMENTE estas reglas:

Basándote ÚNICAMENTE en las demás fuentes de este cuaderno, sin añadir
información que no esté en ellas, genera el siguiente material EN ${asignatura.idioma}
para un alumno de ${curso}º de Educación Primaria en España (${EDAD_POR_CURSO[curso] ?? '8-10'}
años). Adapta el vocabulario, la longitud de las frases y la complejidad de
las preguntas a esa edad — ni más simple ni más avanzado.

FORMATO DE SALIDA — sigue esto literalmente, sin excepciones ni variaciones
de una ficha a otra:
- Cabeceras de sección EXACTAMENTE como aparecen abajo, con DOS almohadillas
  y nada más: "## FICHA", "## PALABRAS CLAVE", etc. Nunca "###", "####" ni
  ninguna otra cantidad. Son solo etiquetas de formato, no forman parte del
  contenido — no las traduzcas ni las cambies.
- Texto plano, sin NINGÚN formato markdown de énfasis: nada de "**negrita**"
  ni "*cursiva*", ni siquiera en las etiquetas TITULO/CONTENIDO/EJEMPLOS o en
  los términos de PALABRAS CLAVE.
- El marcador de hueco es EXACTAMENTE "[___]" (corchete, tres guiones bajos,
  corchete) — nunca "[***]", nunca con espacios o barras invertidas dentro.
- No incluyas marcas de cita de ningún tipo ("[1]", "[2]", notas al pie...)
  en ninguna parte del resultado.
- Cada pregunta con opciones (PREGUNTAS OPCION MULTIPLE, TEXTO CORTO PARA
  COMPRENSION LECTORA) va en 3 líneas exactas, ni una más: la pregunta, la
  línea "Options: A) ... B) ... C) ... D) ..." con las 4 opciones SEGUIDAS
  en esa MISMA línea (nunca cada opción en su propia línea), y la línea
  "Correct answer: X) ...". No añadas líneas en blanco entre preguntas.
- Palabras de formato como "Options", "Correct answer" y "Correct word"
  van SIEMPRE en inglés y EXACTAMENTE así, aunque el resto de la ficha esté
  en español — no las traduzcas a "Opciones"/"Respuesta correcta".
- En PALABRAS CLAVE, CATEGORIAS y FRASES usa siempre "-" como viñeta —
  nunca números ("1.", "2."...) ni "•".
- Genera el material completo en una sola respuesta, sin dividirlo en
  varios mensajes ni pedir confirmación a mitad de camino.

## FICHA
TITULO: título corto del tema (máximo 6 palabras)
CONTENIDO: resumen de mínimo 4 frases completas explicando el tema
EJEMPLOS: 3 frases de ejemplo tomadas o adaptadas del texto

## PALABRAS CLAVE
10-12 términos importantes del tema, cada uno con una definición de una
frase (máximo 15 palabras). Formato:
- término: definición

## CATEGORIAS
Agrupa esas mismas palabras clave en 2 o 3 categorías con sentido temático.
3-6 palabras por categoría. Formato:
Nombre de categoría
- palabra1
- palabra2

## FRASES CON TERMINO CLAVE
8 frases completas del texto original, cada una AUTOCONTENIDA (que se
entienda sola, sin depender de frases anteriores). Cada frase debe contener
una palabra clave marcada así: [palabra]. Usa EXACTAMENTE la misma forma de
la palabra que en PALABRAS CLAVE. Una frase por línea.

## PREGUNTAS OPCION MULTIPLE
6 preguntas. Cada pregunta AUTOCONTENIDA — incluye una definición o ejemplo
breve dentro del propio enunciado. Cada una con 4 opciones: 1 correcta + 3
incorrectas pero del MISMO tipo semántico que la correcta. Nada de símbolos
de check/cruz en las opciones. Formato:
Q1: enunciado completo de la pregunta
Options: A) ... B) ... C) ... D) ...
Correct answer: X) ...

VARÍA EL ÁNGULO entre las 6 preguntas — no repitas el mismo patrón "¿Qué es
X?" en todas. Combina:
- Definición: dada una definición, identificar el término.
- Reconocimiento en contexto: dado un ejemplo o situación, identificar a
  qué término corresponde.
- Contraejemplo ("cuál no pertenece"): 3 opciones de la misma categoría
  (usa las categorías de la sección CATEGORIAS) y 1 que no pertenece —
  identificar cuál sobra.
Al menos 1 de las 6 preguntas debe ser de tipo contraejemplo.

Además, al menos 2 de las 6 preguntas deben exigir combinar información de
DOS conceptos distintos de la ficha (no solo repetir una definición aislada)
— por ejemplo, relacionar un término con una consecuencia, una causa, o un
ejemplo que combine dos palabras clave a la vez.

REGLA CRÍTICA PARA LAS 3 OPCIONES INCORRECTAS: deben ser términos que TÚ
MISMO hayas definido o mencionado en alguna otra sección de esta misma
respuesta. Nunca introduzcas un término nuevo que no hayas explicado en
ningún otro sitio de tu propia respuesta, aunque sea real y correcto dentro
del tema. Las 4 opciones de una misma pregunta deben poder confundirse entre
sí porque tratan del MISMO tema concreto (ej. 4 nombres de figuras, o 4
tipos de comunicación) — MAL: mezclar en la misma pregunta un tipo de
ángulo, un concepto de perímetro, un cuerpo geométrico y un término de
probabilidad solo porque los cuatro salen en la ficha.${asignatura.id === 'matematicas' ? `

Si una pregunta trata sobre identificar una figura o cuerpo geométrico, usa
SIEMPRE uno de estos nombres estándar (no inventes variantes ni sinónimos):
triángulo, triángulo equilátero, triángulo isósceles, triángulo escaleno,
triángulo rectángulo, cuadrado, rectángulo, rombo, romboide, trapecio,
círculo, óvalo, pentágono, hexágono, heptágono, octágono, cubo, prisma,
pirámide, esfera, cilindro, cono.` : ''}${asignatura.incluirMate ? seccionesMate : ''}

## TEXTO CORTO PARA COMPRENSION LECTORA
Un párrafo autocontenido de máximo 90 palabras. Después, 3 preguntas sobre
él, cada una en UNO de estos dos formatos:
FORMATO A (opción múltiple): pregunta + 4 opciones cortas (1 correcta, 3
incorrectas pero plausibles, hechas también con términos que ya hayas usado
en esta respuesta) + cuál es la correcta.
FORMATO B (hueco): una frase del párrafo con una palabra clave o un número
sustituido por [___] (tres guiones bajos, EXACTAMENTE así — no uses [***]
ni ningún otro símbolo) + la respuesta correcta.
Indica qué formato usas en cada pregunta. Formato:
PARRAFO: ...
P1: (FORMATO A - opción múltiple) pregunta Options: A) ... B) ... C) ... D) ... Correct answer: X) ...
P2: (FORMATO B - hueco) frase con [___] Correct word: palabra

ANTES DE ESCRIBIR "PREGUNTAS OPCION MULTIPLE" Y "TEXTO CORTO PARA
COMPRENSION LECTORA": revisa qué términos vas a usar como respuesta correcta
en FRASES CON TERMINO CLAVE, en PREGUNTAS OPCION MULTIPLE y en las preguntas
de TEXTO CORTO PARA COMPRENSION LECTORA. Cada término solo debe ser la
respuesta correcta en UNA de estas tres secciones, nunca en dos o las tres a
la vez.

No inventes nada que no esté en las fuentes. Si no hay material suficiente
para alguna sección, indícalo y omite esa sección.`;
}

// Copia al portapapeles en Windows. NO usa `clip` directamente: `clip` lee su
// entrada con la code page del terminal (850/1252), no UTF-8, y corrompe
// cualquier acento/eñe ("Basándote" → "Bas├índote") — confirmado con datos
// reales (el propio texto del prompt pegado en NotebookLM salía así). En vez
// de eso: escribe el texto en un fichero UTF-8 y usa `Set-Clipboard` de
// PowerShell con -Encoding UTF8 explícito, que sí lo respeta.
function copiarPortapapeles(texto) {
  const tmp = join(tmpdir(), `notebooklm-a-json-clip-${Date.now()}.txt`);
  try {
    writeFileSync(tmp, texto, 'utf8');
    execSync(`powershell -NoProfile -Command "Get-Content -Raw -Encoding UTF8 -LiteralPath '${tmp}' | Set-Clipboard"`);
    return true;
  } catch {
    return false;
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
}

// Si la entrada llega de golpe (pegada, o por tubería en pruebas), Node puede
// emitir TODAS las líneas del tirón antes de que el código tenga ocasión de
// cambiar de "escuchando la asignatura" a "escuchando el texto" — con un
// listener que se quita y se vuelve a poner por fases, esas líneas se pierden.
// Por eso: un ÚNICO listener 'line', registrado una vez y nunca retirado,
// que va guardando todo en una cola; cada fase saca de ahí lo que necesita.
function crearColaLineas(rl) {
  const buffer = [];
  const esperando = [];
  let cerrado = false;
  rl.on('line', (linea) => {
    if (esperando.length) esperando.shift()(linea);
    else buffer.push(linea);
  });
  rl.once('close', () => {
    cerrado = true;
    while (esperando.length) esperando.shift()(null);
  });
  return function siguienteLinea() {
    if (buffer.length) return Promise.resolve(buffer.shift());
    if (cerrado) return Promise.resolve(null);
    return new Promise((resolve) => esperando.push(resolve));
  };
}

async function esperarEnter(siguienteLinea, mensaje) {
  process.stdout.write('\n' + mensaje);
  await siguienteLinea();
}

async function elegirAsignatura(siguienteLinea) {
  console.log('\n¿Qué asignatura es?');
  ASIGNATURAS.forEach((a, i) => console.log(`  ${i + 1}. ${a.nombre}`));
  process.stdout.write('Número: ');
  const respuesta = (await siguienteLinea())?.trim() ?? '';
  const elegida = ASIGNATURAS[parseInt(respuesta, 10) - 1];
  if (!elegida) {
    console.error(`✗ Opción "${respuesta}" no válida. Elige un número del 1 al ${ASIGNATURAS.length}.`);
    process.exit(1);
  }
  return elegida;
}

// Mira qué fichas ya existen de esa asignatura en public/content/{subject}/index.json
// y calcula el siguiente id libre (ej. si ya hay cie-001, devuelve cie-002).
function siguienteFichaId(__dirnameLocal, asignatura) {
  const indicePath = join(__dirnameLocal, '..', 'public', 'content', asignatura.id, 'index.json');
  let maxN = 0;
  if (existsSync(indicePath)) {
    const indice = JSON.parse(readFileSync(indicePath, 'utf8'));
    const re = new RegExp(`^${asignatura.prefijo}-(\\d+)$`);
    for (const f of indice.fichas ?? []) {
      const m = re.exec(f.id);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
  }
  return `${asignatura.prefijo}-${String(maxN + 1).padStart(3, '0')}`;
}

const MARCADOR_FIN = 'FIN';

// Lee el texto de NotebookLM: de un fichero .txt si se pasa como argumento,
// o pegado directamente en la terminal si no se pasa ningún fichero — no hace
// falta crear un .txt a mano. Termina cuando ve la línea "FIN" (o EOF/Ctrl+D).
//
// NO usa "2 líneas en blanco seguidas" como señal de fin: NotebookLM separa
// sus propias secciones (ej. entre EJEMPLOS y PALABRAS CLAVE) con dos saltos
// de línea, así que ese detector cortaba el pegado a mitad de camino y
// descartaba el resto del texto sin avisar — bug real, encontrado con datos
// reales, no una hipótesis.
async function leerTexto(siguienteLinea, rutaEntrada) {
  if (rutaEntrada && existsSync(rutaEntrada)) {
    return readFileSync(rutaEntrada, 'utf8');
  }
  console.log(`Pega el texto que te ha dado NotebookLM. Cuando termines, escribe ${MARCADOR_FIN} en una línea nueva y pulsa Enter (o Ctrl+D):\n`);
  const lineas = [];
  for (;;) {
    const linea = await siguienteLinea();
    if (linea === null) break; // EOF / Ctrl+D
    if (linea.trim().toUpperCase() === MARCADOR_FIN) break;
    lineas.push(linea);
  }
  const texto = lineas.join('\n').trim();
  if (!texto) throw new Error('No se pegó ningún contenido.');
  return texto;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, '..', 'material-temp', 'notebooklm-a-json.log');

// Todo lo que se imprime en consola se acumula aquí y se vuelca al log al
// final — así queda un historial de cada ejecución sin que haya que estar
// resumiéndolo a mano cada vez.
const lineasLog = [];
function log(linea = '') {
  console.log(linea);
  lineasLog.push(linea);
}
function logError(linea) {
  console.error(linea);
  lineasLog.push(linea);
}
function volcarLog(cabecera) {
  const bloque = `\n${'='.repeat(70)}\n${new Date().toISOString()} — ${cabecera}\n${'='.repeat(70)}\n${lineasLog.join('\n')}\n`;
  appendFileSync(LOG_PATH, bloque, 'utf8');
}

const stripCitas = (s) => s.replace(/\[\d+\]/g, '').trim();

// NotebookLM a veces usa [***] en vez de [___] como marcador de hueco (visto en
// ComprensionLectora), y a veces además escapa los asteriscos en markdown con
// espacios sueltos — "[ \*\*\*]" (visto con datos reales) — el motor de
// ejercicios solo reconoce [___] literal.
const normalizarHueco = (s) => s.replace(/\[\s*(?:\\?[*_]\s*){2,}\]/g, '[___]');

// Librería de SVG para figuras geométricas — mismo estilo que PROMPT-FICHAS.md.
// Triángulo/Cuadrado/Rectángulo/Círculo/Pentágono/Hexágono ya estaban en el
// prompt; Rombo y Trapecio son nuevos (esta ficha de matemáticas los necesitaba
// y no existían todavía).
const quitarAcentos = (s) => s.toLowerCase()
  .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i')
  .replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u');

// Figuras planas (2D) — temario real de 3º-6º de Primaria.
const SVG_FORMAS_2D = {
  'triangulo': "<svg width='60' height='54'><polygon points='30,2 2,52 58,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>",
  'triangulo equilatero': "<svg width='60' height='54'><polygon points='30,2 2,52 58,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>",
  'triangulo isosceles': "<svg width='60' height='54'><polygon points='30,2 10,52 50,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>",
  'triangulo escaleno': "<svg width='60' height='54'><polygon points='38,2 4,52 58,44' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>",
  'triangulo rectangulo': "<svg width='60' height='54'><polygon points='2,52 2,2 58,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>",
  'cuadrado': "<svg width='54' height='54'><rect x='2' y='2' width='50' height='50' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>",
  'rectangulo': "<svg width='60' height='42'><rect x='2' y='2' width='56' height='38' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>",
  'rombo': "<svg width='54' height='54'><polygon points='27,2 52,27 27,52 2,27' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>",
  'romboide': "<svg width='60' height='44'><polygon points='16,2 58,2 44,42 2,42' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>",
  'paralelogramo': "<svg width='60' height='44'><polygon points='16,2 58,2 44,42 2,42' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>",
  'trapecio': "<svg width='60' height='48'><polygon points='18,2 42,2 58,46 2,46' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>",
  'circulo': "<svg width='54' height='54'><circle cx='27' cy='27' r='25' fill='#fef9c3' stroke='#a16207' stroke-width='2'/></svg>",
  'ovalo': "<svg width='60' height='44'><ellipse cx='30' cy='22' rx='28' ry='20' fill='#fef9c3' stroke='#a16207' stroke-width='2'/></svg>",
  'pentagono': "<svg width='54' height='54'><polygon points='27,2 51,20 42,50 12,50 3,20' fill='#fce7f3' stroke='#9d174d' stroke-width='2'/></svg>",
  'hexagono': "<svg width='54' height='54'><polygon points='27,2 49,15 49,39 27,52 5,39 5,15' fill='#fce7f3' stroke='#9d174d' stroke-width='2'/></svg>",
  'heptagono': "<svg width='54' height='54'><polygon points='27,2 46,10 52,30 40,48 14,48 2,30 8,10' fill='#fce7f3' stroke='#9d174d' stroke-width='2'/></svg>",
  'octagono': "<svg width='54' height='54'><polygon points='18,2 36,2 52,18 52,36 36,52 18,52 2,36 2,18' fill='#fce7f3' stroke='#9d174d' stroke-width='2'/></svg>",
};

// Cuerpos geométricos (3D) — vista simple tipo "pseudo-isométrica", mismo
// estilo visual que las figuras planas (relleno + contorno de color).
const SVG_FORMAS_3D = {
  'cubo': "<svg width='60' height='56'><polygon points='14,10 44,10 54,20 54,50 24,50 14,40' fill='#e0e7ff' stroke='#4338ca' stroke-width='2'/><polygon points='14,10 44,10 34,20 4,20' fill='#c7d2fe' stroke='#4338ca' stroke-width='2'/><polygon points='14,10 4,20 4,50 14,40' fill='#a5b4fc' stroke='#4338ca' stroke-width='2'/></svg>",
  'prisma': "<svg width='60' height='50'><polygon points='10,46 10,16 30,4 30,34' fill='#c7d2fe' stroke='#4338ca' stroke-width='2'/><polygon points='30,4 50,16 50,46 30,34' fill='#e0e7ff' stroke='#4338ca' stroke-width='2'/><polygon points='10,46 30,34 50,46 30,58' fill='#a5b4fc' stroke='#4338ca' stroke-width='2'/></svg>",
  'piramide': "<svg width='60' height='54'><polygon points='30,2 4,46 56,46' fill='#e0e7ff' stroke='#4338ca' stroke-width='2'/><line x1='30' y1='2' x2='30' y2='46' stroke='#4338ca' stroke-width='1.5'/></svg>",
  'esfera': "<svg width='54' height='54'><circle cx='27' cy='27' r='25' fill='#fee2e2' stroke='#b91c1c' stroke-width='2'/><ellipse cx='27' cy='27' rx='25' ry='9' fill='none' stroke='#b91c1c' stroke-width='1' opacity='0.5'/></svg>",
  'cilindro': "<svg width='50' height='58'><ellipse cx='25' cy='10' rx='22' ry='8' fill='#fee2e2' stroke='#b91c1c' stroke-width='2'/><rect x='3' y='10' width='44' height='38' fill='#fecaca' stroke='#b91c1c' stroke-width='2'/><ellipse cx='25' cy='48' rx='22' ry='8' fill='#fee2e2' stroke='#b91c1c' stroke-width='2'/></svg>",
  'cono': "<svg width='54' height='58'><ellipse cx='27' cy='50' rx='24' ry='8' fill='#fee2e2' stroke='#b91c1c' stroke-width='2'/><polygon points='27,2 5,50 49,50' fill='#fecaca' stroke='#b91c1c' stroke-width='2'/></svg>",
};

const SVG_FORMAS = { ...SVG_FORMAS_2D, ...SVG_FORMAS_3D };

// Si TODAS las opciones de un EleccionMultiple son nombres de figuras
// conocidas, añade el SVG a cada opción — refuerzo visual, no hace falta
// pedírselo a NotebookLM (texto plano no puede generar dibujos). Si solo
// ALGUNAS coinciden (ni 0 ni todas), es señal de que puede tratarse de una
// figura del temario que aún no está en SVG_FORMAS — se avisa en vez de
// dejarlo pasar en silencio con la mitad de las opciones sin dibujo.
function anadirSvgFormas(opciones) {
  const svgs = opciones.map((o) => SVG_FORMAS[quitarAcentos(o.texto ?? o)]);
  if (svgs.every(Boolean)) {
    return { opciones: opciones.map((o, i) => ({ ...(typeof o === 'string' ? { texto: o, emoji: '' } : o), svg: svgs[i] })), avisoParcial: false };
  }
  const cuantos = svgs.filter(Boolean).length;
  return { opciones, avisoParcial: cuantos > 0 && cuantos < svgs.length };
}
// "•" incluido además de "-"/"*"/"1." — visto al pegar listas ya renderizadas.
const RE_VIÑETA = /^\s*(?:[-*•]|\d+\.)\s*/;
const esViñeta = (s) => RE_VIÑETA.test(s);
const quitarViñeta = (s) => s.replace(RE_VIÑETA, '').trim();

// ── Localizar secciones, aceptando cabecera en español o en inglés ──────────

const SECCIONES = [
  { key: 'ficha', alias: ['FICHA', 'STUDY SHEET'] },
  { key: 'palabrasClave', alias: ['PALABRAS CLAVE', 'KEYWORDS'] },
  { key: 'categorias', alias: ['CATEGORIAS', 'CATEGORÍAS', 'CATEGORIES'] },
  { key: 'frases', alias: ['FRASES CON TERMINO CLAVE', 'FRASES CON TÉRMINO CLAVE', 'SENTENCES WITH KEYWORDS'] },
  { key: 'mcq', alias: ['PREGUNTAS OPCION MULTIPLE', 'PREGUNTAS OPCIÓN MULTIPLE', 'MULTIPLE CHOICE QUESTIONS'] },
  { key: 'problemas', alias: ['PROBLEMAS NUMERICOS', 'PROBLEMAS NUMÉRICOS'] },
  { key: 'series', alias: ['SERIES NUMERICAS', 'SERIES NUMÉRICAS'] },
  { key: 'comprension', alias: ['TEXTO CORTO PARA COMPRENSION LECTORA', 'TEXTO CORTO PARA COMPRENSIÓN LECTORA', 'SHORT TEXT FOR READING COMPREHENSION'] },
];

function encontrarInicio(texto, aliases) {
  for (const a of aliases) {
    // #{0,6}: markdown admite hasta 6 "#" de profundidad (visto "####" real,
    // no solo "##" del prompt) — \**...\**: NotebookLM a veces envuelve la
    // cabecera en negrita en vez de (o además de) usar "#".
    const re = new RegExp(`^#{0,6}\\s*\\*{0,2}\\s*${a}\\s*\\*{0,2}\\s*$`, 'im');
    const m = re.exec(texto);
    if (m) return { index: m.index, fin: m.index + m[0].length };
  }
  return null;
}

function partirSecciones(texto) {
  const encontrados = SECCIONES
    .map((s) => ({ ...s, pos: encontrarInicio(texto, s.alias) }))
    .filter((s) => s.pos)
    .sort((a, b) => a.pos.index - b.pos.index);

  const bloques = {};
  encontrados.forEach((s, i) => {
    const desde = s.pos.fin;
    const hasta = i + 1 < encontrados.length ? encontrados[i + 1].pos.index : texto.length;
    bloques[s.key] = texto.slice(desde, hasta).trim();
  });
  return bloques;
}

// ── Parsers por sección ──────────────────────────────────────────────────────

function parsearFicha(bloque) {
  // No greedy y con corte explícito en CONTENIDO/CONTENT: si NotebookLM pega
  // TITULO y CONTENIDO en la misma línea sin salto (visto con datos reales),
  // un simple ".+" se come el resto de la ficha entera dentro del título.
  const titulo = stripCitas(/(?:TITULO|TÍTULO|TITLE):\s*(.+?)\s*(?:(?:CONTENIDO|CONTENT):|$)/im.exec(bloque)?.[1] ?? '');
  const contenido = stripCitas(
    /(?:CONTENIDO|CONTENT):\s*([\s\S]*?)(?=(?:EJEMPLOS|EXAMPLES):)/i.exec(bloque)?.[1] ?? ''
  );
  const ejemplosTxt = /(?:EJEMPLOS|EXAMPLES):\s*([\s\S]*)/i.exec(bloque)?.[1] ?? '';
  const ejemplos = ejemplosTxt
    .split('\n')
    .map((l) => quitarViñeta(l))
    .filter(Boolean)
    .map(stripCitas);
  return { titulo, contenido, ejemplos };
}

function parsearPalabrasClave(bloque) {
  return bloque
    .split('\n')
    .map((l) => l.trim())
    .filter(esViñeta)
    .map((l) => {
      const linea = stripCitas(quitarViñeta(l));
      const idx = linea.indexOf(':');
      return idx === -1
        ? { termino: linea, definicion: '' }
        : { termino: linea.slice(0, idx).trim(), definicion: linea.slice(idx + 1).trim() };
    });
}

function parsearCategorias(bloque) {
  const grupos = [];
  let actual = null;
  for (const linea of bloque.split('\n')) {
    const l = linea.trim();
    if (!l) continue;
    if (esViñeta(l)) {
      if (!actual) continue;
      actual.items.push(stripCitas(quitarViñeta(l)));
    } else {
      actual = { nombre: l, items: [] };
      grupos.push(actual);
    }
  }
  return grupos;
}

// Corta por frase (termina en . ! ?) en vez de por línea — funciona tanto si
// NotebookLM separa con viñetas/saltos de línea como si lo junta en un párrafo.
function parsearFrases(bloque) {
  const limpio = stripCitas(bloque.replace(new RegExp(RE_VIÑETA, 'gm'), ' '));
  const frases = limpio
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return frases
    .map((linea) => {
      const m = /\[([^\]]+)\]/.exec(linea);
      if (!m) return null;
      const termino = m[1];
      return {
        conHueco: normalizarHueco(linea.replace(m[0], '[___]')),
        completa: linea.replace(m[0], termino),
        termino,
      };
    })
    .filter(Boolean);
}

// Etiquetas de la plantilla en inglés ("Options:", "Correct answer:",
// "Correct word:") — mismo riesgo que "FORMAT"/"FORMATO": en fichas cuyo
// contenido se pide EN ESPAÑOL, NotebookLM puede traducir también estas
// etiquetas estructurales aunque se le pida mantenerlas. Tolerantes a ambos
// idiomas en vez de asumir que nunca las traduce.
const RE_OPTIONS = '(?:Options|Opciones)';
const RE_CORRECT_ANSWER = '(?:Correct answer|Respuesta correcta)';
const RE_CORRECT_WORD = '(?:Correct word|Palabra correcta)';

// Divide "A) foo B) bar C) baz" en opciones. Las letras solo cuentan como
// marcador si van pegadas a ")" y precedidas de inicio o espacio — así una
// opción como "UV-A" o "Cold ice" no rompe el corte (C de "Cold" no es marcador).
function extraerOpciones(opcionesTxt) {
  const marcadores = [...opcionesTxt.matchAll(/(?:^|\s)([A-D])\)\s/g)];
  return marcadores.map((m, i) => {
    const inicio = m.index + m[0].length;
    const fin = i + 1 < marcadores.length ? marcadores[i + 1].index : opcionesTxt.length;
    return stripCitas(opcionesTxt.slice(inicio, fin).trim());
  });
}

// Corta por "Q1:", "Q2:"... esté o no cada una en su propia línea.
function parsearMCQ(bloque) {
  const trozos = bloque
    .split(/(?=Q\d+\s*:)/)
    .map((t) => t.trim())
    .filter((t) => /^Q\d+\s*:/.test(t));

  return trozos.map((t) => {
    // Flag "s" (dotAll): NotebookLM a veces pone cada opción A)/B)/C)/D) en su
    // propia línea en vez de todas seguidas — sin "s", "." no cruza saltos de
    // línea y opcionesTxt salía vacío (0 opciones, la pregunta se descartaba
    // entera). Encontrado con datos reales.
    const enunciado = stripCitas(new RegExp(`Q\\d+\\s*:\\s*(.+?)\\s*${RE_OPTIONS}:`, 'is').exec(t)?.[1] ?? '');
    const opcionesTxt = new RegExp(`${RE_OPTIONS}:\\s*(.+?)\\s*${RE_CORRECT_ANSWER}:`, 'is').exec(t)?.[1] ?? '';
    const opciones = extraerOpciones(opcionesTxt);
    const letra = new RegExp(`${RE_CORRECT_ANSWER}:\\s*([A-D])\\)`, 'i').exec(t)?.[1];
    const idx = letra ? letra.charCodeAt(0) - 65 : -1;
    return { enunciado, opciones, respuestaCorrecta: opciones[idx] };
  });
}

// Solo para Matemáticas. Corta por "N1:", "N2:"... esté o no cada uno en su
// propia línea (visto: NotebookLM los suele pegar todos en un párrafo).
function parsearProblemas(bloque) {
  const trozos = bloque.split(/(?=N\d+\s*:)/).map((t) => t.trim()).filter((t) => /^N\d+\s*:/.test(t));
  return trozos.map((t) => {
    const enunciado = stripCitas(/N\d+\s*:\s*(.+?)\s*\|\s*Operacion:/i.exec(t)?.[1] ?? '');
    const operacion = (/Operacion:\s*(\w+)/i.exec(t)?.[1] ?? '').toLowerCase();
    const resultado = /Resultado:\s*(-?\d+)/i.exec(t)?.[1] ?? '';
    return { enunciado, operacion, resultado };
  }).filter((p) => p.enunciado && p.resultado !== '');
}

// Solo para Matemáticas. "S1: 4, 8, HUECO, 16, 20 | Respuesta: 12"
function parsearSeries(bloque) {
  const trozos = bloque.split(/(?=S\d+\s*:)/).map((t) => t.trim()).filter((t) => /^S\d+\s*:/.test(t));
  return trozos.map((t) => {
    const listaTxt = /S\d+\s*:\s*(.+?)\s*\|\s*Respuesta:/i.exec(t)?.[1] ?? '';
    const serie = listaTxt.split(',').map((s) => s.trim()).map((s) => (/hueco/i.test(s) ? null : s));
    const respuesta = /Respuesta:\s*(-?\d+)/i.exec(t)?.[1] ?? '';
    return { serie, respuesta };
  }).filter((s) => s.serie.includes(null) && s.respuesta !== '');
}

// Corta por "PARRAFO:" y "P1:", "P2:"... esté o no cada una en su propia línea.
function parsearComprension(bloque) {
  const limpio = stripCitas(bloque);
  const texto = (/PARRAFO:\s*([\s\S]*?)(?=P\d+\s*:)/i.exec(limpio) ?? /PARAGRAPH:\s*([\s\S]*?)(?=P\d+\s*:)/i.exec(limpio))?.[1]?.trim() ?? '';

  // FORMATO?: NotebookLM a veces traduce "FORMAT" a "FORMATO" (se le pide en
  // español) pese a que la plantilla del prompt usa el término en inglés —
  // aceptar las dos variantes en vez de depender de que no lo traduzca.
  const trozos = limpio
    .split(/(?=P\d+\s*:\s*\(FORMATO?)/i)
    .map((t) => t.trim())
    .filter((t) => /^P\d+\s*:/.test(t));

  const preguntas = trozos.map((t) => {
    if (/FORMATO?\s*A\b/i.test(t)) {
      // "s" (dotAll): mismo motivo que en parsearMCQ — opciones cada una en su
      // propia línea, sin esto opcionesTxt salía vacío.
      const enunciado = new RegExp(`\\)\\s*(.+?)\\s*${RE_OPTIONS}:`, 'is').exec(t)?.[1]?.trim() ?? '';
      const opcionesTxt = new RegExp(`${RE_OPTIONS}:\\s*(.+?)\\s*${RE_CORRECT_ANSWER}:`, 'is').exec(t)?.[1] ?? '';
      const opciones = extraerOpciones(opcionesTxt);
      const letraCorrecta = new RegExp(`${RE_CORRECT_ANSWER}:\\s*([A-D])\\)`, 'i').exec(t)?.[1];
      const idx = letraCorrecta ? letraCorrecta.charCodeAt(0) - 65 : -1;
      return { tipo: 'EleccionMultiple', enunciado, opciones, respuestaCorrecta: opciones[idx] };
    }
    if (/FORMATO?\s*B\b/i.test(t)) {
      const enunciado = normalizarHueco(new RegExp(`\\)\\s*(.+?)\\s*${RE_CORRECT_WORD}:`, 'is').exec(t)?.[1]?.trim() ?? '');
      const respuestaCorrecta = new RegExp(`${RE_CORRECT_WORD}:\\s*([^\\s.][^.]*)`, 'i').exec(t)?.[1]?.trim() ?? '';
      return { tipo: 'RellenarHueco', enunciado, respuestaCorrecta };
    }
    return null;
  }).filter(Boolean);

  return { texto, preguntas };
}

// ── Construcción algorítmica (sin NotebookLM) de los 3 tipos que faltaban ──
// SopaLetras, MemoriaPareja y UnirColumnas se construyen 100% desde
// PALABRAS CLAVE, sin pedirle nada nuevo al chat — son puramente mecánicos
// y PROMPT-FICHAS.md ya avisaba de que la sopa de letras generada "a mano"
// por un LLM es propensa a error; un algoritmo la garantiza siempre correcta.

// Fisher-Yates — mismo algoritmo que usa el propio componente UnirColumnas.jsx
// de la app para barajar su columna derecha, reutilizado aquí.
function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizarSopa(s) {
  return quitarAcentos(s).toUpperCase().replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '');
}

function intentarColocar(grid, texto, horizontal) {
  const len = texto.length;
  if (horizontal) {
    const fila = Math.floor(Math.random() * 8);
    const colIni = Math.floor(Math.random() * (8 - len + 1));
    for (let i = 0; i < len; i++) {
      const actual = grid[fila][colIni + i];
      if (actual !== null && actual !== texto[i]) return false;
    }
    for (let i = 0; i < len; i++) grid[fila][colIni + i] = texto[i];
    return true;
  }
  const col = Math.floor(Math.random() * 8);
  const filaIni = Math.floor(Math.random() * (8 - len + 1));
  for (let i = 0; i < len; i++) {
    const actual = grid[filaIni + i][col];
    if (actual !== null && actual !== texto[i]) return false;
  }
  for (let i = 0; i < len; i++) grid[filaIni + i][col] = texto[i];
  return true;
}

// Autocomprobación (misma lógica que palabraEnGrid en validacion.js, duplicada
// aquí a propósito para no tocar ese fichero compartido sin confirmación) —
// fail-loud: si algo falla, se descarta la palabra en vez de arriesgarse a
// publicar una sopa de letras rota.
function palabraEnGridPropia(palabra, grid) {
  for (let r = 0; r < 8; r++) {
    const fila = grid[r].join('');
    if (fila.includes(palabra) || [...fila].reverse().join('').includes(palabra)) return true;
  }
  for (let c = 0; c < 8; c++) {
    let col = '';
    for (let r = 0; r < 8; r++) col += grid[r][c];
    if (col.includes(palabra) || [...col].reverse().join('').includes(palabra)) return true;
  }
  return false;
}

function construirSopaLetras(candidatos) {
  const vistas = new Set();
  const palabras = [];
  for (const c of candidatos) {
    const p = normalizarSopa(c);
    if (p.length >= 3 && p.length <= 8 && !vistas.has(p)) { palabras.push(p); vistas.add(p); }
    if (palabras.length === 6) break;
  }
  if (palabras.length < 4) return null; // no hay suficiente vocabulario corto en esta ficha

  const grid = Array.from({ length: 8 }, () => Array(8).fill(null));
  const colocadas = [];
  for (const palabra of palabras) {
    for (let intento = 0; intento < 40; intento++) {
      const texto = Math.random() < 0.5 ? [...palabra].reverse().join('') : palabra;
      if (intentarColocar(grid, texto, Math.random() < 0.5)) { colocadas.push(palabra); break; }
    }
  }
  if (colocadas.length < 4) return null;

  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (grid[r][c] === null) grid[r][c] = ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }

  // Fail-loud: si por lo que sea alguna palabra colocada no se detecta al
  // releer la cuadrícula, se descarta el ejercicio entero antes que publicar
  // una sopa de letras rota.
  if (!colocadas.every((p) => palabraEnGridPropia(p, grid))) return null;

  return { palabras: colocadas, cuadricula: grid };
}

// Acorta una definición larga para que quepa en una tarjeta de MemoriaPareja
// (grid 3x4, texto pequeño) sin dejarla ininteligible.
function acortar(texto, maxPalabras = 6) {
  const palabras = texto.replace(/\.$/, '').split(/\s+/);
  return palabras.length <= maxPalabras ? texto.replace(/\.$/, '') : palabras.slice(0, maxPalabras).join(' ') + '…';
}

function construirMemoriaPareja(candidatos) {
  const usados = new Set();
  const parejas = [];
  for (const { termino, definicion } of candidatos) {
    if (!definicion) continue;
    const b = acortar(definicion);
    if (usados.has(termino.toLowerCase()) || usados.has(b.toLowerCase())) continue;
    usados.add(termino.toLowerCase());
    usados.add(b.toLowerCase());
    parejas.push({ a: termino, b });
    if (parejas.length === 6) break;
  }
  return parejas.length === 6 ? parejas : null;
}

function construirUnirColumnas(candidatos) {
  const usados = new Set();
  const parejas = [];
  for (const { termino, definicion } of candidatos) {
    if (!definicion) continue;
    const izquierda = acortar(definicion, 10);
    if (usados.has(termino.toLowerCase()) || usados.has(izquierda.toLowerCase())) continue;
    usados.add(termino.toLowerCase());
    usados.add(izquierda.toLowerCase());
    parejas.push({ izquierda, derecha: termino });
    if (parejas.length === 4) break;
  }
  return parejas.length === 4 ? parejas : null;
}

// ── Construcción de ejercicios ───────────────────────────────────────────────

// Distractores numéricos deterministas: cercanos al resultado real, sin
// depender de que NotebookLM proponga opciones (no las pide el prompt).
function opcionesNumericas(resultado) {
  const r = Number(resultado);
  const candidatos = [r - 2, r - 1, r + 1, r + 2].filter((c) => c > 0 && c !== r);
  const distractores = [...new Set(candidatos)].slice(0, 2).map(String);
  // Barajado: CompletarSerie.jsx muestra "opciones" tal cual, sin mezclar —
  // sin esto, el resultado correcto queda siempre primero (mismo bug que
  // ArrastrarPalabras y ClasificarGrupos, encontrado en la misma auditoría).
  return barajar([String(r), ...distractores]);
}

// Estima el nivel de una pregunta de opción múltiple por una señal objetiva
// y medible (no por juicio del LLM sobre sí mismo, que la investigación
// muestra que es poco fiable): cuántos distractores comparten categoría
// temática con la respuesta correcta. Misma categoría = más confusable =
// más difícil de discriminar. Las categorías ya las genera NotebookLM en
// la sección CATEGORIAS — esta señal sale gratis, sin pedir nada nuevo.
function construirMapaCategorias(categorias) {
  const mapa = new Map();
  for (const cat of categorias) {
    for (const item of cat.items) mapa.set(item.toLowerCase(), cat.nombre);
  }
  return mapa;
}

function estimarNivelMCQ(respuestaCorrecta, opciones, categoriaDe) {
  const catCorrecta = categoriaDe.get(respuestaCorrecta.toLowerCase());
  const distractores = opciones.filter((o) => o.toLowerCase() !== respuestaCorrecta.toLowerCase());
  const catsDistractores = distractores.map((d) => categoriaDe.get(d.toLowerCase()));

  // Pregunta "contraejemplo" (cuál no pertenece): los 3 distractores
  // comparten UNA categoría DISTINTA a la de la respuesta correcta — hay que
  // entender el patrón del grupo para detectar cuál no encaja. Es al revés
  // de la señal de "confusables" de abajo (ahí comparten categoría CON la
  // respuesta correcta), así que necesita su propio caso: si no se detecta
  // aparte, una pregunta de contraejemplo sale marcada nivel 1 (fácil) por
  // error, justo la más difícil de las que pide el prompt.
  const catComun = catsDistractores[0];
  const esContraejemplo = catComun && catsDistractores.every((c) => c === catComun) && catComun !== catCorrecta;
  if (esContraejemplo) return 3;

  if (!catCorrecta) return 2; // sin categoría conocida: nivel medio por defecto
  const confusables = distractores.filter((d) => categoriaDe.get(d.toLowerCase()) === catCorrecta).length;
  if (confusables >= 2) return 3; // la mayoría de distractores son del mismo ámbito temático
  if (confusables === 1) return 2;
  return 1; // distractores claramente de otro ámbito — fácil de descartar
}

// Misma señal que estimarNivelMCQ (sin el caso contraejemplo, que no aplica
// a un banco de palabras) para ArrastrarPalabras — evita repetir el mismo
// error que con la longitud de frase: casi todas las frases pedidas al
// prompt son "autocontenidas" y por tanto largas, así que un umbral de
// palabras dejaba prácticamente todo en el mismo nivel de todos modos.
function estimarNivelBanco(correctos, distractores, categoriaDe) {
  const categoriasCorrectas = new Set(correctos.map((c) => categoriaDe.get(c.toLowerCase())).filter(Boolean));
  if (categoriasCorrectas.size === 0) return 1;
  const confusables = distractores.filter((d) => categoriasCorrectas.has(categoriaDe.get(d.toLowerCase()))).length;
  if (confusables >= 2) return 3;
  if (confusables === 1) return 2;
  return 1;
}

// Para problemas numéricos no hay "categoría" que comparar — la dificultad
// depende de la operación y la magnitud de los números, ambas medibles.
function estimarNivelProblema(operacion, resultado) {
  const r = Math.abs(Number(resultado));
  if (operacion === 'division' || r >= 100) return 3;
  if (operacion === 'multiplicacion' || r >= 20) return 2;
  return 1;
}

// Asignaturas en inglés (colegio bilingüe) — mismo criterio que ASIGNATURAS
// arriba. Los enunciados fijos de los ejercicios 100% algorítmicos (no vienen
// de NotebookLM, los pone el script) tienen que ir en el idioma de la ficha:
// si no, una ficha de Ciencias/Sociales/Inglés en inglés acaba mostrando una
// instrucción en español (o al revés) — bug real, encontrado en una ficha
// real de Lengua con "Read and answer:" en vez de "Lee y responde:".
const SUBJECTS_INGLES = new Set(['ciencias', 'social', 'ingles']);
const textoIdioma = (subject, es, en) => (SUBJECTS_INGLES.has(subject) ? en : es);

function construirEjercicios(fichaId, subject, datos) {
  const { frases, categorias, comprension, mcq, problemas, series } = datos;
  const ejercicios = [];
  const avisosFormas = [];
  let n = 1;
  const nextId = () => `${fichaId}-ex-${String(n++).padStart(3, '0')}`;
  const categoriaDe = construirMapaCategorias(categorias);
  // Aplica el refuerzo visual de figuras geométricas a las opciones de un
  // EleccionMultiple, y registra un aviso si la cobertura fue solo parcial
  // (posible figura del temario que aún no está en SVG_FORMAS).
  const conFormas = (opciones, ref) => {
    const { opciones: conSvg, avisoParcial } = anadirSvgFormas(opciones);
    if (avisoParcial) avisosFormas.push(`${ref}: algunas opciones son figuras geométricas conocidas y otras no — revisa si falta añadir alguna a SVG_FORMAS en el script.`);
    return conSvg;
  };

  // ProblemaVisual numérico — solo Matemáticas. Sin "visual" (opcional en el
  // schema): son problemas de aplicación de fórmula, no de contar emojis.
  (problemas ?? []).forEach((p) => {
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'ProblemaVisual', nivel: estimarNivelProblema(p.operacion, p.resultado), tiempoEstimado: 45,
      enunciado: p.enunciado,
      respuestaCorrecta: p.resultado,
      esNumerico: true,
    });
  });

  // CompletarSerie — el prompt solo pide serie + hueco + respuesta; las
  // opciones (obligatorias en el schema) las genera el script.
  (series ?? []).forEach((s) => {
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'CompletarSerie', nivel: 2, tiempoEstimado: 35,
      enunciado: 'Completa la serie:',
      serie: s.serie,
      opciones: opcionesNumericas(s.respuesta),
      respuestaCorrecta: s.respuesta,
    });
  });

  // EleccionMultiple desde las preguntas de opción múltiple
  mcq.forEach((q) => {
    if (!q.respuestaCorrecta || q.opciones.length < 2) return;
    const id = nextId();
    ejercicios.push({
      id, fichaId, subject, tipo: 'EleccionMultiple', nivel: estimarNivelMCQ(q.respuestaCorrecta, q.opciones, categoriaDe), tiempoEstimado: 30,
      enunciado: q.enunciado,
      opciones: conFormas(q.opciones.map((texto) => ({ texto, emoji: '' })), id),
      respuestaCorrecta: q.respuestaCorrecta,
    });
  });

  // ArrastrarPalabras con las 2 primeras frases
  if (frases.length >= 2) {
    const [f0, f1] = frases;
    const usados = new Set([f0.termino.toLowerCase(), f1.termino.toLowerCase()]);
    const distractores = datos.palabrasClave
      .map((p) => p.termino)
      .filter((t) => !usados.has(t.toLowerCase()))
      .slice(0, 3); // antes 2 — banco de 4 se quedaba corto para 2 huecos (pedido real)
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'ArrastrarPalabras', nivel: estimarNivelBanco([f0.termino, f1.termino], distractores, categoriaDe), tiempoEstimado: 60,
      fraseConHuecos: `${f0.conHueco} ${f1.conHueco}`,
      // Barajado: ArrastrarPalabras.jsx muestra el banco tal cual, sin
      // mezclarlo — si la correcta va siempre primera (como al construir el
      // array), el niño aprende a arrastrar "la primera palabra" sin leer.
      banco: barajar([f0.termino, f1.termino, ...distractores]),
      respuestasCorrectas: [f0.termino, f1.termino],
    });
  }

  // OrdenarFrase con la 3ª frase
  if (frases.length >= 3) {
    const frase = frases[2].completa.replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
    const palabras = frase.split(/\s+/);
    const desordenadas = [...palabras].sort(() => Math.random() - 0.5);
    const nivel = palabras.length >= 7 ? 3 : 2;
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'OrdenarFrase', nivel, tiempoEstimado: 60,
      enunciado: textoIdioma(subject, 'Ordena las palabras:', 'Put the words in order:'),
      palabrasDesordenadas: desordenadas,
      fraseCorrecta: frase,
    });
  }

  // El resto de frases: ArrastrarPalabras de 1 hueco, en vez de RellenarHueco
  // (escritura libre). Investigado: para 3º-4º de Primaria, reconocer la
  // palabra correcta entre unas pocas opciones es el andamiaje estándar en
  // apps de aprendizaje infantil — pedir que la recuerde y la escriba de
  // memoria, sin ayuda, es el nivel de un lector ya avanzado, no esta edad.
  //
  // Tope de 4 (no todas las frases sobrantes): con 8 frases típicas, "todas
  // menos las 3 primeras" son 5 ejercicios del MISMO tipo y del MISMO nivel
  // — encontrado con datos reales: dominaban la ficha (6 de 17) y, como el
  // selector de la app coge el 100% del nivel actual del niño, dominaban
  // también casi cualquier sesión real. Las frases que se quedan fuera del
  // tope siguen presentes en la ficha (contenido/ejemplos), solo no se
  // convierten en un ejercicio de arrastrar aparte.
  for (const f of frases.slice(3, 7)) {
    const usado = new Set([f.termino.toLowerCase()]);
    const distractores = datos.palabrasClave
      .map((p) => p.termino)
      .filter((t) => !usado.has(t.toLowerCase()))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3); // antes 2 — banco de 3 opciones se quedaba corto (pedido real)
    const nivel = estimarNivelBanco([f.termino], distractores, categoriaDe);
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'ArrastrarPalabras', nivel, tiempoEstimado: 45,
      fraseConHuecos: f.conHueco,
      banco: barajar([f.termino, ...distractores]),
      respuestasCorrectas: [f.termino],
    });
  }

  // ClasificarGrupos con las 2 primeras categorías, máx 3 items cada una (regla: 4-6 items totales)
  if (categorias.length >= 2) {
    const grupos = categorias.slice(0, 2).map((c, i) => ({ id: `g${i + 1}`, nombre: c.nombre }));
    const items = [];
    let itemId = 1;
    categorias.slice(0, 2).forEach((c, i) => {
      c.items.slice(0, 3).forEach((texto) => {
        items.push({ id: String(itemId++), texto, grupoId: `g${i + 1}` });
      });
    });
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'ClasificarGrupos', nivel: 2, tiempoEstimado: 60,
      enunciado: textoIdioma(subject, 'Clasifica cada palabra en su categoría:', 'Sort each word into its category:'),
      grupos,
      // Barajado: el componente ClasificarGrupos.jsx de la app muestra el
      // banco en el mismo orden que trae "items" sin barajarlo — si se
      // construye agrupado (todos los del grupo 1 seguidos, luego el grupo
      // 2), el niño resuelve el ejercicio solo por posición en el banco,
      // sin leer nada. Encontrado con un caso real ("ejercicio muy fácil").
      items: barajar(items),
    });
  }

  // ComprensionLectora
  if (comprension.texto && comprension.preguntas.length) {
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'ComprensionLectora', nivel: 2, tiempoEstimado: 240,
      enunciado: textoIdioma(subject, 'Lee y responde:', 'Read and answer:'),
      texto: comprension.texto,
      preguntas: comprension.preguntas,
    });
  }

  // SopaLetras, MemoriaPareja, UnirColumnas — construidos por código desde
  // palabrasClave, priorizando términos que ningún otro ejercicio haya usado
  // todavía como respuesta (mejor cobertura de la ficha en conjunto).
  const usadosEnFrases = new Set(frases.map((f) => f.termino.toLowerCase()));
  const sinUsar = datos.palabrasClave.filter((p) => !usadosEnFrases.has(p.termino.toLowerCase()));
  const candidatos = [...sinUsar, ...datos.palabrasClave.filter((p) => usadosEnFrases.has(p.termino.toLowerCase()))];

  const sopa = construirSopaLetras(candidatos.map((p) => p.termino));
  if (sopa) {
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'SopaLetras', nivel: 3, tiempoEstimado: 180,
      enunciado: textoIdioma(subject, 'Encuentra las palabras:', 'Find the words:'),
      palabras: sopa.palabras,
      cuadricula: sopa.cuadricula,
    });
  }

  const parejas = construirMemoriaPareja(candidatos);
  if (parejas) {
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'MemoriaPareja', nivel: 3, tiempoEstimado: 180,
      enunciado: textoIdioma(subject, 'Empareja cada término con su definición:', 'Match each term with its definition:'),
      parejas,
    });
  }

  // UnirColumnas evita los términos que ya cogió MemoriaPareja (si quedan
  // suficientes) — sin esto, ambos parten de la misma lista en el mismo
  // orden y suelen coincidir en los mismos 4-6 términos, dejando el resto de
  // palabrasClave sin cubrir en ningún ejercicio de este grupo.
  const usadosMemoria = new Set((parejas ?? []).map((p) => p.a.toLowerCase()));
  const candidatosSinMemoria = candidatos.filter((p) => !usadosMemoria.has(p.termino.toLowerCase()));
  const columnas = construirUnirColumnas(candidatosSinMemoria.length >= 4 ? candidatosSinMemoria : candidatos);
  if (columnas) {
    ejercicios.push({
      id: nextId(), fichaId, subject, tipo: 'UnirColumnas', nivel: 2, tiempoEstimado: 90,
      enunciado: textoIdioma(subject, 'Une cada definición con su término:', 'Match each definition to its term:'),
      parejas: columnas,
    });
  }

  return { ejercicios, avisosFormas };
}

// ── Avisos de calidad (heurísticos, no bloqueantes) ─────────────────────────
// Lo que validacion.js no puede pillar porque es sobre forma, no sobre origen
// del contenido: aquí comprobamos contra el material crudo que escribió
// NotebookLM, no contra el schema.

function contarOcurrencias(corpus, termino) {
  const t = String(termino ?? '').toLowerCase().trim();
  if (!t) return 0;
  return corpus.split(t).length - 1;
}

// Si una opción de EleccionMultiple no aparece en NINGÚN otro sitio del
// material (fuera de la propia línea de la pregunta), es sospechosa de ser
// un término que NotebookLM metió de su conocimiento general y no del
// material subido — exactamente lo que pasó con "Pistil" y "Chlorophyll".
function avisosGrounding(textoOriginal, ejercicios) {
  const corpus = textoOriginal.toLowerCase();
  const avisos = [];
  const revisar = (opciones, ref) => {
    for (const raw of opciones ?? []) {
      const texto = typeof raw === 'string' ? raw : raw?.texto;
      if (!texto) continue;
      // Opciones "combina dos conceptos" (pedidas en el prompt) son frases
      // nuevas tipo "comunicación no verbal y señal visual" — nunca van a
      // aparecer literalmente aunque sus dos mitades sí. Comprobar cada
      // mitad por separado en vez de la frase entera, para no avisar en
      // falso de algo que el propio prompt pide generar.
      const partes = / y | and /i.test(texto) ? texto.split(/ y | and /i) : [texto];
      const sinFundamento = partes.filter((p) => contarOcurrencias(corpus, p.trim()) <= 1);
      if (sinFundamento.length) {
        avisos.push(`${ref}: la opción "${texto}" no aparece en ningún otro sitio del material — puede ser un término que NotebookLM inventó de su conocimiento general. Revísalo antes de publicar.`);
      }
    }
  };
  for (const ej of ejercicios) {
    if (ej.tipo === 'EleccionMultiple') revisar(ej.opciones, ej.id);
    if (ej.tipo === 'ComprensionLectora') {
      (ej.preguntas ?? []).forEach((p, i) => {
        if (p.tipo === 'EleccionMultiple') revisar(p.opciones, `${ej.id} (pregunta ${i + 1})`);
      });
    }
  }
  return avisos;
}

// Si dos ejercicios distintos tienen la misma respuestaCorrecta, muy
// probablemente están evaluando el mismo concepto con el mismo ángulo —
// solo cambia el formato del ejercicio, no lo que se pregunta de verdad.
function avisosDuplicados(ejercicios) {
  const vistos = new Map();
  const anotar = (respuestaCorrecta, ref) => {
    const original = String(respuestaCorrecta ?? '').toLowerCase().trim();
    if (!original) return;
    // Normaliza plural simple ("spores" → "spore") para no dejar pasar el
    // mismo concepto en singular en un sitio y en plural en otro.
    const clave = original.replace(/s$/, '');
    if (!vistos.has(clave)) vistos.set(clave, []);
    vistos.get(clave).push(ref);
  };
  for (const ej of ejercicios) {
    if (ej.tipo === 'EleccionMultiple' || ej.tipo === 'RellenarHueco') anotar(ej.respuestaCorrecta, ej.id);
    // ArrastrarPalabras puede tener 1 o 2 respuestas — desde que las frases
    // sueltas pasaron de RellenarHueco a ArrastrarPalabras (banco de
    // palabras), este tipo concentra la mayoría de las frases de la ficha;
    // sin este caso, el detector de duplicados dejaba de vigilarlas del todo.
    if (ej.tipo === 'ArrastrarPalabras') (ej.respuestasCorrectas ?? []).forEach((r) => anotar(r, ej.id));
    // ComprensionLectora anida sus propias subpreguntas — hay que mirar dentro,
    // igual que tuvo que arreglarse en rebalanceo.js para el sesgo de posición.
    if (ej.tipo === 'ComprensionLectora') {
      (ej.preguntas ?? []).forEach((p, i) => {
        if (p.tipo === 'EleccionMultiple' || p.tipo === 'RellenarHueco') {
          anotar(p.respuestaCorrecta, `${ej.id} (pregunta ${i + 1})`);
        }
      });
    }
  }
  return [...vistos.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([concepto, ids]) => `Posible duplicado: "${concepto}" se evalúa en ${ids.join(' y ')} — revisa si el ángulo es realmente distinto o sobra uno.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function fallarSi(cond, mensaje) {
  if (cond) {
    logError(`✗ ${mensaje}`);
    volcarLog('FALLO');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  // 0 argumentos (modo normal): elige asignatura de una lista, fichaId calculado solo.
  // 2 argumentos: <fichaId> <subject>, texto pegado en terminal.
  // 3 argumentos: <material.txt> <fichaId> <subject>, texto desde fichero.
  let rutaEntrada = null, fichaId, subject;

  if (args.length >= 3) {
    [rutaEntrada, fichaId, subject] = args;
  } else if (args.length !== 0 && args.length !== 2) {
    console.error('Uso:');
    console.error('  node scripts/notebooklm-a-json.js                                       (modo guiado: elige asignatura, pega el texto)');
    console.error('  node scripts/notebooklm-a-json.js <fichaId> <subject>                    (pega el texto en la terminal)');
    console.error('  node scripts/notebooklm-a-json.js <material.txt> <fichaId> <subject>     (lee de un fichero)');
    process.exit(1);
  }

  // Un único readline y una única cola de líneas para toda la sesión
  // interactiva (elegir asignatura + pegar el texto) — ver crearColaLineas.
  const rl = rutaEntrada ? null : createInterface({ input: process.stdin, output: process.stdout });
  const siguienteLinea = rl ? crearColaLineas(rl) : null;

  if (args.length === 2) {
    [fichaId, subject] = args;
  } else if (args.length === 0) {
    const asignatura = await elegirAsignatura(siguienteLinea);
    subject = asignatura.id;
    fichaId = siguienteFichaId(__dirname, asignatura);
    console.log(`→ ${asignatura.nombre} — nueva ficha: ${fichaId}\n`);

    // Paso 1: el prompt completo, ya resuelto para esta asignatura (idioma +
    // curso/edad + módulo numérico solo si es Matemáticas), copiado al portapapeles.
    const prompt = construirPrompt(asignatura, CURSO_ACTUAL);
    const copiado1 = copiarPortapapeles(prompt);
    console.log('═'.repeat(70));
    console.log('PASO 1 — Pégalo como FUENTE en tu notebook de NotebookLM:');
    console.log('  + Añadir fuentes → Texto copiado → pega → Insertar');
    console.log(copiado1 ? '  (ya está en tu portapapeles, Ctrl+V directamente)' : '  (cópialo tú, no se pudo copiar solo):');
    if (!copiado1) console.log('\n' + prompt + '\n');
    console.log('═'.repeat(70));
    await esperarEnter(siguienteLinea, 'Pulsa ENTER cuando lo hayas insertado como fuente: ');

    // Paso 2: el mensaje corto que hay que pegar en el chat.
    const copiado2 = copiarPortapapeles(MENSAJE_CHAT);
    console.log('\n' + '═'.repeat(70));
    console.log('PASO 2 — Pégalo en el CHAT de NotebookLM y espera la respuesta:');
    console.log(copiado2 ? `  (ya está en tu portapapeles)\n  "${MENSAJE_CHAT}"` : `  "${MENSAJE_CHAT}"`);
    console.log('═'.repeat(70));
    await esperarEnter(siguienteLinea, 'Pulsa ENTER cuando tengas la respuesta lista para pegar: ');
    console.log();
  }

  let texto;
  try {
    texto = await leerTexto(siguienteLinea, rutaEntrada);
  } catch (e) {
    logError(`✗ ${e.message}`);
    process.exit(1);
  } finally {
    if (rl) rl.close();
  }

  log(`fichaId: ${fichaId}  |  subject: ${subject}${rutaEntrada ? `  |  fichero: ${rutaEntrada}` : '  |  texto pegado en terminal'}`);

  // Guarda siempre el texto tal cual se pegó, ANTES de parsear — si algo
  // falla luego, se puede diagnosticar sin tener que pedir que se pegue otra vez.
  const RAW_PATH = join(__dirname, '..', 'material-temp', `${fichaId}-crudo.txt`);
  writeFileSync(RAW_PATH, texto, 'utf8');

  // Orden importa: primero normaliza los huecos, LUEGO quita la negrita.
  // Al revés, "[***]" (3 asteriscos) pierde los 2 primeros al quitar "**" y
  // queda "[*]", que ya no coincide con ningún patrón de hueco — bug real,
  // encontrado regenerando una ficha de Matemáticas de prueba tras añadir
  // ambos arreglos por separado (cada uno funcionaba solo, chocaban juntos).
  texto = normalizarHueco(texto);
  // Quita negrita markdown ("**TITULO:**" → "TITULO:") ANTES del resto del
  // parseo — NotebookLM envuelve etiquetas y términos en "**" con frecuencia
  // (visto con datos reales), y si no se quita aquí se cuela en el título,
  // en las palabras clave, en todo lo que capturan los parsers de abajo.
  texto = texto.replace(/\*\*/g, '');

  const bloques = partirSecciones(texto);

  fallarSi(!bloques.palabrasClave, 'No se encontró la sección PALABRAS CLAVE / KEYWORDS. Revisa el formato del material — este script solo entiende el formato del prompt de PROMPT-FICHAS.md (## FICHA, ## PALABRAS CLAVE...), no el Cuestionario/Tarjetas didácticas/Infografía nativos de NotebookLM.');
  fallarSi(!bloques.frases, 'No se encontró la sección FRASES CON TERMINO CLAVE / SENTENCES WITH KEYWORDS.');

  const ficha = bloques.ficha ? parsearFicha(bloques.ficha) : { titulo: '', contenido: '', ejemplos: [] };
  const palabrasClave = parsearPalabrasClave(bloques.palabrasClave);
  const categorias = bloques.categorias ? parsearCategorias(bloques.categorias) : [];
  const frases = parsearFrases(bloques.frases);
  const mcq = bloques.mcq ? parsearMCQ(bloques.mcq) : [];
  const problemas = bloques.problemas ? parsearProblemas(bloques.problemas) : [];
  const series = bloques.series ? parsearSeries(bloques.series) : [];
  const comprension = bloques.comprension ? parsearComprension(bloques.comprension) : { texto: '', preguntas: [] };

  fallarSi(palabrasClave.length === 0, 'PALABRAS CLAVE encontrada pero vacía tras parsear — revisa el formato de viñetas.');
  fallarSi(frases.length === 0, 'FRASES CON TERMINO CLAVE encontrada pero no se extrajo ninguna frase con [término] — revisa el formato.');
  if (bloques.mcq && mcq.length === 0) log('⚠ Sección de preguntas de opción múltiple encontrada pero no se extrajo ninguna — revisa el formato.');
  if (bloques.comprension && comprension.preguntas.length === 0) log('⚠ Sección de comprensión lectora encontrada pero no se extrajo ninguna pregunta — revisa el formato.');

  const { ejercicios, avisosFormas } = construirEjercicios(fichaId, subject, { palabrasClave, categorias, frases, comprension, mcq, problemas, series });

  let resultado = {
    id: fichaId,
    subject,
    titulo: ficha.titulo,
    nivel: 1,
    curso: CURSO_ACTUAL,
    contenido: ficha.contenido,
    ejemplos: ficha.ejemplos,
    palabrasClave: palabrasClave.map((p) => p.termino),
    tiposEjercicio: [...new Set(ejercicios.map((e) => e.tipo))],
    ejerciciosDerivar: ejercicios.length,
    ejercicios,
  };

  log(`✓ Ficha "${ficha.titulo}" — ${ejercicios.length} ejercicios generados`);
  log(`  Tipos: ${resultado.tiposEjercicio.join(', ')}`);
  log(`  palabrasClave: ${palabrasClave.length}  ·  MCQ: ${mcq.length}  ·  problemas: ${problemas.length}  ·  series: ${series.length}  ·  preguntas comprensión: ${comprension.preguntas.length}`);

  const avisos = [...avisosGrounding(texto, ejercicios), ...avisosDuplicados(ejercicios), ...avisosFormas];
  if (avisos.length) {
    log(`\n⚠ ${avisos.length} aviso(s) de calidad (no bloquean, pero revísalos antes de publicar):`);
    avisos.forEach((a) => log(`  - ${a}`));
  } else {
    log('✓ Sin avisos de calidad (grounding/duplicados).');
  }

  // Antes esto lo ejecutaba yo a mano con un comando aparte cada ronda — ahora
  // el propio script se encarga: reequilibra posiciones y valida contra las
  // reglas reales de la app, igual que hace npm run publicar.
  const { rebalancearPosicionesEM } = await import('../src/datos/rebalanceo.js');
  const { validarImportacion } = await import('../src/datos/validacion.js');
  [resultado] = rebalancearPosicionesEM([resultado]);
  const validacion = validarImportacion([resultado], undefined);

  log(`\n${validacion.valida ? '✓' : '✗'} validacion.js: ${validacion.valida ? 'VÁLIDA' : 'NO VÁLIDA'} — ${validacion.errores.length} error(es), ${validacion.warnings.length} warning(s)`);
  validacion.errores.forEach((e) => log(`  ERROR: ${e}`));
  validacion.warnings.forEach((w) => log(`  WARNING: ${w}`));

  const salida = rutaEntrada
    ? rutaEntrada.replace(/\.txt$/, '.json')
    : join(__dirname, '..', 'material-temp', `${fichaId}.json`);
  writeFileSync(salida, JSON.stringify(resultado, null, 2), 'utf8');
  log(`\n→ JSON escrito en ${salida}`);
  log(`  Nivel de la ficha puesto a 1 por defecto — ajústalo tú según la progresión real del tema.`);

  // Coloca el JSON directo en public/content/{subject}/ (mismo sitio que lee
  // el editor y la app) para que se pueda previsualizar sin ningún paso
  // manual. NO toca git — eso sigue siendo `npm run publicar`, aparte y
  // deliberado, nunca automático.
  const CONTENT_DIR = join(__dirname, '..', 'public', 'content', subject);
  if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true });
  writeFileSync(join(CONTENT_DIR, `${fichaId}.json`), JSON.stringify(resultado, null, 2), 'utf8');

  const indicePath = join(CONTENT_DIR, 'index.json');
  const indiceActual = existsSync(indicePath) ? JSON.parse(readFileSync(indicePath, 'utf8')) : { version: '0', subject, fichas: [] };
  const fichasIndice = (indiceActual.fichas ?? []).filter((f) => f.id !== fichaId);
  fichasIndice.push({ id: fichaId, titulo: resultado.titulo, nivel: resultado.nivel, curso: resultado.curso, numEjercicios: resultado.ejercicios.length });
  writeFileSync(indicePath, JSON.stringify({ ...indiceActual, subject, fichas: fichasIndice }, null, 2), 'utf8');

  log(`→ Copiado a ${join(CONTENT_DIR, `${fichaId}.json`)} (visible ya en el editor: npm run dev → /editor.html)`);
  log(`  Esto NO toca git. Para publicar de verdad: npm run publicar -- ${salida}`);

  volcarLog(validacion.valida ? 'OK' : 'CON ERRORES DE VALIDACIÓN');
  console.log(`\n(log completo en ${LOG_PATH})`);
}

main();
