> **DESACTUALIZADO (verificado 2026-09-14):** este documento recomendaba TWA sobre Capacitor. El usuario decidió Capacitor igualmente (quiere ir añadiendo funciones nativas con el tiempo) y la migración ya está en marcha: `@capacitor/core`+`cli`+`android` instalados, `capacitor.config.json`, carpeta `android/` con proyecto Gradle completo y `dist-capacitor/` generado. **Sin commitear a git todavía** (todo aparece como untracked). Android Studio + SDK están instalados en la máquina (`C:\Program Files\Android\Android Studio`, SDK en `%LOCALAPPDATA%\Android\Sdk` con platforms/build-tools/platform-tools) pero `ANDROID_HOME`/`JAVA_HOME` no están configurados como variables de entorno — falta ese paso para poder compilar por CLI (`npx cap sync` / `./gradlew assembleDebug`). El contenido empaquetado dentro de `android/app/src/main/assets/public/content/` está desactualizado (formato plano `matematicas.json`/`lengua.json` de antes de la restructuración por ficha) — hace falta un `cap sync` nuevo antes de compilar. La info de Family Link de abajo sigue siendo válida y aplica igual a un APK de Capacitor.
>
> # Empaquetar como APK para tablet — investigación

Contexto: hoy la app se instala como PWA (botón "Instalar app" en [PantallaInicio.jsx:120-128](src/pantallas/PantallaInicio.jsx:120), con modal de instrucciones manuales para Family Link/Safari en [líneas 160-195](src/pantallas/PantallaInicio.jsx:160) — el desarrollador anterior ya sabía que Family Link daba problemas). El usuario quiere una APK real para tablet y necesita saber si Family Link la bloquea.

## Family Link — cómo afecta realmente

- Family Link **no bloquea la instalación de PWAs ni de APKs por sí sola**. Bloquea la opción "Instalar apps de origen desconocido" del sistema, y esa opción está gestionada **desde el móvil del padre/madre**, no desde la tablet del niño: Family Link (app del padre) → seleccionar el niño → **Dispositivo → Configuración → Apps de fuentes desconocidas**. Ahí se puede autorizar temporalmente el navegador o el gestor de archivos para instalar un APK.
- Conclusión práctica: **no está "capada" de forma permanente**. Requiere que el adulto (tú) lo autorice una vez desde tu propio Family Link, instale el APK, y opcionalmente lo vuelva a bloquear después.
- Si en cambio se distribuye vía **Play Store** (ver más abajo), Family Link gestiona la aprobación de instalación de forma nativa y sin tocar ajustes de "origen desconocido" — es el flujo que Family Link espera y documenta.

## Opciones de empaquetado (de menos a más esfuerzo)

### A. Seguir como PWA (lo que hay hoy) — coste: 0
Ya funciona. Limitación real: en tablets con Family Link, el icono de "añadir a inicio" no siempre aparece como una instalación gestionable por Family Link (puede no figurar en su lista de apps con límites de tiempo), y la UX de instalación varía por navegador. Es la opción más barata pero es la que el usuario ya describe como insatisfactoria.

### B. TWA (Trusted Web Activity) + APK sideload — coste: bajo, sin dependencias de pago
Herramienta: **Bubblewrap** (CLI oficial de Google) o **PWABuilder** (web, más simple, genera el paquete en la nube). Ambas envuelven la PWA existente usando el motor de Chrome — **no reescriben la app, cero cambios de código necesarios** más allá de cumplir un mínimo de PWA (manifest + service worker + HTTPS), que esta app **ya cumple** ([public/app.webmanifest](public/app.webmanifest), [public/sw.js](public/sw.js), servido por GitHub Pages en HTTPS).
- Tamaño resultante: ~800 KB (vs ~4 MB de un wrapper tipo Capacitor).
- Se instala transfiriendo el `.apk` a la tablet (USB, enlace de descarga, Drive) y activando "instalar apps desconocidas" para el navegador/gestor de archivos — requiere el paso de Family Link descrito arriba, una vez.
- Sin `assetlinks.json` verificado, Chrome puede mostrar una barra de dirección mínima en la app (se ve "casi nativa" pero no 100%). Con `assetlinks.json` publicado en `public/.well-known/assetlinks.json` (Vite copia `public/` tal cual al build, esto no debería requerir cambios de arquitectura) se consigue pantalla completa real.
- Requiere: cuenta de Google normal, ningún pago, ninguna revisión de Google.

### C. TWA + Google Play Console (internal testing) — coste: 25$ únicos + más pasos
Mismo paquete TWA de la opción B, pero distribuido a través de Play Store en modo **prueba interna** (hasta 100 testers, invitación por email, sin revisión pública, no aparece en el Play Store público). Es el flujo que Family Link entiende de forma nativa: el niño "instala una app del Play Store" y tú la apruebas desde Family Link como cualquier otra app.
- Requisitos: cuenta de desarrollador de Google Play (pago único de 25$), política de privacidad (una página simple basta), Lighthouse PWA score ≥80 (la app ya tiene manifest+SW+iconos 192/512/512 maskable, muy probablemente lo cumple — pendiente de medir), `assetlinks.json` para verificar el dominio.
- Al declarar "target audience" en Play Console, si se marca como app dirigida a niños se activan políticas adicionales (Google Play Families Policy: sin anuncios personalizados, política de privacidad reforzada). Para una app privada de prueba interna con un único usuario (tu hijo) esto es gestionable, pero es más papeleo que la opción B.

### D. Reescribir con Capacitor u otro wrapper nativo — no recomendado aquí
Capacitor permite empaquetar cualquier web (no exige PWA completa) pero genera un runtime propio (~4 MB) y no aporta nada que TWA no dé ya, puesto que la app **ya es una PWA completa**. Solo tendría sentido si en el futuro se necesitan APIs nativas que un TWA no expone (cámara avanzada, notificaciones push nativas, etc.), que hoy no es el caso.

## Recomendación

**No hace falta rehacer la app.** La arquitectura actual (React+Vite+PWA con manifest y Service Worker) ya es justo lo que Bubblewrap/PWABuilder necesitan. El camino más simple que resuelve la queja real ("se instala desde una app externa") es:

1. Corregir primero los bugs de sincronización de contenido/Service Worker (ver PENDIENTES.md #3, #4) — empaquetar en APK un Service Worker con bugs solo los empaqueta también.
2. Generar el TWA con **PWABuilder** (más simple que Bubblewrap CLI, interfaz web, genera `.apk` y `.aab`).
3. Empezar por la **opción B (sideload directo)** para probar en la tablet real sin coste ni cuenta de desarrollador.
4. Si el resultado convence y se quiere una instalación "de verdad como una app del Play Store" gestionada por Family Link sin tocar ajustes de seguridad cada vez → subir a **opción C (Play Console internal testing)**, pago único de 25$.

## Fuentes
- [Bubblewrap — freeCodeCamp](https://www.freecodecamp.org/news/how-to-convert-your-website-into-an-android-app-using-bubblewrap/)
- [Bubblewrap vs Capacitor — Flex](https://www.flex.com.ph/articles/bubblewrap-vs-capacitor-my-2-year-test-results)
- [TWA vs Capacitor 2026 — SaaSToStore](https://saastostore.com/blog/twa-vs-capacitor)
- [Publicar PWA en Play Store con PWABuilder — MobiLoud](https://www.mobiloud.com/blog/publishing-pwa-app-store/)
- [PWABuilder Android platform docs](https://blog.pwabuilder.com/docs/android-platform/)
- [pwabuilder-google-play (GitHub)](https://github.com/pwa-builder/pwabuilder-google-play)
- [Family Link y apps de fuentes desconocidas — WhitelistVideo](https://whitelist.video/blog/apps-from-unknown-sources-family-link)
- [Unknown Sources bloqueado por Family Link — Boomerang](https://community.useboomerang.com/hc/en-us/articles/360025964892-Unknown-Sources-is-blocked-by-Administrator-Google-Family-Link-installed)
- [Google Play Families Policies](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- [Target audience and content — Play Console Help](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en-GB)
- [Google Play internal testing](https://play.google.com/console/about/internal-testing/)
