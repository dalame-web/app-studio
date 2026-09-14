# PENDIENTES

Ordenado de más a menos impactante para el usuario final (el niño / el adulto admin).

## 1. Contenido real solo cubre 2.x de 6 asignaturas
*(Verificado 2026-09-14: `public/content/` ahora es un directorio por asignatura con un `.json` por ficha + `index.json`, no archivos planos — ver [[project_restructuracion_contenido_por_ficha]]. Matemáticas (11 fichas) y Lengua (5 fichas) siguen siendo las únicas completas; Ciencias Naturales tiene ya 1 ficha de prueba (`cie-001`). Ciencias Sociales, Inglés y Valores Cívicos: **0 fichas**.)* El niño puede tocar esas asignaturas vacías y solo verá "Todavía no hay fichas para esta asignatura" ([CaminoFichas.jsx:49-56](src/components/CaminoFichas.jsx:49)).

## 2. ~~Importación manual de fichas — no conectada a la UI~~ ✅ RESUELTO (Fase 2)
[PantallaImportar.jsx](src/pantallas/PantallaImportar.jsx) ahora se abre desde un botón "📥 Importar fichas nuevas" en [PantallaAdmin.jsx](src/pantallas/PantallaAdmin.jsx). Verificado en navegador.

## 3. ~~Service Worker desalineado con content/*.json~~ ✅ RESUELTO (Fase 2)
[public/sw.js](public/sw.js) ahora incluye `content/` en la lista network-first ([línea 41](public/sw.js:41)) y se subió a `edu-app-v5` para forzar refresco de caché en dispositivos con la v4 antigua.

## 4. ~~`npm run vaciar` no cumple lo que promete~~ ✅ RESUELTO (Fase 2)
`contentSync.js:checkAndSyncContent()` ahora borra localmente cualquier asignatura que ya no esté en `manifest.asignaturas` (nueva función `clearContentForSubject` + `getSyncedSubjects` en `db.js`), así que "vaciar" sí se propaga solo en la siguiente sincronización, sin depender de que el admin pulse "Borrar contenido" a mano.

## 5. SopaLetras y MemoriaPareja no tienen ruta de fallo
Ambos componentes solo reciben `onCorrecto` como prop desde `MotorEjercicio` (nunca llaman a `onIncorrecto`), así que nunca se registra un intento fallido para estos dos tipos:
- [SopaLetras.jsx:120-127](src/ejercicios/tipos/SopaLetras.jsx:120): botón "Terminar sopa de letras →" llama a `onCorrecto()` aunque el niño no haya encontrado ninguna palabra — se cuenta como acierto.
- [MemoriaPareja.jsx](src/ejercicios/tipos/MemoriaPareja.jsx): solo termina cuando se encuentran todas las parejas, no hay salida intermedia (esto es más aceptable como diseño, pero comparte la ausencia total de logging de fallos).

## 6. Insignia "todas las asignaturas" nunca se puede ganar
[PantallaResultado.jsx:101](src/pantallas/PantallaResultado.jsx:101): `const sesionesAsig = 1; // will be properly counted in Phase 4` — hardcodeado, el check de la insignia (`sesionesAsig >= 6`, [línea 23](src/pantallas/PantallaResultado.jsx:23)) jamás se cumple.

## 7. ~~Inconsistencia "2º Primaria" vs "3º Primaria"~~ ✅ RESUELTO (Fase 2)
El usuario confirmó: el niño ha pasado a **4º de Primaria**. Unificado a "4º Primaria" / "9-10 años" en README.md, index.html, public/app.webmanifest, PROMPT-FICHAS.md y los mensajes de aviso de `validacion.js`. Nota: las **16 fichas de contenido ya publicadas** (11 matemáticas + 5 lengua) se generaron con el prompt de 3º — quedan correctas como repaso, pero el contenido *nuevo* que se genere a partir de ahora ya usará el prompt actualizado a 4º.

## 8. Feature "unidad" en el camino visual, sin datos que la usen
[CaminoFichas.jsx](src/components/CaminoFichas.jsx) soporta agrupar fichas por `ficha.unidad` mostrando banners separadores ([líneas 61-68](src/components/CaminoFichas.jsx:61) y [103-129](src/components/CaminoFichas.jsx:103)). Ninguna ficha de `public/content/*.json` tiene ese campo hoy — la funcionalidad existe pero nunca se activa con el contenido real. No es un bug, pero es capacidad construida por delante de los datos.

## 9. Dos archivos llamados "manifest" con roles distintos
`public/manifest.json` = manifest de contenido/versión (consumido por `contentSync.js`). `public/app.webmanifest` = manifest de PWA (enlazado desde `index.html`, iconos/nombre/theme). Nombres casi idénticos, alto riesgo de que un futuro cambio (propio o de un asistente de código) edite el que no toca. Solo relevante si se decide tocar código; documentado aquí para que quede constancia.

## 10. Documentación desactualizada (no afecta al runtime, sí a quien retome el proyecto)
- [README.md](README.md) dice React 18 / Vite 5; `package.json` real tiene React 19.2.6 / Vite 8.0.12.
- La memoria previa del proyecto decía "8 stores" en IndexedDB; hoy son 9 (`ficha_progress` se añadió en la migración v2, [db.js:34-39](src/datos/db.js:34)).

## 11. Hallazgos menores (detectados al re-verificar con /grill-me)
- **Warning de contenido ya publicado**: `validarFicha` (el mismo validador de `scripts/publicar.js`) marca `mat-001-ex-014` — la respuesta `"1"` no aparece en contenido/ejemplos/palabrasClave de la ficha "La moda", así que el niño no tiene forma de deducirla solo con la ficha. `publicar.js` no bloquea por warnings (solo por errores), así que esto pasó a producción. Verificado ejecutando `validarImportacion()` sobre el JSON real.
- **Assets sin usar**: `src/assets/hero.png` y los `react.svg`/`vite.svg` por defecto de la plantilla Vite no tienen ninguna referencia en `src/` (verificado con grep). Housekeeping menor, no afecta funcionalidad.
- **Soporte de imagen/SVG en ejercicios, casi sin usar**: de 27 ejercicios en el contenido publicado, solo 1 usa `imagenEnunciado`/`svgEnunciado` (en matemáticas; lengua no usa ninguno). La capacidad está bien construida ([MediaRender.jsx](src/ejercicios/MediaRender.jsx)) pero el contenido real apenas la aprovecha — no es un bug, es una oportunidad de contenido futuro.
- **Límite de este análisis**: esta auditoría es de solo-lectura de código y ejecución puntual de scripts en Node (validador, conteos) — no se abrió la app en navegador ni se probó el flujo real de Service Worker/caché. El hallazgo #3 (SW sirviendo contenido obsoleto) está fundamentado en lectura de código (rutas que sí/no matchean en `sw.js`), no en una reproducción en devtools. Confianza alta por la claridad del código, pero queda pendiente de confirmar en dispositivo real si se quiere evidencia 100% directa.

## Hecho en Fase 2 (además de #2, #3, #4 arriba)
- **Backup/restaurar progreso** — botones "💾 Exportar progreso" / "📂 Importar progreso" en el admin (`exportarProgreso`/`importarProgreso` en [db.js](src/datos/db.js)). Cubre el riesgo señalado en AUDITORIA-CRITICA.md sección B.
- **Error Boundary** — [src/components/ErrorBoundary.jsx](src/components/ErrorBoundary.jsx), envuelve `<App/>` en [main.jsx](src/main.jsx). Ya no hay pantalla en blanco ante un fallo.
- **Tests unitarios** — Vitest + 27 tests para `validacion.js` y los helpers puros de `selector.js` (`npm run test`).

## No encontrado / descartado tras revisión
- Los 11 tipos de ejercicio están completos, ninguno es placeholder real (el placeholder de "tipo pendiente de implementar" en `MotorEjercicio.jsx:88-96` es código defensivo para un `tipo` inválido, no un tipo real sin construir).
- No hay backend ni credenciales que auditar — todo el "servidor" es GitHub Pages sirviendo JSON estático.
