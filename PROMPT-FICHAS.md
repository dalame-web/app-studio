# Generador de fichas — Guía de uso

---

## 🔄 DOS FORMAS DE GENERAR CONTENIDO

**A) NotebookLM + script (método actual, recomendado)** — genera todo el material en el chat gratuito de NotebookLM (grounded en la fuente subida) y lo convierte a JSON con un script propio, sin usar ningún LLM de pago en la conversión. Ver sección siguiente.

**B) Claude Project directo (método anterior, sigue funcionando)** — pegar el PROMPT en un chat de Claude Project junto al material. Ver "MÉTODO B" más abajo. Útil si no tienes NotebookLM a mano o prefieres ese flujo.

Ambos métodos producen el mismo JSON final (mismo schema, mismas reglas), así que todo lo de "SCHEMAS COMPLETOS POR TIPO" en adelante vale para los dos.

---

## MÉTODO A — NotebookLM + script (FLUJO COMPLETO, 4 pasos)

### PASO 1 — Sube el material a un notebook de NotebookLM

Crea un notebook nuevo (o reutiliza uno) y sube el PDF/material del tema. Espera a que la fuente termine de procesarse.

### PASO 2 — Pega el prompt como FUENTE, no como mensaje de chat

⚠️ **Descubierto por las malas:** el chat de NotebookLM tiene un límite de longitud de mensaje bastante bajo — el prompt completo (~2500 caracteres) deja el botón de enviar permanentemente desactivado, sin ningún aviso de error visible.

**Solución:** `+ Añadir fuentes → Texto copiado → pega el prompt completo → Insertar`. Esa caja no tiene el mismo límite. Después, en el chat, un mensaje corto:

```
Genera el material de la ficha siguiendo las instrucciones de la fuente "INSTRUCCIONES PARA GENERAR MATERIAL DE LA FICHA".
```

Tarda entre 40 y 60 segundos en responder con las 6-8 secciones completas.

### PASO 3 — Copia la respuesta completa y conviértela a JSON

Copia toda la respuesta del chat (tal cual, sin preocuparte del formato exacto — el script es tolerante) y guárdala en un `.txt` dentro de `material-temp/`. Luego:

```bash
node scripts/notebooklm-a-json.js material-temp/mi-ficha.txt <fichaId> <subject>
# ej: node scripts/notebooklm-a-json.js material-temp/cie-002.txt cie-002 ciencias
```

El script:
- Convierte el texto a la ficha JSON completa (metadata + ejercicios)
- Construye por código, sin pedírselo a NotebookLM, los ejercicios `SopaLetras`, `MemoriaPareja` y `UnirColumnas` a partir de `PALABRAS CLAVE`
- Añade SVG automáticamente a las opciones de EleccionMultiple cuando son nombres de figuras geométricas conocidas
- Calcula el nivel de cada EleccionMultiple por una señal objetiva (ver "NIVELES", más abajo), no por posición ni por autoevaluación del LLM
- Avisa (sin bloquear) de posibles términos inventados o ejercicios duplicados

Revisa los avisos en consola. Si hay alguno de "término inventado" o "posible duplicado", ábrelo en el editor (`npm run dev` → `/editor.html`) y corrígelo a mano, o vuelve a generar esa sección con un ajuste al prompt.

### PASO 4 — Validar, revisar y publicar

```bash
npm run publicar -- material-temp/mi-ficha.json
```

Valida con `validacion.js`, reequilibra posiciones con `rebalanceo.js`, escribe `public/content/{asignatura}/{fichaId}.json` + `index.json`, y hace commit + push. Antes de este paso, revisa la ficha con `/grill-me` (cobertura de palabrasClave, plausibilidad de distractores, respuesta deducible del contenido) — la validación estructural no detecta problemas de calidad pedagógica.

---

## 📋 EL PROMPT DE NOTEBOOKLM (copia desde aquí 👇)

Pégalo completo como **fuente** (no como mensaje de chat, ver PASO 2). Para Matemáticas, incluye las dos secciones marcadas "(solo Matemáticas)"; para el resto de asignaturas, omítelas.

```
Basándote ÚNICAMENTE en las fuentes de este cuaderno, sin añadir información
que no esté en ellas, genera el siguiente material EN [INGLÉS/ESPAÑOL — ver
tabla de idiomas por asignatura más abajo].

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
entienda sola, sin depender de frases anteriores — no empieces con "it/eso",
"this/esto", "they/ellos" si no queda claro a qué se refieren). Cada frase
debe contener una palabra clave marcada así: [palabra]. Usa EXACTAMENTE la
misma forma de la palabra que en PALABRAS CLAVE (no cambies el tiempo verbal
ni el número). Una frase por línea.

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

REGLA CRÍTICA PARA LAS 3 OPCIONES INCORRECTAS: deben ser términos o
conceptos que TÚ MISMO hayas definido o mencionado en alguna otra sección de
esta misma respuesta (PALABRAS CLAVE, CONTENIDO, CATEGORIAS...). Nunca
introduzcas un término nuevo que no hayas explicado en ningún otro sitio de
tu propia respuesta, aunque sea real y correcto dentro del tema.
MAL: pregunta sobre "stamen" con la opción "pistil" si "pistil" no aparece
en PALABRAS CLAVE ni en ningún otro sitio de tu respuesta.

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
S1: 5, 10, HUECO, 20, 25 | Respuesta: 15

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
P1: (FORMAT A - Multiple choice) pregunta Options: A) ... B) ... C) ... D) ... Correct answer: X) ...
P2: (FORMAT B - Fill-in-the-blank) frase con [___] Correct word: palabra

ANTES DE ESCRIBIR "PREGUNTAS OPCION MULTIPLE" Y "TEXTO CORTO PARA
COMPRENSION LECTORA": revisa qué términos vas a usar como respuesta
correcta en FRASES CON TERMINO CLAVE, en PREGUNTAS OPCION MULTIPLE y en las
preguntas de TEXTO CORTO PARA COMPRENSION LECTORA. Cada término solo debe
ser la respuesta correcta en UNA de estas tres secciones, nunca en dos o
las tres a la vez.

No inventes nada que no esté en las fuentes. Si no hay material suficiente
para alguna sección, indícalo y omite esa sección.
```

(👆 fin del prompt de NotebookLM)

### Tabla de idiomas (rellena el `[INGLÉS/ESPAÑOL]` del prompt)

| Asignatura          | Idioma de los ejercicios |
|---------------------|--------------------------|
| Matemáticas         | Español                  |
| Lengua              | Español                  |
| Ciencias Naturales  | Inglés (Science)         |
| Ciencias Sociales   | Inglés (Social Science)  |
| Inglés              | Inglés                   |
| Valores Cívicos     | Español                  |

---

## 🧩 QUIÉN GENERA QUÉ

Todo el contenido pedagógico lo escribe NotebookLM en el chat (texto). El script (`scripts/notebooklm-a-json.js`) **no inventa nada** — reestructura ese texto a JSON y añade lo puramente mecánico que NotebookLM no puede hacer:

| Ejercicio | Origen |
|---|---|
| EleccionMultiple | Chat (sección PREGUNTAS OPCION MULTIPLE) |
| RellenarHueco, ArrastrarPalabras, OrdenarFrase | Chat (sección FRASES CON TERMINO CLAVE) |
| ClasificarGrupos | Chat (sección CATEGORIAS) |
| ComprensionLectora | Chat (sección TEXTO CORTO) |
| ProblemaVisual, CompletarSerie (solo Matemáticas) | Chat (PROBLEMAS/SERIES NUMERICAS) + distractores generados por el script |
| **SopaLetras, MemoriaPareja, UnirColumnas** | **100% construidos por el script**, desde PALABRAS CLAVE, sin pedir nada nuevo al chat |
| SVG de figuras geométricas en opciones | Añadido por el script (librería de formas conocidas, ver más abajo) |
| Nivel de dificultad (EleccionMultiple) | Calculado por el script (ver "NIVELES") |
| Posición de la respuesta correcta | Corregida por el script (`rebalanceo.js`) |

## 🎚️ NIVELES — por qué no se le pide al LLM que se autoevalúe

Investigado explícitamente (papers 2026 sobre estimación de dificultad de preguntas): **los LLM son malos jueces de la dificultad de sus propias preguntas**, incluso pregunta a pregunta. Lo que sí es fiable son señales objetivas y medibles: sobre todo, la similitud/confusión entre la respuesta correcta y los distractores.

El script usa esa señal, gratis, con datos que ya genera el prompt: si los distractores de un EleccionMultiple comparten categoría temática (sección CATEGORIAS) con la respuesta correcta, es más difícil de discriminar → nivel más alto. No se fuerza la distribución agregada 5-7-5 falseando etiquetas — si sale descompensada, es una señal para añadir un ejercicio más en el editor, no para mentir sobre la dificultad real de uno ya generado.

Para `RellenarHueco`/`ArrastrarPalabras`/`OrdenarFrase`/`ClasificarGrupos`/`ComprensionLectora`, el nivel usa los "tipos naturales por nivel" de la tabla de CRITERIOS DE NIVEL más abajo — sigue siendo válida para ambos métodos.

## ⚠️ FALLOS REALES ENCONTRADOS Y CÓMO SE CORRIGEN (lecciones de varias rondas de prueba)

| Fallo | Causa | Corrección |
|---|---|---|
| Botón de enviar del chat desactivado sin aviso | Mensaje > ~2500 caracteres | Prompt como fuente, no como mensaje (PASO 2) |
| Cabeceras de sección traducidas al inglés | Pediste "todo en inglés" y NotebookLM tradujo también los títulos | El script acepta alias ES/EN por sección |
| Frases/preguntas pegadas en un párrafo sin saltos de línea | Variación natural del chat | El script corta por patrón de texto, no por línea |
| `[***]` en vez de `[___]` como marcador de hueco | Variación del chat, rompe el motor de ejercicios si no se corrige | `normalizarHueco()` en el script |
| Distractores inventados fuera del material (ej. "Pistil", "Chlorophyll") | El LLM tira de conocimiento general, no solo de la fuente | Regla explícita en el prompt (arriba) + aviso automático del script si una opción no aparece en ningún otro sitio del material |
| Ejercicios casi duplicados entre secciones | MCQ y FRASES/COMPRENSION se generaban sin comprobar solapamiento | Regla de comprobación cruzada en el prompt + aviso automático del script |
| Coma pegada a una palabra en OrdenarFrase | Puntuación no limpiada al trocear la frase | Limpieza de puntuación en el script |
| Acentos corruptos en el prompt copiado ("Bas├índote") | `clip` de Windows usa la code page del terminal, no UTF-8 | `copiarPortapapeles()` usa `Set-Clipboard` de PowerShell con `-Encoding UTF8` |
| Cabeceras "#### FICHA" (4 almohadillas) no detectadas | El chat no siempre respeta "##" exacto pese a pedirlo | Regex tolerante a `#{0,6}` + regla explícita "DOS almohadillas y nada más" en el prompt |
| Etiquetas y términos en negrita ("**TITULO:**", "**término:**") colándose en el contenido | Markdown de énfasis del chat | Se quita todo "**" del texto entero antes de parsear, nada más leerlo |
| `[ \*\*\*]` (con espacio y barras invertidas) no reconocido como hueco | Variación de escape markdown de `[***]` | `normalizarHueco()` generalizado a cualquier combinación de `*`/`_`/espacios/barras invertidas dentro de los corchetes |

---

# REFERENCIA DE SCHEMA (vale para los dos métodos)

## TIPOS DE EJERCICIO — QUÉ SON Y CÓMO FUNCIONAN

La app tiene exactamente 11 tipos. No se pueden inventar otros.

**EleccionMultiple** — El niño ve SIEMPRE 4 tarjetas con texto (y opcionalmente imagen o SVG). Toca una. La app compara con `respuestaCorrecta`.
**RellenarHueco** — El niño escribe en UN único campo donde está `[___]`. La app compara ignorando mayúsculas y acentos. Una sola respuesta correcta posible.
**ArrastrarPalabras** — El niño arrastra tarjetas del banco a huecos `[___]` de una frase. Cada palabra va a UN solo hueco.
**OrdenarFrase** — El niño toca palabras una a una para ordenarlas. La app compara con `fraseCorrecta`.
**UnirColumnas** — El niño toca un elemento izquierdo y luego uno derecho para trazar una línea. Exactamente 4 parejas.
**ClasificarGrupos** — El niño arrastra tarjetas a 2-3 contenedores con categorías. Cada item sabe en qué grupo va.
**CompletarSerie** — El niño ve una secuencia con un hueco (`null`, puede estar en cualquier posición) y toca la opción que falta.
**SopaLetras** — El niño desliza sobre una cuadrícula 8×8. Las palabras van en filas o columnas, en sentido normal o invertido. Sin diagonales.
**MemoriaPareja** — El niño voltea tarjetas de 2 en 2 buscando pares. Siempre 6 parejas (12 tarjetas en grid 3×4). Cada par = un concepto y su definición o ejemplo relacionado.
**ProblemaVisual** — El niño ve emojis, imagen o SVG que ilustran un problema y elige o escribe la respuesta.
**ComprensionLectora** — El niño lee un párrafo y responde preguntas (solo EleccionMultiple o RellenarHueco dentro).

## BANCO DE EJERCICIOS — CANTIDAD, CALIDAD Y COBERTURA

Objetivo: 18-20 ejercicios por ficha. Nunca menos de 15 si el material lo permite.
Si el material es escaso: genera los que puedas hacer BIEN. Un ejercicio de relleno es peor que ninguno.

Distribución OBLIGATORIA (no orientativa): 5 nivel 1 · 7 nivel 2 · 5 nivel 3.

COBERTURA COMPLETA: cubre TODOS los conceptos de `contenido`, `ejemplos` y `palabrasClave`.
Cada palabraClave debe aparecer en ≥1 ejercicio. No te quedes en los primeros conceptos del texto.

VARIEDAD DE ÁNGULOS — para cada concepto clave, varía el enfoque:
  Definición ("¿Qué es X?") · Reconocimiento ("¿Cuál de estos es X?") · Aplicación ("Completa con X") · Contraejemplo ("¿Cuál NO es X?") · Producción (construye usando X)

ANTI-REPETICIÓN: cada ejercicio evalúa algo diferente. No reformules el mismo enunciado con distinta formulación.
Usa TODOS los tipos de ejercicio aplicables al contenido, no solo los más fáciles de generar.

## CRITERIOS DE NIVEL

El sistema adaptativo muestra el 80% de ejercicios del nivel actual del alumno.
Sin ejercicios de nivel 2 y 3, los alumnos avanzados no progresan.

**Nivel 1 — Reconocimiento (fácil)**
- La respuesta está visible directamente en el contenido o ejemplos
- Opciones claramente distintas entre sí, frase corta, vocabulario básico
- Tipos naturales: EleccionMultiple directa, RellenarHueco (copia del texto), CompletarSerie simple

**Nivel 2 — Aplicación (medio)**
- El alumno aplica una regla, no solo copia
- Opciones similares que exigen discriminar, múltiples pasos
- Tipos naturales: OrdenarFrase, UnirColumnas, ClasificarGrupos, ArrastrarPalabras, ComprensionLectora

**Nivel 3 — Síntesis (difícil)**
- Requiere memoria, búsqueda activa o construcción
- Distractores muy similares a la respuesta, mayor carga cognitiva
- Tipos naturales: SopaLetras, MemoriaPareja, OrdenarFrase (frase larga), EleccionMultiple con distractores de confusión

## POSICIÓN DE LA RESPUESTA CORRECTA

⚠️ En EleccionMultiple, la respuesta correcta NO siempre en posición 0 (primera opción).
Método B (Claude directo): distribuye entre las posiciones 0,1,2,3 a lo largo de la ficha (~25% en cada posición) — aunque no confíes solo en esto: `rebalanceo.js` lo corrige de forma determinista en `npm run publicar` y en el editor, para los dos métodos, porque autoevaluarse en esta propiedad estadística no es fiable (comprobado con datos reales: 15 de 16 fichas antiguas incumplían la regla pese a pedírselo tres veces al LLM).

## CAMPO `pista` EN CADA EJERCICIO

Cada ejercicio debe incluir `"pista"` al mismo nivel que `enunciado` y `tipo`.
La app la muestra al alumno cuando falla el primer intento.
Si no se incluye → la app muestra un texto genérico de fallback. No rompe nada, pero es mejor incluirla.

Posición: entre `enunciado` y `respuestaCorrecta`.

Reglas:
- 1 frase breve. Vocabulario de 4º Primaria.
- Específica al ejercicio (NO "Fíjate en la ficha" / "Busca en el tema")
- Ayuda sin revelar la respuesta directamente

BIEN: "La moda es el número que aparece más veces. Cuenta cuántas veces sale cada uno."
BIEN: "Los números pares terminan en 0, 2, 4, 6 u 8."
BIEN: "Recuerda que los demostrativos de distancia lejana empiezan por 'aquel'."
MAL:  "La respuesta es 4." · "Mira la ficha." · "Recuerda lo que estudiaste."

(Nota: el prompt de NotebookLM del Método A no pide `pista` explícitamente todavía — el script no la genera. Ficha generada por ese método queda sin pistas hasta que se añadan a mano en el editor; no rompe nada, usa el fallback genérico.)

## REGLA DE ENUNCIADOS AUTOCONTENIDOS

El enunciado debe incluir una pequeña explicación o ejemplo del concepto que evalúa.
El alumno no debe tener que recordar la teoría para entender qué se le pregunta.

NORMA: Incluye la definición breve o un ejemplo directo dentro del propio enunciado.

  MAL: "¿Qué es la moda?"  · "¿Qué muestra la altura de una barra?"
  BIEN: "La moda es el valor que más veces aparece en una lista. ¿Cuál es la moda de: 3, 5, 5, 7?"
        "En un diagrama de barras, cada barra representa una categoría. ¿Qué indica la altura de la barra?"

  ComprensionLectora — subpreguntas:
    MAL: "¿A cuánto llegó el rojo?"
    BIEN: "Según el texto, ¿cuántos votos recibió el color rojo en la encuesta?"

PRUEBA: ¿Un alumno que nunca ha estudiado este tema puede entender QUÉ se le pide
solo leyendo el enunciado? Si no → añade la definición o el ejemplo dentro del enunciado.

## IDS

Prefijos: matematicas→`mat`, lengua→`len`, ciencias→`cie`, social→`soc`, ingles→`ing`, valores→`val`.
Ficha: `{prefijo}-NNN` → ej. `len-001`.
Ejercicio: `{fichaId}-ex-MMM` → ej. `len-001-ex-001`.
IDs de 3 dígitos con ceros. ÚNICOS en todo el archivo ejercicios.json final.
Si el usuario indica que ya existen fichas (ej: len-001 a len-003), empieza desde len-004.

⚠️ **Antes de generar/publicar, comprueba `public/content/{asignatura}/index.json`** para no duplicar temario que ya existe — comprobado con datos reales que Matemáticas ya cubre moda, números romanos, longitud, cuadriláteros, perímetro, triángulos, cubo y probabilidad. El hueco real está en Ciencias Naturales, Ciencias Sociales, Inglés y Valores Cívicos.

## CURSO

Cada ficha lleva `"curso"` (3, 4, 5 o 6 — curso de Primaria). La app solo
enseña las fichas del curso activo, definido en un único sitio:
`src/config.js` → `CURSO_ACTUAL`. El script (`notebooklm-a-json.js`) etiqueta
automáticamente cada ficha nueva con ese valor — no hay que tocar nada más
al generar contenido del mismo curso. Al pasar de curso (p.ej. de 4º a 5º),
cambia solo `CURSO_ACTUAL` y las fichas del curso anterior dejan de
mostrarse en la app sin necesidad de borrarlas.

## SCHEMA FICHA

```json
{
  "id": "len-001",
  "subject": "lengua",
  "titulo": "Determinantes demostrativos",
  "nivel": 1,
  "curso": 4,
  "contenido": "Mínimo 4 frases completas. Solo lo que está en el material.",
  "ejemplos": ["Este libro está aquí.", "Aquel árbol está muy lejos."],
  "palabrasClave": ["demostrativo", "este", "ese", "aquel", "cerca", "lejos"],
  "tiposEjercicio": ["EleccionMultiple", "RellenarHueco", "ClasificarGrupos"],
  "ejerciciosDerivar": 18,
  "ejercicios": [ /* número real de ejercicios que generas */ ]
}
```
`nivel` de la ficha: 1=tema básico, 2=intermedio, 3=avanzado dentro de la asignatura.
`tiposEjercicio`: lista los tipos que REALMENTE aparecen en `ejercicios[]`.
`ejerciciosDerivar`: el número real de ejercicios generados en este array.

## SCHEMAS COMPLETOS POR TIPO

### EleccionMultiple
```json
{
  "id": "len-001-ex-001", "fichaId": "len-001", "subject": "lengua",
  "tipo": "EleccionMultiple", "nivel": 1, "tiempoEstimado": 30,
  "enunciado": "¿Qué demostrativo usamos para algo CERCA?",
  "pista": "Los demostrativos de cerca empiezan por 'est-'.",
  "opciones": [
    {"texto": "Este", "emoji": ""},
    {"texto": "Ese", "emoji": ""},
    {"texto": "Aquel", "emoji": ""},
    {"texto": "Aquella", "emoji": ""}
  ],
  "respuestaCorrecta": "Este"
}
```
⚠️ SIEMPRE exactamente 4 opciones.
⚠️ `respuestaCorrecta` DEBE coincidir EXACTAMENTE con uno de `opciones[].texto`.
⚠️ PROHIBIDO: emoji "✅", "❌", "✔", "✓", "🟢", "🔴" en opciones. Déjalos vacíos `""`.
⚠️ Distractores: mismo tipo semántico/gramatical que la respuesta correcta.
   MAL: ["Este", "Una mesa", "Correr", "42"] — mezcla tipos gramaticales
   BIEN: ["Este", "Ese", "Aquel", "Esto"] — todos demostrativos

Variante con SVG o imagen en las opciones (para contenido visual como figuras geométricas):
```json
"opciones": [
  {"texto": "Triángulo equilátero", "svg": "<svg width='60' height='54'><polygon points='30,2 2,52 58,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>", "emoji": ""},
  {"texto": "Triángulo rectángulo", "svg": "<svg width='60' height='54'><polygon points='2,52 2,2 58,52' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2'/></svg>", "emoji": ""},
  {"texto": "Cuadrado", "svg": "<svg width='54' height='54'><rect x='2' y='2' width='50' height='50' fill='#dcfce7' stroke='#15803d' stroke-width='2'/></svg>", "emoji": ""},
  {"texto": "Círculo", "svg": "<svg width='54' height='54'><circle cx='27' cy='27' r='25' fill='#fef9c3' stroke='#a16207' stroke-width='2'/></svg>", "emoji": ""}
]
```
⚠️ Si las opciones son objetos con SVG/imagen: `respuestaCorrecta` sigue siendo el campo `texto` exacto.
📌 Método A: el script añade el SVG automáticamente (`anadirSvgFormas()`) cuando las 4 opciones son nombres de figuras conocidas — no hace falta pedírselo a NotebookLM.

### RellenarHueco
```json
{
  "id": "len-001-ex-002", "fichaId": "len-001", "subject": "lengua",
  "tipo": "RellenarHueco", "nivel": 1, "tiempoEstimado": 30,
  "enunciado": "[___] perro que está aquí a mi lado es muy simpático.",
  "pista": "Piensa en qué demostrativo usamos cuando algo está muy cerca de nosotros.",
  "respuestaCorrecta": "Este"
}
```
⚠️ El enunciado DEBE contener exactamente 1 `[___]` (3 guiones bajos entre corchetes). No dos.
⚠️ `respuestaCorrecta`: idealmente 1-3 palabras. No frases completas.
⚠️ La respuesta DEBE aparecer directamente en el contenido o palabrasClave de la ficha.

### ArrastrarPalabras
```json
{
  "id": "len-001-ex-003", "fichaId": "len-001", "subject": "lengua",
  "tipo": "ArrastrarPalabras", "nivel": 2, "tiempoEstimado": 60,
  "fraseConHuecos": "[___] casa que ves a lo lejos. [___] silla en la que estoy sentado.",
  "banco": ["Aquella", "Esta", "Ese", "Aquel"],
  "respuestasCorrectas": ["Aquella", "Esta"]
}
```
⚠️ CRÍTICO: `respuestasCorrectas` NUNCA puede tener palabras duplicadas.
⚠️ `banco` NUNCA puede tener palabras duplicadas.
⚠️ Número de `[___]` en `fraseConHuecos` = longitud de `respuestasCorrectas`.
⚠️ Cada valor de `respuestasCorrectas` DEBE estar en `banco`.
⚠️ `banco.length` ≥ nº de huecos + 1. Ejemplo: 2 huecos → mínimo 3 palabras en banco.
⚠️ Los distractores del banco deben ser del mismo tipo gramatical que las respuestas correctas.

### OrdenarFrase
```json
{
  "id": "len-001-ex-004", "fichaId": "len-001", "subject": "lengua",
  "tipo": "OrdenarFrase", "nivel": 2, "tiempoEstimado": 60,
  "enunciado": "Ordena las palabras:",
  "palabrasDesordenadas": ["niña", "aquella", "muy", "canta", "bien"],
  "fraseCorrecta": "Aquella niña canta muy bien"
}
```
⚠️ CRÍTICO: Las palabras de `fraseCorrecta` (separadas por espacios) deben ser EXACTAMENTE las mismas que `palabrasDesordenadas` (mismo multiconjunto, ignorando mayúsculas).
✓ Comprueba: ordena ambos arrays en minúsculas y compara → deben coincidir.
⚠️ CRÍTICO: Cada elemento de `palabrasDesordenadas` debe ser UNA SOLA PALABRA sin espacios internos.
   MAL: ["Fecha y lugar", "Saludo"]  ← "Fecha y lugar" son 3 palabras → rompe la validación
   BIEN: ["Fecha", "lugar", "Saludo"]  ← una palabra por elemento
   → Si necesitas ordenar secciones con nombres compuestos, usa EleccionMultiple o UnirColumnas.
⚠️ Mínimo 4 palabras. Longitud recomendada por nivel:
   Nivel 1: 4-5 palabras · Nivel 2: 5-7 palabras · Nivel 3: 7-9 palabras
📌 Método A: el script limpia comas y otra puntuación interna de cada palabra automáticamente.

### UnirColumnas
```json
{
  "id": "len-001-ex-005", "fichaId": "len-001", "subject": "lengua",
  "tipo": "UnirColumnas", "nivel": 2, "tiempoEstimado": 90,
  "enunciado": "Une cada frase con la distancia que indica:",
  "parejas": [
    {"izquierda": "Este lápiz es mío.", "derecha": "Cerca"},
    {"izquierda": "Aquella montaña es muy alta.", "derecha": "Muy lejos"},
    {"izquierda": "Esa mochila está en tu silla.", "derecha": "Un poco lejos"},
    {"izquierda": "Estos cuadernos son nuevos.", "derecha": "Cerca (plural)"}
  ]
}
```
⚠️ CRÍTICO: Exactamente 4 parejas. Sin duplicados en "izquierda" ni en "derecha".
⚠️ Si el material solo tiene 3 pares naturales y el 4º sería inventado: omite UnirColumnas y usa otro tipo.
Convención: izquierda = elemento más complejo · derecha = etiqueta o término corto.
📌 Método A: construido 100% por el script (`construirUnirColumnas()`) desde PALABRAS CLAVE — izquierda = definición acortada, derecha = término.

### ClasificarGrupos
```json
{
  "id": "len-001-ex-006", "fichaId": "len-001", "subject": "lengua",
  "tipo": "ClasificarGrupos", "nivel": 2, "tiempoEstimado": 60,
  "enunciado": "Clasifica según la distancia:",
  "grupos": [
    {"id": "cerca", "nombre": "Cerca 📍"},
    {"id": "lejos", "nombre": "Muy lejos 🏔️"}
  ],
  "items": [
    {"id": "1", "texto": "este", "grupoId": "cerca"},
    {"id": "2", "texto": "aquel", "grupoId": "lejos"},
    {"id": "3", "texto": "esta", "grupoId": "cerca"},
    {"id": "4", "texto": "aquellas", "grupoId": "lejos"},
    {"id": "5", "texto": "ese", "grupoId": "lejos"},
    {"id": "6", "texto": "estas", "grupoId": "cerca"}
  ]
}
```
⚠️ 2-3 grupos. 4-6 items. El `grupoId` de cada item DEBE existir en `grupos`.
⚠️ Ids de items únicos (usar números: "1", "2", "3"...).
⚠️ Cada grupo DEBE tener al menos 1 item asignado.
⚠️ Equilibra los items entre grupos: si hay 2 grupos, ~3 items en cada uno. Evita 5+1.

### CompletarSerie
```json
{
  "id": "mat-001-ex-001", "fichaId": "mat-001", "subject": "matematicas",
  "tipo": "CompletarSerie", "nivel": 1, "tiempoEstimado": 35,
  "enunciado": "Completa la serie de 5 en 5:",
  "serie": ["5", "10", null, "20", "25"],
  "opciones": ["12", "15", "18"],
  "respuestaCorrecta": "15"
}
```
⚠️ EXACTAMENTE 1 valor `null` en `serie`. Ni 0 ni más de 1.
⚠️ El `null` puede ir en cualquier posición — varía su posición entre ejercicios. No siempre al final.
⚠️ `respuestaCorrecta` DEBE estar en `opciones`. Recomendado: 3-4 opciones.
📌 Método A: NotebookLM solo da la serie + la respuesta; las `opciones` (distractores numéricos cercanos) las genera el script (`opcionesNumericas()`).

### SopaLetras
```json
{
  "id": "len-001-ex-007", "fichaId": "len-001", "subject": "lengua",
  "tipo": "SopaLetras", "nivel": 3, "tiempoEstimado": 180,
  "enunciado": "Encuentra los demostrativos:",
  "palabras": ["ESTE", "ESA", "AQUEL", "ESTA"],
  "cuadricula": [
    ["E","S","T","E","X","Z","L","M"],
    ["A","B","C","D","E","F","P","N"],
    ["A","Q","U","E","L","U","I","O"],
    ["E","S","A","H","J","K","L","P"],
    ["A","T","S","E","J","K","L","A"],
    ["D","G","H","J","K","L","M","N"],
    ["F","G","H","J","K","L","M","N"],
    ["R","H","J","K","L","M","N","O"]
  ]
}
```
⚠️ Cuadrícula EXACTAMENTE 8×8 (8 arrays de 8 letras).
⚠️ Letras MAYÚSCULAS, sin acentos, sin Ñ (usa N). El array `palabras` también MAYÚSCULAS sin acentos.
⚠️ Número óptimo de palabras: 4-6. Menos de 4 = trivial; más de 6 = cuadrícula saturada.
⚠️ Longitud de cada palabra: mínimo 3 letras, MÁXIMO 8 letras. La cuadrícula es 8×8 — una palabra de 9+ letras no cabe en ninguna fila ni columna.
⚠️ Si el vocabulario clave del tema son símbolos o caracteres de 1-2 letras (ej: números romanos I, V, X; operadores +, -, ×), NO uses SopaLetras — usa MemoriaPareja o ClasificarGrupos en su lugar.
⚠️ Cada palabra debe aparecer en alguna fila o columna (horizontal o vertical, sentido normal o invertido). SIN diagonales.

📌 **Método A: este tipo lo construye siempre el script** (`construirSopaLetras()`), nunca el LLM — precisamente porque PROMPT-FICHAS.md ya avisaba (ver Método B abajo) de que una sopa de letras generada a mano por un LLM es propensa a error. El script coloca cada palabra con un algoritmo real (horizontal/vertical, normal/invertida, sin diagonales) y se autoverifica letra a letra antes de aceptar el ejercicio — si no puede verificar una palabra, la descarta en vez de arriesgarse a publicar una sopa rota. Verificado en el editor de la app con vista previa real: la cuadrícula generada coincide exactamente con las palabras jugables.

Método B (si generas esto a mano en Claude), protocolo obligatorio:
   1) Decide en qué fila/columna va cada palabra ANTES de rellenar el resto.
   2) Escribe primero esa fila/columna con la palabra insertada.
   3) Rellena las celdas restantes con letras aleatorias.
   4) Recorre letra a letra para confirmar que cada palabra aparece antes de finalizar.

### MemoriaPareja
```json
{
  "id": "len-001-ex-008", "fichaId": "len-001", "subject": "lengua",
  "tipo": "MemoriaPareja", "nivel": 3, "tiempoEstimado": 180,
  "enunciado": "Empareja el demostrativo con la distancia:",
  "parejas": [
    {"a": "este", "b": "muy cerca"},
    {"a": "ese", "b": "un poco lejos"},
    {"a": "aquel", "b": "muy lejos"},
    {"a": "esta", "b": "femenino cerca"},
    {"a": "aquella", "b": "femenino lejos"},
    {"a": "esos", "b": "plural lejos"}
  ]
}
```
⚠️ CRÍTICO: Exactamente 6 parejas. Ni 5 ni 7.
⚠️ Ningún valor en "a" o "b" puede repetirse entre parejas.
⚠️ Cada par: "a" y "b" son tipos DISTINTOS de información (término ↔ definición, concepto ↔ ejemplo).
   MAL: {"a": "perro", "b": "gato"} — dos ejemplos sin conexión pedagógica clara
   BIEN: {"a": "mamífero", "b": "da leche"} — término + característica
⚠️ Longitud máxima de "a" y "b": 4 palabras. Textos largos no caben en el grid 3×4 (esto NO lo valida el código — es solo para que quepa bien visualmente).
📌 Método A: construido 100% por el script (`construirMemoriaPareja()`) desde PALABRAS CLAVE — "a" = término, "b" = definición acortada (máx. 6 palabras + "…"), con deduplicación de los 12 valores.

### ProblemaVisual
```json
{
  "id": "mat-001-ex-002", "fichaId": "mat-001", "subject": "matematicas",
  "tipo": "ProblemaVisual", "nivel": 1, "tiempoEstimado": 45,
  "enunciado": "Hay 8 manzanas y caen 3. ¿Cuántas quedan?",
  "visual": {
    "tipo": "emojis",
    "emoji": "🍎",
    "cantidad": 8,
    "operacion": "resta",
    "cantidadOperacion": 3
  },
  "opciones": ["3", "4", "5", "6"],
  "respuestaCorrecta": "5",
  "esNumerico": false
}
```

Variante numérica (el alumno escribe el número, sin opciones):
```json
{
  "id": "mat-001-ex-003", "fichaId": "mat-001", "subject": "matematicas",
  "tipo": "ProblemaVisual", "nivel": 2, "tiempoEstimado": 45,
  "enunciado": "Hay 6 pájaros y llegan 4 más. ¿Cuántos hay en total?",
  "visual": { "tipo": "emojis", "emoji": "🐦", "cantidad": 6, "operacion": "suma", "cantidadOperacion": 4 },
  "respuestaCorrecta": "10",
  "esNumerico": true
}
```
⚠️ Si `esNumerico: false` → necesita `opciones` y `respuestaCorrecta` en ellas.
⚠️ Si `esNumerico: true` → NO pongas `opciones`.
⚠️ `visual.cantidad` recomendado: ≤10 nivel 1, ≤15 nivel 2, ≤20 nivel 3. Máximo técnico: 30.
⚠️ Operaciones: `"suma"`, `"resta"`, o `null` (sin operación matemática).
⚠️ Distractores en opciones: números CERCANOS a la respuesta correcta.
📌 **Confirmado en `validacion.js`: el campo `visual` es OPCIONAL.** Método A: los `PROBLEMAS NUMERICOS` del prompt (problemas de aplicar una fórmula, no de contar objetos) se generan como `esNumerico: true` SIN `visual` — el niño escribe el número, sin emojis forzados donde no pintan nada. El script verifica dos veces la aritmética que da NotebookLM antes de aceptarla como `respuestaCorrecta`.

Variante con gráfico de barras (cuando el enunciado hace referencia a una tabla o gráfica):
```json
{
  "id": "mat-003-ex-007", "fichaId": "mat-003", "subject": "matematicas",
  "tipo": "ProblemaVisual", "nivel": 2, "tiempoEstimado": 45,
  "enunciado": "En el gráfico de caramelos, ¿cuántos amarillos hay?",
  "pista": "Busca la barra del color Amarillo y lee su altura.",
  "visual": {
    "tipo": "barras",
    "barras": [
      { "label": "Rojo",     "valor": 6, "color": "#ef4444" },
      { "label": "Verde",    "valor": 2, "color": "#22c55e" },
      { "label": "Azul",     "valor": 3, "color": "#3b82f6" },
      { "label": "Amarillo", "valor": 4, "color": "#eab308" }
    ]
  },
  "opciones": ["2", "6", "4", "3"],
  "respuestaCorrecta": "4",
  "esNumerico": false
}
```
⚠️ Usa `visual.tipo: "barras"` siempre que el ejercicio haga referencia a un gráfico de barras o tabla.
⚠️ Colores estándar: rojo `#ef4444`, verde `#22c55e`, azul `#3b82f6`, amarillo `#eab308`, naranja `#f97316`, morado `#a855f7`.
⚠️ `barras` debe tener entre 2 y 6 elementos. Valores enteros positivos.
   MAL: respuesta=5, opciones ["1","5","100","0"]
   BIEN: respuesta=5, opciones ["3","4","5","6"]

### ComprensionLectora
```json
{
  "id": "len-002-ex-001", "fichaId": "len-002", "subject": "lengua",
  "tipo": "ComprensionLectora", "nivel": 2, "tiempoEstimado": 240,
  "enunciado": "Lee y responde:",
  "texto": "El sábado, Ana y su abuelo fueron al campo...",
  "preguntas": [
    {
      "tipo": "EleccionMultiple",
      "enunciado": "¿Con quién fue Ana?",
      "opciones": ["Con su madre", "Con su abuelo", "Con su amiga", "Sola"],
      "respuestaCorrecta": "Con su abuelo"
    },
    {
      "tipo": "RellenarHueco",
      "enunciado": "Ana recogió unas [___] bonitas.",
      "respuestaCorrecta": "piedras"
    }
  ]
}
```
⚠️ Texto máximo 100 palabras. Entre 3-5 preguntas. Solo `EleccionMultiple` o `RellenarHueco` dentro.
⚠️ Las preguntas deben cubrir distintas partes del texto, no todas sobre la misma frase.

🚨 DIFERENCIA CRÍTICA vs EleccionMultiple top-level:
   EleccionMultiple top-level:           opciones = [{texto: "...", emoji: ""}]   ← OBJETOS
   ComprensionLectora preguntas[].opciones = ["opción A", "opción B"]            ← STRINGS PLANOS
⚠️ Subpregunta EleccionMultiple: `opciones` es array de STRINGS (no objetos), `respuestaCorrecta` en opciones.
⚠️ Subpregunta RellenarHueco: enunciado contiene `[___]` (nunca `[***]` — ver tabla de fallos).
📌 `rebalanceo.js` también reequilibra las posiciones de las subpreguntas EleccionMultiple anidadas aquí, no solo las de primer nivel — se descubrió que se quedaban todas en la posición 0 hasta que se corrigió explícitamente.

## IMÁGENES Y SVG

Todos los tipos soportan imagen o SVG opcional en el enunciado:
  `"imagenEnunciado": "/img/nombre.png"` — si el archivo existe en `public/img/` del proyecto
  `"svgEnunciado": "<svg>...</svg>"` — genera tú el SVG directamente (PREFERIDO para geometría)

EleccionMultiple y ProblemaVisual también aceptan SVG/imagen POR OPCIÓN (ver ejemplo en EleccionMultiple arriba).
⚠️ `respuestaCorrecta` siempre coincide con el campo `"texto"`, aunque la opción tenga SVG o imagen.

SVG prontos para figuras geométricas de 4º Primaria (misma librería que usa el script del Método A, `SVG_FORMAS` en `notebooklm-a-json.js`):

Para el enunciado (tamaño grande, width/height ~88-130):
  Triángulo equilátero:  `<svg width='100' height='88'><polygon points='50,4 4,84 96,84' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2.5'/></svg>`
  Triángulo rectángulo:  `<svg width='100' height='88'><polygon points='4,84 4,4 96,84' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2.5'/><rect x='4' y='68' width='16' height='16' fill='none' stroke='#1d4ed8' stroke-width='1.5'/></svg>`
  Triángulo isósceles:   `<svg width='100' height='88'><polygon points='50,4 10,84 90,84' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2.5'/></svg>`
  Triángulo escaleno:    `<svg width='100' height='88'><polygon points='20,80 85,80 55,8' fill='#dbeafe' stroke='#1d4ed8' stroke-width='2.5'/></svg>`
  Cuadrado:              `<svg width='88' height='88'><rect x='4' y='4' width='80' height='80' fill='#dcfce7' stroke='#15803d' stroke-width='2.5'/></svg>`
  Rectángulo:            `<svg width='130' height='80'><rect x='4' y='4' width='122' height='72' fill='#dcfce7' stroke='#15803d' stroke-width='2.5'/></svg>`
  Rombo:                 `<svg width='88' height='88'><polygon points='44,4 84,44 44,84 4,44' fill='#dcfce7' stroke='#15803d' stroke-width='2.5'/></svg>`
  Trapecio:              `<svg width='100' height='80'><polygon points='30,4 70,4 96,76 4,76' fill='#dcfce7' stroke='#15803d' stroke-width='2.5'/></svg>`
  Círculo:               `<svg width='88' height='88'><circle cx='44' cy='44' r='40' fill='#fef9c3' stroke='#a16207' stroke-width='2.5'/></svg>`
  Pentágono:             `<svg width='88' height='88'><polygon points='44,4 84,32 68,80 20,80 4,32' fill='#fce7f3' stroke='#9d174d' stroke-width='2.5'/></svg>`
  Hexágono:              `<svg width='88' height='88'><polygon points='44,4 80,24 80,64 44,84 8,64 8,24' fill='#fce7f3' stroke='#9d174d' stroke-width='2.5'/></svg>`

Para las opciones (tamaño pequeño, width/height ~54-60): usa los mismos SVG reducidos (ver `SVG_FORMAS` en el script para las versiones exactas ya reducidas).

⚠️ Rombo y Trapecio se añadieron después de que una ficha real de geometría los necesitara y no existieran en la librería — si aparece una figura nueva que falte, añádela aquí Y en `SVG_FORMAS` del script, para que ambos métodos la reconozcan igual.

## TABLA TIEMPOS ESTIMADOS

| Tipo | Segundos |
|---|---|
| EleccionMultiple | 30 |
| RellenarHueco | 30 |
| ArrastrarPalabras | 60 |
| OrdenarFrase | 60 |
| UnirColumnas | 90 |
| ClasificarGrupos | 60 |
| CompletarSerie | 35 |
| SopaLetras | 180 |
| MemoriaPareja | 180 |
| ProblemaVisual | 45 |
| ComprensionLectora | 240 |

---

# MÉTODO B — Claude Project directo (sin NotebookLM)

Sigue siendo válido. Útil si no tienes NotebookLM a mano.

### PASO 1 — PDF → Markdown (en tu PC, una vez por PDF)

```bash
# En el terminal de Claude Code:
python scripts/pdf-a-md.py ruta/al/archivo.pdf

# Genera: fichas-temp.md en la carpeta del proyecto
# Si el PDF es escaneado y el script no extrae texto,
# sube el PDF directamente a Claude (ve al Paso 2)
```

### PASO 2 — Material → JSON (en Claude Project)

1. **Nuevo chat** en tu Proyecto Claude (nombre: `Generación [Asignatura]`)
2. **Primer mensaje**: pega el PROMPT completo (ver abajo)
3. **Segundo mensaje**: pega el contenido de `fichas-temp.md`
4. **FASE 1** (automática): Claude analiza el material y devuelve solo una tabla índice con el plan. Sin JSON todavía.
5. **Confirma**: cuántas fichas por tanda (recomendado: 1-2)
6. **FASE 2+3** (automáticas): Claude genera el JSON y lo auto-valida internamente → recibes JSON limpio
7. Cuando acaba la tanda, responde `"sigue"` para la siguiente

### PASO 3 — JSON → GitHub (un comando)

```bash
npm run publicar
# → Pega el JSON → Enter x2
# → Valida automáticamente
# → Escribe public/content/{asignatura}/{fichaId}.json + index.json por asignatura
# → Actualiza public/manifest.json con versión por asignatura
# → git commit + push
# → Todos los dispositivos descargan solo las asignaturas actualizadas
```

## 📋 EL PROMPT (Método B — copia desde aquí 👇)

```
Eres un maestro especialista en 4º de Primaria (currículo español LOMLOE) con dominio de técnicas didácticas para niños de 9-10 años. Creas ejercicios de alta calidad pedagógica para la app educativa de este colegio bilingüe.

CALIDAD OBLIGATORIA en cada ejercicio:
- Un objetivo pedagógico concreto (¿qué concepto específico evalúa?)
- Lenguaje natural para 8-9 años (frases cortas, vocabulario del nivel)
- Distractores del mismo tipo semántico que la respuesta correcta, plausibles para quien no sabe pero claramente incorrectos para quien sí sabe
- Una sola respuesta correcta, sin ambigüedades ni dobles interpretaciones

REGLA DE OUTPUT: Responde con exactamente lo que se pide. Sin preámbulos, sin explicaciones de lo que acabas de hacer, sin resúmenes. Calidad sin relleno.

PROHIBIDO PREGUNTAR: Nunca preguntes sobre formato de salida (siempre es JSON para la app), sobre alcance (lo determina el material), ni sobre ninguna aclaración antes de recibir el material. Cuando recibas material → ejecuta FASE 1 directamente.

# IDIOMAS POR ASIGNATURA (colegio bilingüe)

| Asignatura          | Idioma de los ejercicios |
|---------------------|--------------------------|
| Matemáticas         | Español                  |
| Lengua              | Español                  |
| Ciencias Naturales  | Inglés (Science)         |
| Ciencias Sociales   | Inglés (Social Science)  |
| Inglés              | Inglés                   |
| Valores Cívicos     | Español                  |

Enunciados, opciones y feedback en el idioma de la asignatura.
Para Science y Social Science: usa el vocabulario técnico tal como aparece en el material.

# REGLA FUNDAMENTAL

NUNCA inventes terminología, conceptos o respuestas que no estén en el material proporcionado.
Las respuestas correctas deben aparecer DIRECTAMENTE en el contenido, ejemplos o palabrasClave de la ficha — no deducidas de conocimiento externo aunque sea plausible.
Si el material es insuficiente para un tipo de ejercicio, omítelo. Un ejercicio de relleno es peor que ninguno.

(el resto del prompt — tipos, schemas, niveles, IDs, fases 1-4, checklist — es la REFERENCIA DE SCHEMA de más arriba en este documento, que vale para los dos métodos)

Espera el material.
```

(👆 fin del prompt del Método B — completa con las secciones de REFERENCIA DE SCHEMA arriba antes de pegarlo)

## FLUJO DE TRABAJO (4 FASES, Método B, mismo chat)

### FASE 1 — PLANIFICACIÓN (primer mensaje con material)

Al recibir material: ejecuta esta fase INMEDIATAMENTE. Sin preguntar nada. Sin pedir confirmación de formato ni alcance.
Responde SOLO con una tabla índice compacta. Sin prosa, sin explicaciones. NO generes JSON todavía.

| Nº | ID | Título | Subject | Nivel | Conceptos clave | Tipos aplicables | Ejercicios |
|----|-----|--------|---------|-------|-----------------|-----------------|------------|

Al final de la tabla, solo una línea: `¿Cuántas fichas por tanda? (recomendado: 1-2)`

### FASE 2 — GENERACIÓN (tras confirmación del usuario)

Genera los ejercicios para la tanda confirmada según los schemas y criterios de este prompt.

### FASE 3 — VALIDACIÓN POR EJERCICIO (ejecuta internamente ANTES de devolver el JSON)

Revisa y corrige cada ejercicio individualmente, en silencio (sin explicar al usuario qué corregiste):

CORRECCIONES AUTOMÁTICAS:
✦ `respuestaCorrecta` no coincide exactamente con el texto de la opción → corregir
✦ `respuestaCorrecta` siempre en posición 0 en los EleccionMultiple → redistribuir entre posiciones 0,1,2,3 (recuerda: `rebalanceo.js` lo corrige igualmente al publicar, pero inténtalo bien de todas formas)
✦ SopaLetras: alguna palabra tiene 9+ letras → imposible en cuadrícula 8×8. Sustituir por palabra más corta (≤8 letras) del mismo tema o cambiar tipo de ejercicio.
✦ SopaLetras: alguna palabra no aparece en la cuadrícula → reubicar en una fila/columna completa.
   PROTOCOLO OBLIGATORIO: para cada palabra, escribe primero la fila/columna con la palabra insertada letra a letra, luego rellena el resto. Nunca generes la cuadrícula de memoria — siempre construye fila a fila.
✦ Distribución de niveles descompensada → reequilibrar añadiendo ejercicios de nivel 2-3
✦ `ejerciciosDerivar` no coincide con el nº real de ejercicios → corregir
✦ `tiposEjercicio` en la ficha no refleja los tipos usados → corregir

ERRORES MÁS FRECUENTES — verifica estos uno por uno en CADA ejercicio antes de devolver:

ClasificarGrupos:
✦ MÍNIMO 4 items. La app rechaza ClasificarGrupos con 3 o menos items.
  → Cuenta los items antes de cerrar el JSON. Si solo hay 3, añade uno más o cambia el tipo a UnirColumnas.
✦ Cada item DEBE tener campo "id" con valor string único ("1", "2", "3"...).
  MAL: {"texto": "este", "grupoId": "cerca"}
  BIEN: {"id": "1", "texto": "este", "grupoId": "cerca"}
  → Revisa que NINGÚN item tenga "id" undefined, null o duplicado.

OrdenarFrase:
✦ Cada elemento de "palabrasDesordenadas" debe ser UNA SOLA PALABRA (sin espacios internos).
  MAL: ["Fecha y lugar", "Saludo", "Cuerpo"]  ← "Fecha y lugar" tiene 3 palabras, rompe la validación
  BIEN: ["Fecha", "lugar", "el", "Saludo", "Cuerpo"]  ← cada elemento es una palabra
✦ VERIFICACIÓN OBLIGATORIA antes de cerrar el ejercicio:
  1) Escribe fraseCorrecta y sepárala por espacios → cuenta las palabras → anota el número N.
  2) Cuenta los elementos de palabrasDesordenadas → debe ser también N.
  3) Ordena palabrasDesordenadas alfabéticamente y ordena las palabras de fraseCorrecta alfabéticamente → ambas listas deben ser idénticas (mismo multiconjunto).
  Si no coinciden → corregir antes de seguir.
  → Si el texto tiene términos compuestos, usa EleccionMultiple o UnirColumnas en su lugar.

ArrastrarPalabras:
✦ El campo se llama exactamente "fraseConHuecos" (no "frase", no "enunciado", no "oracion").
  → Busca en tu respuesta la palabra "fraseConHuecos". Si no aparece, has usado el nombre incorrecto.
✦ "fraseConHuecos" DEBE contener tantos [___] como elementos tiene "respuestasCorrectas".

UnirColumnas:
✦ Todos los valores de "derecha" deben ser distintos entre sí. Todos los de "izquierda" también.
  → Lee los 4 valores de "derecha" en voz alta: ¿hay alguno repetido?

MemoriaPareja:
✦ Los 12 valores (6 "a" + 6 "b") deben ser todos distintos. Ningún valor puede repetirse.
  → Lee los 6 valores de "a" y los 6 de "b": ¿alguno aparece dos veces?
✦ TRAMPA FRECUENTE: si el tema tiene categorías con nombre corto (Posible/Seguro/Imposible, Mamífero/Ave/Reptil, Suma/Resta…), es fácil usarlas como "a" en un par y como "b" en otro → duplicado.
  → Solución: usa el nombre como "a" y una descripción/ejemplo como "b". Nunca el mismo término en ambos lados.

LECTURA DESDE EL ALUMNO — ejecuta en silencio antes de devolver el JSON:

Simula que eres un niño de 8 años que NO ha estudiado el tema. Para cada ejercicio:

PASO 1 — ¿La respuesta correcta ES la única correcta?
  ¿Podría un alumno que sí sabe el tema justificar otra opción como también válida?
  Si sí → revisar distractores o reformular el enunciado.

PASO 2 — ¿Los distractores son claramente incorrectos?
  ¿Algún distractor es también aceptable según el contenido de la ficha?
  Si sí → reemplazarlo por uno más claramente incorrecto del mismo tipo semántico.

PASO 3 — ¿El enunciado explica lo que evalúa?
  ¿Incluye una definición breve o un ejemplo que permita entender la pregunta sin haber estudiado el tema?
  Si no → añadir la explicación dentro del enunciado (ver REGLA DE ENUNCIADOS AUTOCONTENIDOS).

PASO 4 — ¿La pista ayuda sin revelar?
  ¿Un niño podría deducir la respuesta exacta leyendo solo la pista?
  Si sí → reformular para activar el recuerdo sin delatar la respuesta.

PASO 5 — Verificación de dominio: Matemáticas
  Solo para ejercicios con `subject: "matematicas"`:
  ¿Los resultados de todas las operaciones aritméticas son correctos?
  → Calcula tú mismo: si `respuestaCorrecta` es "10" y la operación es 6+4, confirma 6+4=10.
  → Si hay error de cálculo → corregir la respuesta o los datos del enunciado.

PASO 6 — Verificación de dominio: Science y Social Science (inglés)
  Solo para ejercicios con `subject: "ciencias"` o `subject: "social"`:
  ¿El vocabulario técnico en inglés coincide EXACTAMENTE con el material del libro?
  → No traduzcas ni parafrasees. Si el libro dice "habitat", el ejercicio dice "habitat".
  → Si usaste un sinónimo o traducción propia → sustituir por el término del material.

Orden: revisa primero todos los EleccionMultiple (mayor riesgo de distractor ambiguo),
luego RellenarHueco, luego los demás. Sin generar texto para el usuario.

AVISA AL USUARIO solo si no puedes resolver sin inventar:
⚠ "El material no tiene contenido suficiente para X ejercicios de calidad en [tipo]."
⚠ "El tipo [Y] requeriría inventar datos que no están en el material."

### FASE 4 — COHERENCIA DEL CONJUNTO (ejecuta después de FASE 3, antes de devolver el JSON)

FASE 3 revisa ejercicio por ejercicio. FASE 4 revisa la ficha como un todo.

CONTROL 1 — Cobertura de palabrasClave
  Lista las palabrasClave de la ficha. ¿Cada una aparece en ≥1 ejercicio?
  Si alguna no está cubierta → añadir un ejercicio o adaptar uno existente.

CONTROL 2 — Anti-duplicados temáticos
  ¿Hay dos o más ejercicios que evalúan exactamente el mismo concepto de la misma manera?
  (Ej: dos EleccionMultiple con el mismo enunciado reformulado → eliminar el más débil.)

CONTROL 3 — Progresión de dificultad coherente
  ¿Los ejercicios de nivel 3 son notablemente más difíciles que los de nivel 1?
  ¿Los de nivel 2 representan un paso intermedio real?
  Si la diferencia no se percibe → reformular enunciados o distractores para acentuar la dificultad.

CONTROL 4 — Unicidad de enunciados
  ¿Hay dos ejercicios con el mismo enunciado o enunciados casi idénticos?
  → Reformular el duplicado para evaluar un ángulo diferente (definición → aplicación → contraejemplo).

CONTROL 5 — `tiposEjercicio` y `ejerciciosDerivar` en la ficha
  ¿`tiposEjercicio` lista EXACTAMENTE los tipos usados (ni más ni menos)?
  ¿`ejerciciosDerivar` coincide con el número real de ejercicios en el array?
  → Corregir ambos campos si no coinciden.

Sin generar texto para el usuario. Solo correcciones silenciosas.

Solo DESPUÉS de las Fases 3+4: devuelve el bloque JSON limpio.
Al final del bloque JSON: `Tanda X/N. Responde "sigue" para la siguiente.`

Con cada "sigue": repite Fases 2+3+4 para la siguiente tanda.

## CHECKLIST ANTES DE RESPONDER (Método B)

Para CADA ejercicio, verifica mentalmente:

DISTRIBUCIÓN Y CALIDAD:
☐ Ficha con ≥5 ejercicios de nivel 1, ≥5 de nivel 2, ≥5 de nivel 3
☐ Cada palabraClave de la ficha aparece en ≥1 ejercicio
☐ En EleccionMultiple, la respuesta correcta NO siempre en posición 0

CAMPOS GENERALES:
☐ id, fichaId, subject, tipo, nivel, tiempoEstimado presentes y correctos
☐ fichaId coincide exactamente con la ficha
☐ tipo es uno de los 11

POR TIPO:
☐ EleccionMultiple: 4 opciones; respuestaCorrecta en opciones[].texto; SIN "✅/❌/✔/🟢/🔴" en emoji; distractores del mismo tipo semántico
☐ RellenarHueco: exactamente 1 [___] en enunciado; respuesta 1-3 palabras; respuesta en contenido/palabrasClave
☐ ArrastrarPalabras: nº huecos = nº respuestas; sin duplicados en banco ni respuestasCorrectas; banco.length ≥ huecos+1
☐ OrdenarFrase: palabras de fraseCorrecta = multiconjunto de palabrasDesordenadas; ≥4 palabras
☐ UnirColumnas: exactamente 4 parejas; sin duplicados; no inventado para llegar a 4
☐ ClasificarGrupos: 2-3 grupos; ≥4 items; cada grupoId existe; equilibrio entre grupos
☐ CompletarSerie: exactamente 1 null; posición del null varía; respuestaCorrecta en opciones; 3-4 opciones
☐ SopaLetras: 8×8 exacto; palabras[] y cuadrícula en MAYÚSCULAS sin acentos; 4-6 palabras; cada palabra verificada letra a letra
☐ MemoriaPareja: exactamente 6 parejas; sin duplicados; pares de tipos distintos; ≤4 palabras por tarjeta
☐ ProblemaVisual: opciones solo si esNumerico:false; cantidad según nivel; distractores cercanos a respuesta
☐ ComprensionLectora: texto ≤100 palabras; 3-5 preguntas sobre distintas partes; opciones de subpreguntas son STRINGS planos

SVG E IMÁGENES:
☐ Si hay svgEnunciado o svg en opciones: el SVG tiene width y height definidos
☐ Si opciones son objetos: respuestaCorrecta = campo "texto" exacto de una opción

JSON:
☐ Sintácticamente válido (sin comas finales, comillas correctas)
☐ IDs únicos en todo el bloque
☐ tiposEjercicio en la ficha lista los tipos realmente usados
☐ ejerciciosDerivar = número real de ejercicios en el array

## OUTPUT (Método B)

Si el material es ambiguo o insuficiente: añade una línea de texto ANTES del JSON explicando la limitación. Luego genera lo que puedas hacer bien.

Solo bloque ```json [...] ```. Sin texto antes ni después (excepto avisos de limitación y el marcador de tanda al final).

Espera el material.

---

## ❓ Si la app muestra errores al recibir nuevo contenido

```bash
# El script publicar.js valida automáticamente y muestra los errores.
# Si hay errores, copia el mensaje y vuelve al chat de Claude:
"Corrige estos errores y regenera la tanda: [pegar errores]"
```

## ❓ Si el PDF no extrae texto (escaneado)

Sube el PDF directamente al chat del Proyecto Claude (arrastrar y soltar). Claude tiene visión integrada y puede leer PDFs escaneados.
