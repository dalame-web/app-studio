# ARQUITECTURA

## Stack real (verificado en `package.json`, no en README)

- React **19.2.6** (README dice React 18 — desactualizado)
- Vite **8.0.12** (README dice Vite 5 — desactualizado)
- Tailwind CSS 3.4.19
- Zustand 5.0.14 (estado global, sin persistencia — todo lo persistente va a IndexedDB)
- `idb` 8.0.3 (wrapper de IndexedDB)
- `@dnd-kit/core` + `@dnd-kit/utilities` (drag & drop táctil)
- Sin React Router: la navegación es un string de estado (`pantallaActual`) en Zustand.
- ESLint 10 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`.

## Estructura de carpetas

```
src/
  App.jsx                 — router manual por pantallaActual; init de IndexedDB + sync de contenido
  main.jsx                — entrypoint; registra el Service Worker
  store/
    sesionStore.js         — Zustand: navegación + estado de la sesión de ejercicios en curso
    gamificacionStore.js   — Zustand: XP, racha, insignias (lee/escribe IndexedDB)
  datos/
    db.js                  — toda la capa IndexedDB (idb): profiles, logs, stats, content, progreso
    contentSync.js         — descarga/sincroniza fichas+ejercicios desde public/content/*.json
    selector.js            — algoritmo de selección adaptativa de ejercicios por sesión
    validacion.js          — validador de fichas/ejercicios (usado en import manual y en scripts/publicar.js)
  pantallas/
    PantallaInicio.jsx      — home, grid de asignaturas, semáforos, PIN admin, instalar PWA
    PantallaFichas.jsx      — camino visual de fichas de una asignatura (usa CaminoFichas)
    PantallaEjercicio.jsx   — contenedor de la sesión activa (usa MotorEjercicio)
    PantallaResultado.jsx   — pantalla post-sesión: guarda stats, XP, nivel, insignias
    PantallaAdmin.jsx       — panel admin: stats, sync manual, reset, borrar contenido
    PantallaImportar.jsx    — importación manual de JSON, conectada desde PantallaAdmin (ver PENDIENTES.md #2, resuelto)
  editor/                   — [NO DOCUMENTADO EN ESTA AUDITORÍA, verificado 2026-09-14] editor visual local de fichas,
                               entrypoint propio `editor.html`/`src/editor-main.jsx` (fuera del build de la app, no en PantallaAdmin)
  components/
    VisorFicha.jsx, CaminoFichas.jsx, NodoFicha.jsx, BarraProgreso.jsx,
    BotonAudio.jsx (TTS), Confeti.jsx, Modal.jsx
  ejercicios/
    MotorEjercicio.jsx     — despacha al componente según ejercicio.tipo, gestiona intentos/feedback/logging
    ChipInstruccion.jsx, MediaRender.jsx, instrucciones.js
    tipos/                 — 11 componentes, uno por tipo de ejercicio (ver FUNCIONALIDADES.md)

public/
  ejercicios.json          — archivo único legacy (retrocompatibilidad, se sigue generando)
  manifest.json            — manifest de CONTENIDO (versión por asignatura) — NO confundir con...
  app.webmanifest          — manifest de PWA (nombre/iconos/theme) — este es el que enlaza index.html
  content/{subject}.json   — fichas+ejercicios por asignatura (fuente real que consume la app)
  sw.js                    — Service Worker (caché offline)
  img/                     — imágenes para ejercicios (imagenEnunciado)

scripts/
  publicar.js              — valida + escribe ejercicios.json/content/*.json/manifest.json + git commit/push
  vaciar-contenido.js       — vacía ejercicios.json y manifest.json, commit/push
  pdf-a-md.py, convertir-carpeta.py — PDF → Markdown (para alimentar el prompt de Claude)

PROMPT-FICHAS.md           — prompt completo para generar fichas con Claude Project (gratuito)
```

## Cómo se conectan las piezas

1. **Arranque** ([App.jsx:36-55](src/App.jsx:36)): `initContent()` sincroniza contenido → se crea/recupera el perfil por defecto ([db.js:61-65](src/datos/db.js:61)) → se carga gamificación → se decide la pantalla.
2. **Navegación**: no hay rutas URL. `useSesionStore.pantallaActual` decide qué pantalla renderiza `App.jsx` ([App.jsx:59-68](src/App.jsx:59)). Cambiar de pantalla es `irA('nombre')`.
3. **Contenido**: `public/manifest.json` lista la versión de cada asignatura → `contentSync.js` descarga solo las asignaturas con versión nueva → `db.js:storeContent()` hace upsert en IndexedDB (stores `fichas` y `ejercicios`) sin borrar otras asignaturas.
4. **Sesión de ejercicios**: `VisorFicha` llama a `selector.js:seleccionarEjercicios()` (pondera por nivel + historial de aciertos + recencia) → guarda sesión en IndexedDB → `sesionStore.iniciarSesion()` → `PantallaEjercicio` renderiza `MotorEjercicio`, que despacha al componente de tipo correspondiente y registra cada intento con `logExercise()`.
5. **Cierre de sesión** ([PantallaResultado.jsx](src/pantallas/PantallaResultado.jsx)): actualiza `subject_stats`, recalcula nivel adaptativo (`selector.js:actualizarNivel`), actualiza racha/XP/insignias, actualiza `ficha_progress` (con fechas de repaso espaciado si se supera por primera vez).
6. **Publicación de contenido nuevo** (offline del flujo de la app, lo hace el desarrollador): PDF → `pdf-a-md.py` → pegar en Claude Project con `PROMPT-FICHAS.md` → JSON generado → `npm run publicar` (valida con `validacion.js`, funde con lo existente, escribe los 3 tipos de archivo, commit + push) → GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) construye y despliega a GitHub Pages → los dispositivos detectan versión nueva en su próxima sincronización.

## IndexedDB (`db.js`, DB `edu-app`, versión 2)

9 object stores: `profiles`, `exercise_log`, `sessions`, `subject_stats`, `gamificacion`, `content_version`, `fichas`, `ejercicios`, `ficha_progress` (este último añadido en v2, migración condicional por `oldVersion`).

## Despliegue

`git push` a `main` → GitHub Actions (`npm ci` + `npm run build`) → GitHub Pages, base path `/app-studio/` (ver [vite.config.js:12](vite.config.js:12)). Sin pasos manuales.
