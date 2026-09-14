# FUNCIONALIDADES

Estado por módulo/pantalla. ✅ terminado y funcional · ⚠️ funcional con matices · ❌ roto/no conectado · 🚧 a medias

## Pantallas

### PantallaInicio ✅ — [src/pantallas/PantallaInicio.jsx](src/pantallas/PantallaInicio.jsx)
Grid de 6 asignaturas con emoji/color, semáforo de precisión (🟢≥75% 🟡≥50% 🔴<50%, [línea 16-21](src/pantallas/PantallaInicio.jsx:16)) y nivel actual. Racha/XP en el header. Botón instalar PWA (usa `beforeinstallprompt`, con modal de instrucciones manuales para Family Link/Safari donde no hay prompt nativo). Acceso admin por PIN hardcodeado `1234` ([línea 23](src/pantallas/PantallaInicio.jsx:23)).

### PantallaFichas ✅ — [src/pantallas/PantallaFichas.jsx](src/pantallas/PantallaFichas.jsx)
Carga fichas de la asignatura desde IndexedDB, las pasa a `CaminoFichas`. Si la asignatura no tiene fichas, `CaminoFichas` muestra estado vacío ([CaminoFichas.jsx:49-56](src/components/CaminoFichas.jsx:49)) — aplica hoy a Ciencias, Sociales, Inglés y Valores.

### VisorFicha ✅ — [src/components/VisorFicha.jsx](src/components/VisorFicha.jsx)
Muestra contenido/ejemplos/palabras clave de la ficha con TTS. Al pulsar "listo" arma la sesión vía `selector.js` y crea el registro de sesión en IndexedDB.

### PantallaEjercicio ✅ — [src/pantallas/PantallaEjercicio.jsx](src/pantallas/PantallaEjercicio.jsx)
Header con progreso, chip "🔄 Repaso" si el ejercicio actual es parte del repaso rápido final, modal de confirmación al salir (pierde progreso de la sesión, no persistido parcialmente).

### PantallaResultado ✅ — [src/pantallas/PantallaResultado.jsx](src/pantallas/PantallaResultado.jsx)
Al montar, en un único `useEffect` (guardado idempotente vía flag `guardado`): actualiza `sessions`, `subject_stats`, recalcula nivel adaptativo, racha, XP, insignias y `ficha_progress` (con repaso espaciado +3/+7/+14 días la primera vez que se supera ≥70%). Insignia "todas las asignaturas" nunca se desbloquea de verdad — `sesionesAsig` está fijo a `1` ([línea 101](src/pantallas/PantallaResultado.jsx:101), comentario "will be properly counted in Phase 4").

### PantallaAdmin ✅ (con matices) — [src/pantallas/PantallaAdmin.jsx](src/pantallas/PantallaAdmin.jsx)
- Comprobar contenido nuevo → `checkAndSyncContent()`. ⚠️ Ver PENDIENTES: puede servir contenido cacheado obsoleto por el Service Worker.
- Actualizar app → desregistra SW + borra cachés + reload con `?_v=timestamp` ([línea 90-115](src/pantallas/PantallaAdmin.jsx:90)); usa `sessionStorage` para volver al panel admin tras recargar.
- Reiniciar progreso → doble-tap de confirmación, borra `ficha_progress`+`subject_stats`, resetea gamificación.
- Borrar contenido → doble-tap, `clearContent()` + re-sync si hay conexión.
- Detalle por asignatura → últimas 5 sesiones, precisión, intentos.
- No tiene ningún enlace a `PantallaImportar` — ver PENDIENTES.

### PantallaImportar ❌ no conectada — [src/pantallas/PantallaImportar.jsx](src/pantallas/PantallaImportar.jsx)
Componente completo y funcional en aislamiento (parsea JSON pegado, valida con `validacion.js`, importa con modo añadir/reemplazar) pero **ningún componente la importa ni la renderiza**. Ver PENDIENTES.

## Motor de ejercicios

### MotorEjercicio ✅ — [src/ejercicios/MotorEjercicio.jsx](src/ejercicios/MotorEjercicio.jsx)
Despacha por `ejercicio.tipo` a uno de los 11 componentes. Gestiona intentos, feedback visual (shake/flash), y logging (`logExercise`) tanto en acierto como tras 3 fallos. Si `tipo` no coincide con ninguno de los 11 conocidos, muestra placeholder "pendiente de implementar" ([línea 88-96](src/ejercicios/MotorEjercicio.jsx:88)) — solo se activaría por un dato con `tipo` mal escrito, no ocurre con el contenido actual.

### Los 11 tipos — todos ✅ funcionales, ninguno stub
| Tipo | Archivo | Nota |
|---|---|---|
| EleccionMultiple | [tipos/EleccionMultiple.jsx](src/ejercicios/tipos/EleccionMultiple.jsx) | 4 opciones, soporta emoji/SVG/imagen por opción |
| RellenarHueco | [tipos/RellenarHueco.jsx](src/ejercicios/tipos/RellenarHueco.jsx) | comparación normalizada (sin acentos/mayúsculas) |
| ArrastrarPalabras | [tipos/ArrastrarPalabras.jsx](src/ejercicios/tipos/ArrastrarPalabras.jsx) | drag&drop con `@dnd-kit`, soporta touch |
| OrdenarFrase | [tipos/OrdenarFrase.jsx](src/ejercicios/tipos/OrdenarFrase.jsx) | construcción por toques, no drag |
| UnirColumnas | [tipos/UnirColumnas.jsx](src/ejercicios/tipos/UnirColumnas.jsx) | selección por toques (no líneas dibujadas) |
| ClasificarGrupos | [tipos/ClasificarGrupos.jsx](src/ejercicios/tipos/ClasificarGrupos.jsx) | drag&drop a 2-3 contenedores |
| CompletarSerie | [tipos/CompletarSerie.jsx](src/ejercicios/tipos/CompletarSerie.jsx) | hueco `null` en cualquier posición |
| SopaLetras | [tipos/SopaLetras.jsx](src/ejercicios/tipos/SopaLetras.jsx) | ⚠️ sin ruta de fallo, ver PENDIENTES |
| MemoriaPareja | [tipos/MemoriaPareja.jsx](src/ejercicios/tipos/MemoriaPareja.jsx) | ⚠️ sin ruta de fallo, ver PENDIENTES |
| ProblemaVisual | [tipos/ProblemaVisual.jsx](src/ejercicios/tipos/ProblemaVisual.jsx) | emojis, SVG de barras, o respuesta numérica |
| ComprensionLectora | [tipos/ComprensionLectora.jsx](src/ejercicios/tipos/ComprensionLectora.jsx) | compone EleccionMultiple/RellenarHueco como subpreguntas |

### MediaRender ✅ — [src/ejercicios/MediaRender.jsx](src/ejercicios/MediaRender.jsx)
Renderiza imagen (`public/img/`) o SVG inline, en enunciados y opciones. Usa `dangerouslySetInnerHTML` para SVG — el contenido SVG viene del propio contenido generado por Claude/desarrollador, no de input de usuario final, riesgo XSS bajo pero real si algún día se abre a terceros.

## Gamificación y adaptación

### selector.js ✅ — [src/datos/selector.js](src/datos/selector.js)
`seleccionarEjercicios`: 80% ejercicios del nivel actual + 20% buffer de otros niveles, ponderados por `(1-precisión)*0.7 + recencia*0.3`, anti-repetición de tipo consecutivo, + 3 preguntas de repaso rápido al final.
`actualizarNivel`: sube de nivel si media de 2 últimas sesiones >80%, baja si <50%. Import dinámico de `db.js` dentro de la función ([línea 84](src/datos/selector.js:84)) pese a que el módulo ya se importa estáticamente arriba — inconsistencia de estilo, no bug.

### gamificacionStore ✅ — [src/store/gamificacionStore.js](src/store/gamificacionStore.js)
XP: 10/acierto + 5 si racha≥3 + 20 si precisión≥80%. Racha diaria por fecha de calendario. 7 insignias fijas ([PantallaResultado.jsx:19-26](src/pantallas/PantallaResultado.jsx:19)).

### validacion.js ✅ — [src/datos/validacion.js](src/datos/validacion.js)
Validador exhaustivo por tipo (errores duros + warnings de UX), usado tanto en `PantallaImportar` (no conectada) como en `scripts/publicar.js`. Es la única vía real por la que hoy se valida contenido nuevo, vía el script de publicación.

## Otros componentes

- **BotonAudio** ✅ — TTS con `SpeechSynthesisUtterance`, selecciona mejor voz disponible ES/EN, cancela al cambiar de pantalla ([App.jsx:32-34](src/App.jsx:32)).
- **CaminoFichas / NodoFicha** ✅ — camino visual estilo Duolingo, ola de posiciones, iconos por palabra clave, chip "EMPEZAR"/"Repasar". Soporta agrupar por `ficha.unidad` pero **ningún dato de contenido actual usa ese campo** — la sección de separadores nunca se renderiza con el contenido real.
- **Confeti / Modal / BarraProgreso** ✅ — sin lógica de negocio, presentacionales.
- **Service Worker** ⚠️ — ver PENDIENTES, desalineado con la arquitectura de contenido por asignatura.

## Pipeline de contenido (fuera de la app en runtime)

- `scripts/pdf-a-md.py` / `convertir-carpeta.py` ✅ — conversión PDF→MD vía MarkItDown, con fallback a "sube el PDF a Claude" si es escaneado.
- `PROMPT-FICHAS.md` ✅ — prompt de 4 fases (planificación/generación/validación/coherencia) muy detallado y específico por tipo de ejercicio. Contiene una inconsistencia interna: dice "3º de Primaria" en la introducción pero "Vocabulario de 2º Primaria" en la regla de pistas ([línea 143](PROMPT-FICHAS.md:143)).
- `scripts/publicar.js` ✅ — valida, funde con lo existente, versiona por asignatura, escribe 3 tipos de archivo, commit+push automático.
- `scripts/vaciar-contenido.js` ⚠️ — ver PENDIENTES, su comentario de comportamiento no coincide con lo que hace `contentSync.js`.
