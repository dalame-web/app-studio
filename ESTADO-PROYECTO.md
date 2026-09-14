# ESTADO DEL PROYECTO

Auditoría realizada 2026-09-11. Lectura completa de todo el código fuente, configs, scripts y contenido.

## Qué es

App web educativa offline-first (PWA), en migración a app Capacitor, para practicar ejercicios interactivos, dirigida a un niño de **4º de Primaria (9-10 años, España, currículo LOMLOE, colegio bilingüe)**. 6 asignaturas: Matemáticas, Lengua, Ciencias Naturales (en inglés), Ciencias Sociales (en inglés), Inglés, Valores Cívicos.

Sin backend: todo vive en el navegador (IndexedDB). El contenido (fichas + ejercicios) se descarga como JSON estático desde GitHub Pages y se sincroniza en segundo plano.

⚠️ **Resuelto por el usuario (2026-09-11)**: se creó para 3º Primaria, pero el niño ha pasado de curso → el contenido y los textos deben apuntar a **4º de Primaria**. README.md, index.html, app.webmanifest y PROMPT-FICHAS.md siguen diciendo "2º Primaria" (desactualizado de antes) o "3º Primaria" (el curso anterior) — hay que revisar y unificar todo a 4º en Fase 2. Ver PENDIENTES.md.

## Para quién

Un único perfil de alumno (se crea automáticamente, sin login). Un adulto usa el panel de administración (PIN `1234`) para ver progreso y gestionar contenido/actualizaciones.

## Qué existe (funcional)

- Flujo completo: Inicio → elegir asignatura → camino de fichas (estilo Duolingo) → ver ficha → sesión de ejercicios → resultado con XP/racha/insignias/subida de nivel.
- **11 tipos de ejercicio implementados y funcionales** (ninguno es placeholder).
- Dificultad adaptativa por asignatura (nivel 1-3), selección ponderada por historial.
- Gamificación: XP, racha diaria, insignias, estrellas por ficha.
- Progreso por ficha individual con repaso espaciado (+3d/+7d/+14d).
- PWA instalable, funciona offline tras primer arranque, Service Worker con caché.
- Sincronización de contenido por asignatura (descarga incremental) + botón manual "Actualizar app" que purga cachés/SW.
- Panel admin con semáforos de progreso por asignatura, detalle de sesiones, reset de progreso, borrado/redescarga de contenido.
- Pipeline de generación de contenido documentado end-to-end (PDF → Markdown → prompt Claude → JSON → `npm run publicar` → git push → GitHub Pages) en [PROMPT-FICHAS.md](PROMPT-FICHAS.md).

## Qué falta / está a medias

- **Contenido real**: solo Matemáticas (11 fichas) y Lengua (5 fichas) tienen fichas. Ciencias Naturales, Ciencias Sociales, Inglés y Valores Cívicos están **vacías** (0 fichas) — esas 4 asignaturas muestran "no hay fichas" en la app.
- **Importación manual de fichas desde el admin** ([PantallaImportar.jsx](src/pantallas/PantallaImportar.jsx)) está completamente construida pero **no está conectada a ningún sitio** — código muerto, nadie puede abrirla desde la UI.
- Bug de sincronización: el Service Worker puede servir contenido de asignaturas cacheado y obsoleto incluso al pulsar "Comprobar contenido nuevo" (ver PENDIENTES.md).
- El script `npm run vaciar` promete borrado automático en los dispositivos que su lógica actual no cumple.
- Contador de insignia "todas las asignaturas" está hardcodeado y nunca se puede desbloquear.
- Ver [PENDIENTES.md](PENDIENTES.md) para el detalle completo con archivo:línea.

## Documentos de esta auditoría

- [ARQUITECTURA.md](ARQUITECTURA.md) — stack, estructura de archivos, cómo se conectan las piezas.
- [FUNCIONALIDADES.md](FUNCIONALIDADES.md) — cada módulo/pantalla con su lógica y estado.
- [PENDIENTES.md](PENDIENTES.md) — todo lo pendiente/roto/a medias con ubicación exacta.
