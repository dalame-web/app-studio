# AUDITORÍA CRÍTICA — segunda pasada

No repite lo ya listado en PENDIENTES.md (Fase 1). Esto es: (A) lo que investigué sobre Capacitor específicamente para ESTE stack, con riesgos reales verificados por fuentes, y (B) problemas que no había marcado en la primera pasada porque no eran "bugs" sino carencias de diseño. Tono directo, como se pidió.

## A. Riesgos concretos de pasar a Capacitor (investigados, no supuestos)

### 🔴 Riesgo real y serio: pérdida de progreso del niño
Toda la app guarda todo (XP, racha, insignias, progreso por ficha, historial) **solo en IndexedDB del dispositivo**. Nunca sale de ahí. Investigando cómo se comporta IndexedDB dentro de un WebView de Android (que es lo que usa Capacitor por debajo): el sistema puede **evictar (borrar) el storage bajo presión de espacio**, y `navigator.storage.persist()` — la API pensada para evitar justo eso — **frecuentemente no hace nada dentro de un WebView** ([fuente: discusión oficial de Capacitor](https://github.com/ionic-team/capacitor/issues/7594), [MDN sobre eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
**Traducido**: si la tablet se queda sin espacio, o el sistema hace limpieza, o alguien "libera espacio" desde ajustes de Android → el niño puede perder TODO su progreso sin aviso. Esto ya es un riesgo hoy con la PWA, pero pasa a ser más relevante porque una app instalada como "app de verdad" invita a confiar más en que los datos son permanentes.
**Esto no lo arregla Capacitor por sí solo.** Hay que decidir una estrategia de backup (ver sección de mejoras).

### 🟡 Service Worker: sobra en el build nativo (y esto es buena noticia)
Los Service Workers no hacen falta en apps Capacitor nativas porque Capacitor ya empaqueta todos los assets dentro del APK — no hay "red" de la que servir caché ([fuente](https://github.com/ionic-team/capacitor/discussions/3205), doc oficial de Capacitor sobre PWA). Además en iOS los SW dan problemas de registro dentro de WKWebView.
**Consecuencia práctica para este proyecto**: el bug #3 de PENDIENTES.md (SW sirviendo `content/*.json` obsoleto) **deja de existir en el build Capacitor**, porque ahí no habrá Service Worker interceptando nada — los `fetch()` de `contentSync.js` irán directos a red. Hay que decidir cómo se actualiza el contenido sin SW: lo más simple es mantener exactamente lo que ya hace `contentSync.js` (fetch directo al manifest + JSON por asignatura), que ya funciona sin depender del SW para nada. No hace falta reescribir esa parte.

### 🟡 Text-to-Speech (botón de audio) puede sonar distinto o no funcionar igual
`BotonAudio.jsx` usa la Web Speech API del navegador (`speechSynthesis`). Dentro de un WebView de Android empaquetado, la disponibilidad y calidad de voces es más limitada e inconsistente que en Chrome normal — es una app del sistema Android (el motor TTS instalado), no del navegador. Existen plugins de Capacitor dedicados a esto (`@capacitor-community/text-to-speech`, `@capawesome-team/capacitor-speech-synthesis`) que hablan directamente con el motor TTS nativo de Android de forma más fiable.
**Recomendación**: probar el TTS actual tal cual en la tablet real tras empaquetar. Si suena mal o falla, cambiar a un plugin nativo — es un cambio acotado (solo afecta a `BotonAudio.jsx`).

### 🟡 Drag & drop (`@dnd-kit`) tiene problemas conocidos en Android, sobre todo Samsung
Hay issues abiertos y confirmados en el propio repo de dnd-kit sobre gestos táctiles que no se detectan o se confunden con scroll en ciertos Android, mayormente Samsung ([issue #1955](https://github.com/clauderic/dnd-kit/issues/1955), [issue #458](https://github.com/clauderic/dnd-kit/issues/458)). Esto afecta a `ArrastrarPalabras.jsx` y `ClasificarGrupos.jsx`, que ya usan `TouchSensor` con `delay:150`. La recomendación de la comunidad es fijar `touch-action: manipulation` en los elementos arrastrables — hoy el código usa `touchAction: 'none'` ([ArrastrarPalabras.jsx:11](src/ejercicios/tipos/ArrastrarPalabras.jsx:11)), que es una opción también válida pero conviene probar ambas en la tablet real de destino, porque el comportamiento varía por fabricante.

### 🟢 Migración en sí: bajo riesgo técnico
Capacitor + Vite es una combinación estándar y bien documentada: `capacitor.config.ts` con `webDir: 'dist'`, instalar `@capacitor/core` `@capacitor/cli` `@capacitor/android`, y — importante — poner `base: './'` en `vite.config.js` para que las rutas de los assets sean relativas (ahora mismo el proyecto usa `base: '/app-studio/'` en build, pensado para GitHub Pages; para Capacitor hace falta una config de build distinta) ([fuente](https://www.otakit.app/blog/vite-app-to-ios-android-with-capacitor)). No requiere reescribir componentes.

## B. Carencias de diseño que no había marcado como "bug" en Fase 1

### 🔴 Cero tests automatizados en todo el proyecto
Verificado: no existe ni un solo archivo `*.test.*` / `*.spec.*` fuera de `node_modules`. La lógica más delicada de la app — `validacion.js` (400 líneas de reglas por tipo de ejercicio) y `selector.js` (algoritmo de selección adaptativa) — es lógica pura, fácil y barata de testear, y hoy no tiene ni una sola comprobación automática. Un cambio futuro (tuyo o de un asistente de código) puede romper una regla de validación sin que nadie se entere hasta que falle en producción con un ejercicio real.

### 🔴 Sin Error Boundary — un fallo cualquiera deja pantalla en blanco
No existe ningún `componentDidCatch`/`ErrorBoundary` en toda la app (verificado). Si cualquier componente lanza una excepción — un ejercicio mal formado, un `undefined` inesperado — React desmonta el árbol entero y el niño ve una pantalla en blanco, sin ningún mensaje. Para una app usada por un niño de 8-10 años sin supervisión constante, esto es un problema de usabilidad real, no solo técnico.

### 🟡 Sin backup/exportación del progreso
Ligado al riesgo de Capacitor de la sección A: no hay ninguna forma de sacar el progreso de la app (ni manual ni automática). Si se cambia de tablet, se resetea de fábrica, o se pierde el dispositivo, el progreso desaparece sin remedio. `db.js` ya tiene `exportarContenidoCompleto()` pero es para exportar el **contenido** (fichas/ejercicios), no el **progreso del niño**.

### 🟡 Perfil único, sin selector real
El código soporta múltiples perfiles en el modelo de datos (`createProfile`, `getAllProfiles`) pero `getOrCreateDefaultProfile()` ([db.js:61-65](src/datos/db.js:61)) siempre coge el primero que exista y no hay ninguna UI para crear o cambiar de perfil. Si algún día hay que soportar a otro hijo (o el mismo niño con dos dispositivos con progreso distinto), hoy no se puede.

### 🟡 PIN de admin trivial de saltarse
El PIN `1234` está hardcodeado en texto plano en el bundle de JavaScript ([PantallaInicio.jsx:23](src/pantallas/PantallaInicio.jsx:23)). En una web es inspeccionable con devtools; en una APK es extraíble descompilando el paquete en segundos. Para un niño de 8-10 años es una barrera suficiente (no sabe inspeccionar código), pero como dato: no es seguridad real, es una fricción de UX. No hace falta arreglarlo si el único "adversario" es el propio niño, pero hay que ser consciente de que no protege nada frente a alguien con mínima curiosidad técnica.

### 🟡 `dangerouslySetInnerHTML` para SVG sin sanitizar
`MediaRender.jsx` ([línea 14](src/ejercicios/MediaRender.jsx:14)) y `EleccionMultiple.jsx` inyectan el SVG de los ejercicios directamente en el DOM sin pasar por ningún sanitizador. Hoy el único origen de ese SVG eres tú generándolo con Claude y pegándolo vía `npm run publicar` — riesgo bajo en la práctica. Pero si algún día se activa la importación desde el admin (`PantallaImportar.jsx`, hoy desconectada) o se acepta contenido de una fuente menos controlada, es una vía directa de XSS.

### 🟡 Accesibilidad no es un criterio de diseño hoy
Hay algunos `aria-label` puntuales (botones de volver, audio) pero no hay `aria-live` para anunciar acierto/fallo a un lector de pantalla, no se ha auditado contraste de color, y no hay soporte pensado para un niño con alguna necesidad especial (lector de pantalla, alto contraste, tamaño de texto). Para una app educativa esto suele pagarse mejor si se diseña desde el principio que si se añade después — no es urgente si el único usuario hoy no lo necesita, pero es una limitación real a tener en cuenta si la app crece.

## C. Funcionalidades nuevas que valdría la pena añadir

Priorizadas por relación esfuerzo/valor, no solo "porque sí":

1. **Backup de progreso exportable/restaurable** (botón en admin: exportar todo `exercise_log`+`subject_stats`+`gamificacion`+`ficha_progress` a un JSON descargable, e importar de vuelta). Barato de construir con lo que ya existe en `db.js`, resuelve el riesgo más serio de la sección A.
2. **Error Boundary con mensaje amigable** ("¡Ups! Vamos a recargar 🔄" + botón) envolviendo `<App />`. Coste mínimo, evita pantallas en blanco.
3. **Tests unitarios de `validacion.js` y `selector.js`** con Vitest (encaja natural con Vite, cero config adicional). No es glamuroso pero es lo que más protege el proyecto a medio plazo.
4. **Conectar `PantallaImportar` al admin** (o borrarla) — ya estaba en el plan de Fase 2, lo reafirmo aquí como parte de "hacerla funcional de verdad".
5. **Notificación/recordatorio diario** (con Capacitor sí es viable de forma nativa y fiable, con PWA pura es limitado) — para fomentar la racha diaria sin depender de que el niño se acuerde solo.
6. **Selector real de perfil** — solo si hay planes de más de un niño usando la app; si no, no merece la pena el esfuerzo ahora.

## Resumen — ¿qué cambia esto del plan anterior?

- Se mantiene: TWA descartado, vamos con Capacitor.
- Se añade al plan de Fase 2: backup de progreso (nuevo #1 en prioridad, antes incluso que Capacitor — sin esto, empaquetar en Capacitor aumenta el riesgo real de perder datos del niño), Error Boundary, tests mínimos de la lógica pura, decisión sobre TTS/dnd-kit tras primera build de prueba en tablet real.
- Se descarta explícitamente por ahora (esfuerzo no justificado hoy): sanitizar SVG (riesgo bajo mientras solo tú generas contenido), selector de multi-perfil, accesibilidad completa WCAG.
