# LISTADO MAESTRO DE MEJORAS

Todo lo identificado hasta ahora, de toda la auditoría (Fase 1, auditoría crítica, replanteamiento y esta última revisión de `validacion.js`). Un solo sitio para ver el estado real. ✅ hecho · 🔴 alto impacto · 🟡 medio · 🟢 bajo/opcional.

## Hecho ya (esta sesión)
- ✅ Curso corregido a 4º Primaria en todos los textos.
- ✅ Service Worker desalineado con `content/*.json` (bug real de caché obsoleta).
- ✅ `npm run vaciar` ahora sí limpia el dispositivo en el siguiente sync (antes no hacía nada).
- ✅ `PantallaImportar` conectada al panel admin (antes código muerto).
- ✅ Backup/restaurar progreso del niño (exportar/importar JSON desde el admin).
- ✅ Error Boundary — ya no hay pantalla en blanco ante un fallo.
- ✅ 31 tests con Vitest (`validacion.js`, `selector.js`, el nuevo schema).
- ✅ JSON Schema formal con `ajv` para los 11 tipos de ejercicio (capa estructural, complementa las reglas semánticas existentes). Validado contra las 16 fichas reales publicadas: 0 errores.
- ✅ Import dinámico redundante en `selector.js` eliminado (lo señaló el propio build de Vite).
- ✅ Capacitor instalado y proyecto Android generado (`npx cap add android`), build separado (`npm run build:capacitor`) funcionando.

## 🔴 Pendiente de decisión — backend para progreso (REPLANTEAMIENTO.md)
El backup manual es un parche. Firebase/Supabase gratuito resolvería la pérdida de progreso de raíz y permitiría ver el progreso del niño desde tu móvil sin tocar la tablet. **Necesito tu sí/no antes de tocar esto.**

## ✅ Hecho — revisión completa de `validacion.js` regla por regla
No estaba "todo bien". Comparando el validador contra su propia especificación (`PROMPT-FICHAS.md`) aparecieron inconsistencias reales, **ya corregidas**:
1. ✅ Umbral de distribución de niveles corregido: antes avisaba con "3+3+2" (mucho más bajo que lo exigido), ahora avisa si se aleja del objetivo real del prompt (5·7·5).
2. ✅ Umbral de mínimo de ejercicios corregido: antes avisaba por debajo de 8, ahora por debajo de 15 (lo que exige `PROMPT-FICHAS.md:95`).
3. ✅ **Nuevo control: anti-sesgo de posición en EleccionMultiple.** No existía ninguna comprobación automática de la regla "⚠️ CRÍTICO" del prompt. Al aplicarlo contra las 16 fichas reales ya publicadas: **15 de 16 fichas incumplen esta regla** — la respuesta correcta se concentra sistemáticamente en la 2ª o 3ª opción (posición 2, en algunas fichas hasta el 62-88% de las veces) en vez de repartirse ~25% en cada posición. Es un problema real y medido, no teórico — un niño que juegue mucho podría aprender a adivinar por posición.
4. ✅ `ProblemaVisual` con `esNumerico:true` ahora avisa si además trae `opciones` sobrantes (contradice `PROMPT-FICHAS.md:429`).
5. ✅ Código muerto `aplanarEnGrid()` eliminado.
6. ✅ **Decisión tomada por ti**: la "ñ" ahora cuenta como letra distinta de "n" en las respuestas de RellenarHueco (antes "nino" contaba como correcto para "niño"). Corregido en los dos sitios donde existía esta lógica duplicada.

**Pendiente de tu decisión** (no es un bug, es contenido ya publicado): ¿corrijo a mano la posición de la respuesta correcta en las 15 fichas afectadas (cambio rápido de JSON, no hace falta regenerar nada con Claude), o lo dejamos para cuando generes/retoques contenido la próxima vez?

## 🟡 Pendiente — automatizar/mejorar la creación de fichas
- **La app YA comprueba fichas nuevas sola al abrirse** — verificado en [contentSync.js:98-99](src/datos/contentSync.js:98): `initContent()` llama a `checkAndSyncContent()` en segundo plano cada vez que se abre la app, sin que el usuario tenga que hacer nada. El botón "Comprobar contenido nuevo" del admin es solo para forzarlo manualmente si hay dudas. Con el arreglo del Service Worker de esta sesión, esto ahora es fiable de verdad.
- **NotebookLM + Claude, cómo combinarlos de verdad** (tu pregunta 2): no hay API oficial de NotebookLM, así que no se puede automatizar la extracción — pero sí hay un flujo manual con sentido:
  1. Sube el PDF/foto de la ficha del cole a NotebookLM.
  2. Genera su Quiz y sus Flashcards (cita la página exacta del PDF en cada respuesta — reduce el riesgo de que se invente algo que no está en el material).
  3. Copia ese Quiz/Flashcards como material de referencia EXTRA (junto al material original) en el chat de Claude Project, antes de pedir la generación de fichas.
  4. Claude genera el JSON con el prompt de siempre, pero ahora con dos fuentes cruzadas en vez de una — mejor cobertura de conceptos, menos huecos.
  Esto no requiere ningún cambio de código, es un cambio de proceso al generar contenido.
- **Sobre el JSON Schema y "nada de API"** (tu pregunta 4) — aclaración porque hubo un cruce: el JSON Schema con `ajv` que acabo de implementar **no tiene nada que ver con la API de pago de Claude**. Es 100% local: reemplaza/formaliza las reglas de validación que ya existían a mano en `validacion.js`, sigues generando contenido gratis en el chat de Claude Project igual que siempre, solo que ahora el validador que revisa lo que pegas es más riguroso y estándar. Cero relación con pagar por API.

## ✅ Hecho — vídeo de NotebookLM en la app (flujo completo)

**Vídeo — ya implementado y probado.** Flujo paso a paso:
1. En NotebookLM, sube el PDF/foto de la ficha del cole → Studio → **Video Overview** (gratis).
2. Descarga el vídeo generado.
3. Súbelo a YouTube como **"No listado"** (gratis, sin límite práctico, no aparece en búsquedas).
4. Copia el enlace del vídeo.
5. Añade el campo `"videoExplicacion": "https://youtu.be/TU-ID"` a la ficha en el JSON (al mismo nivel que `titulo`, `contenido`, etc.) — pídeselo a Claude directamente ("añade este campo a la ficha len-003") o edítalo a mano.
6. Publica igual que siempre (`npm run publicar` o desde "Importar fichas nuevas" en el admin, modo "Añadir" con el mismo ID de la ficha — sustituye la ficha entera, ejercicios incluidos).

En la app: se muestra incrustado dentro de `VisorFicha` (donde el niño lee la ficha antes de empezar), a pantalla ancha, sin anuncios ni vídeos sugeridos (usa `youtube-nocookie.com`). Verificado en navegador — funciona. Campo opcional: una ficha sin `videoExplicacion` no muestra nada, no rompe nada.

**Nota real sobre el offline**: el vídeo necesita conexión para verse (no se descarga dentro de la app, solo se enlaza) — el resto de la ficha y los ejercicios siguen funcionando 100% sin conexión igual que siempre.

**Cuestionarios/preguntas de NotebookLM — no hay forma de "pasarlos" automáticamente, no hay botón de exportar.** Lo que sí funciona, sin ningún cambio de código:
1. Genera el Quiz o las Flashcards en NotebookLM (Studio → Quiz / Flashcards).
2. Cópialos a mano (selecciona el texto en pantalla, copia) — NotebookLM no tiene botón oficial de "descargar como texto/JSON" para esto, solo para audio/vídeo.
3. Pégalos en el chat de Claude Project **como material de referencia adicional**, junto con el PDF/material original, antes de pedir que genere la ficha con `PROMPT-FICHAS.md`.
4. Claude usa ambas fuentes cruzadas para generar los 11 tipos de ejercicio de la app — el Quiz de NotebookLM no se usa "tal cual" (sus preguntas son de otro formato), sirve para que Claude no se deje conceptos importantes sin cubrir y para detectar si tu ficha inicial se dejó algo del material original.

Esto no es una limitación mía — es que NotebookLM en sí no ofrece ninguna vía automática para sacar el Quiz como datos. Si algún día Google añade exportación oficial de Quiz/Flashcards, ahí sí merecería la pena automatizarlo.

## 🟡 Investigado — NotebookLM: qué se puede sacar y cómo meterlo en la app
Investigado a fondo qué exporta NotebookLM y en qué formato ([fuentes abajo](#fuentes-notebooklm)):

- **Mind Map → Markdown**: función oficial de NotebookLM ("Copy as Markdown"), sin extensiones de terceros. Es la vía **más limpia y de más confianza** para pasarle estructura a Claude: generas el mapa mental del PDF en NotebookLM, lo copias como Markdown, y lo pegas en el chat de Claude Project junto al material original antes de pedir las fichas. Cero riesgo, cero código.
- **Quiz / Flashcards**: NotebookLM los genera bien (con cita a la página exacta del PDF), pero **no tiene botón oficial de exportar a texto/JSON** — solo se ven en pantalla. Existen extensiones de Chrome no oficiales que lo hacen, pero son de terceros sin garantía. Lo más fiable: copiar a mano las preguntas que te parezcan buenas y pegarlas en el chat de Claude como referencia adicional.
- **Audio Overview** (podcast): se descarga como WAV/MP3 con un botón oficial. Es contenido para escuchar, no texto — no aporta directamente al JSON de ejercicios, pero sí como material de repaso para el niño (ver abajo).
- **Video Overview** (nuevo desde marzo 2026, con IA generativa Gemini 3/Veo 3): convierte el PDF en un vídeo animado narrado, descargable. Gratis para todos los usuarios (la versión "Cinematic" de más calidad requiere suscripción de pago de Google, no necesaria aquí).

**¿Se pueden subir vídeos/audios de NotebookLM a la app?** Técnicamente sí, pero con un coste real que hay que sopesar:
- Los vídeos/audio pesan mucho más que el JSON de texto actual (todo el contenido de 16 fichas hoy son 172 KB; un solo vídeo de 2-3 min puede pesar 10-50 MB). Meter varios rompería el espíritu "ligero y offline-first" de la app.
- GitHub (donde vive el contenido hoy) no es buen sitio para archivos grandes — hay límites prácticos de tamaño por archivo.
- **La opción más razonable, si quieres esto**: no descargar el vídeo dentro de la app, sino enlazarlo. Subes el vídeo a YouTube como "no listado" (gratis, sin límite práctico) y añades un campo opcional a la ficha (`videoExplicacion: "url"`) que muestra un botón "🎬 Ver explicación" en `VisorFicha.jsx`. Eso sí necesita conexión para verlo (rompe el offline solo para ese vídeo concreto, el resto de la ficha sigue funcionando sin conexión). Es una función nueva, no la he implementado — dímelo si la quieres y la planificamos.

<a name="fuentes-notebooklm"></a>Fuentes: [Video Overview 2026](https://www.buildfastwithai.com/blogs/notebooklm-cinematic-video-overview-full-guide-2026) · [Audio Overview export](https://www.nlmtools.com/blog/notebooklm-download-audio-video) · [Mind Map a Markdown](https://xmind.com/blog/export-notebooklm-mind-map) · [Storage de vídeo offline](https://web.dev/articles/pwa-with-offline-streaming)

## 🟡 Pendiente — algoritmo de repaso espaciado (REPLANTEAMIENTO.md)
Los repasos a +3/+7/+14 días son fijos para todos. Un algoritmo tipo SM-2 ajustaría el intervalo según lo bien o mal que le fue al niño en cada ficha concreta — mejora de diseño pedagógico real, no cosmética.

## 🟡 Pendiente — riesgos de la migración a Capacitor (ANDROID-APK.md, AUDITORIA-CRITICA.md)
- Probar TTS (`BotonAudio`) y drag&drop (`@dnd-kit`) en tablet real tras compilar — pueden comportarse peor en WebView Android que en Chrome.
- Este equipo no tiene Android Studio/SDK instalado — hace falta instalarlo aquí, o compilar en la nube (GitHub Actions), para generar la APK final.

## 🟢 Pendiente — contenido
- Rellenar las 4 asignaturas vacías (Ciencias, Sociales, Inglés, Valores) — ahora con el prompt ya actualizado a 4º.

## 🟢 Descartado tras investigar (no aporta aquí)
- Migrar a H5P o a una plataforma tipo Blooket/Wayground — peor encaje que el motor propio.
- Headless CMS para editar contenido — no resuelve el cuello de botella real (generar bien, no editar después).
- API de Claude con "structured outputs" — de pago, contradice tu regla de "gratuito".
