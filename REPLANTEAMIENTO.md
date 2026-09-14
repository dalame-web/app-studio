# REPLANTEAMIENTO COMPLETO — ¿es esto lo correcto, o solo lo que ya había?

Petición explícita: no dar nada por sentado, cuestionar la app entera, no solo parchear. Cada punto tiene veredicto + por qué, con investigación real detrás, no intuición.

## 1. ¿Motor de ejercicios propio, o usar una plataforma/estándar ya hecho?

**Considerado**: H5P (estándar abierto de contenido interactivo, usado en Moodle), Blooket, Wayground/Quizizz (plataformas de quiz gamificado para clase).

**Veredicto: mantener el motor propio.** Y no por pereza — verificado:
- Blooket/Wayground están pensadas para **sesiones de clase o deberes con cuenta online**, no para práctica diaria offline de un solo niño con progreso persistente por ficha. El plan gratuito de Wayground limita a 20 actividades guardadas ([fuente](https://triviamaker.com/quizizz-alternatives/)) — con 16 fichas ya casi lo agotas, y el proyecto va a crecer.
- Ninguna de las dos soporta el modelo real de esta app: 11 tipos de ejercicio con reglas pedagógicas específicas del material exacto del cole, nivel adaptativo por asignatura, repaso espaciado por ficha, todo offline. Adaptarían peor tu contenido de lo que tu motor ya lo hace.
- H5P sí valida que "JSON para contenido interactivo" es el camino correcto (ya lo confirmé la vez anterior), pero integrarlo significaría envolver un reproductor genérico y reconstruir alrededor toda la gamificación/progreso que ya tienes funcionando — más trabajo que mantener lo que ya está probado y funciona (Fase 1: los 11 tipos están completos, ninguno es placeholder).

## 2. ¿Sin backend (solo IndexedDB), o añadir uno ligero? — esto SÍ cambia la recomendación anterior

Esto es lo más importante que salió de replantear en serio. En la sesión anterior "arreglé" el riesgo de pérdida de progreso con un botón de exportar/importar manual. Es un parche. Investigando la alternativa real:

**Firebase o Supabase, plan gratuito, para este tamaño de app: coste 0€, y resuelve el problema de raíz en vez de parchearlo.**
- El progreso de un solo niño pesa unos KB. Los límites gratuitos (Supabase: 500 MB de base de datos; Firebase: lecturas/escrituras diarias generosas) están a años luz de ser un problema aquí ([fuente](https://agentdeals.dev/supabase-vs-firebase)).
- Firebase en concreto tiene sincronización offline-first madura de fábrica: la tablet sigue funcionando 100% sin conexión, y cuando hay wifi sincroniza sola con la nube ([fuente](https://designrevision.com/blog/supabase-vs-firebase)) — es literalmente el patrón que esta app ya sigue a mano con IndexedDB, pero con una copia de seguridad automática en la nube que el usuario no tiene que acordarse de generar.
- Con esto, el riesgo real que señalé (WebView de Android puede evictar IndexedDB) deja de importar: aunque se borre el dispositivo, el progreso vive también en la nube.
- Bonus real: **tú podrías ver el progreso de tu hijo desde tu propio móvil**, sin tocar la tablet — hoy eso no existe, solo se ve entrando al panel admin de la tablet con el PIN.

**Coste de esto**: una cuenta de Google/Supabase, configurar reglas de seguridad, y aceptar una dependencia externa más (aunque gratuita). No es gratis en tiempo de configuración, sí en dinero.

**Mi recomendación honesta**: hazlo. El backup manual que construí la sesión pasada es mejor que nada, pero es un parche sobre un problema que un backend gratuito resuelve de raíz. Si no quieres la dependencia externa, el backup manual se queda como está — pero no es lo mismo.

## 3. ¿Capacitor sigue siendo la elección correcta frente a React Native/Expo o Flutter?

**Veredicto: sí, se mantiene. Confirmado con más fuentes, no solo la primera búsqueda.**
Para una web React ya existente, Capacitor es la opción recomendada de forma consistente en 2026: reutiliza todo el código sin reescribir nada ([fuente](https://www.bacancytechnology.com/blog/capacitor-vs-react-native)). React Native/Expo solo gana si se empieza de cero o se necesita rendimiento nativo puro (juegos 3D, animaciones muy pesadas) — no es el caso aquí. Nada que cambiar en este punto.

## 4. El algoritmo de repaso espaciado — aquí SÍ hay una mejora real y concreta

`PantallaResultado.jsx` programa repasos a **+3, +7 y +14 días fijos** para todo el mundo, sin importar lo fácil o difícil que le resulte esa ficha al niño en concreto. Investigando algoritmos de repetición espaciada:
- Esto es, literalmente, el sistema **Leitner** más básico: intervalos fijos iguales para todos ([fuente](https://nebulearn.app/blog/spaced-repetition-algorithms-fsrs-leitner-sm2)) — es el método más antiguo y menos eficiente que existe hoy.
- El estándar recomendado en 2026 es **FSRS**, que necesita un 20-30% menos repasos que el método clásico SM-2 para la misma retención ([fuente](https://nebulearn.app/blog/spaced-repetition-algorithms-fsrs-leitner-sm2)) — y SM-2 ya de por sí ajusta el intervalo según lo bien o mal que le fue a la persona, cosa que el sistema actual no hace en absoluto.
- **Impacto real para tu hijo**: hoy, una ficha que domina a la primera y una que le costó mucho reciben exactamente el mismo calendario de repaso. Un algoritmo tipo SM-2 (más simple de implementar que FSRS, buena relación esfuerzo/beneficio) alargaría el intervalo de lo que ya domina y acortaría el de lo que le cuesta — mejor uso de su tiempo de estudio.

**Recomendación**: mejora real, con base en evidencia, no cosmética. No es urgente pero es de las pocas cosas de "diseño pedagógico" (no solo bug) que vale la pena replantear.

## 5. Contenido: ¿headless CMS para editar fichas más fácil?

**Considerado**: Directus, Storyblok, Payload CMS.

**Veredicto: no, no aporta aquí.** Estas herramientas resuelven "que alguien no técnico edite contenido con una interfaz bonita" — pero el cuello de botella real de esta app no es editar JSON ya generado, es **generar** el ejercicio pedagógicamente bien (que un distractor no sea ambiguo, que la dificultad progrese de verdad) — eso lo hace el prompt + Claude, no un CMS. Un CMS añadiría una cuenta/servicio externo más para resolver un problema que `PantallaImportar` (ya conectada) + una futura pantalla de "editar ficha" dentro de la propia app cubren mejor y sin dependencias nuevas.

## Resumen — qué cambia de verdad tras este replanteamiento

| Punto | Antes de replantear | Ahora |
|---|---|---|
| Motor de ejercicios | dado por bueno | **confirmado con evidencia** — mantener |
| Backend | "no hace falta, ya está IndexedDB + backup manual" | **replanteado de verdad**: backend gratuito (Firebase/Supabase) resuelve el riesgo de raíz, backup manual es solo un parche |
| Capacitor | recomendado | **confirmado con más fuentes** — mantener |
| Repaso espaciado | no se había cuestionado como algoritmo, solo como "feature que funciona" | **mejora real identificada**: intervalos fijos = método más primitivo que existe, SM-2 sería una mejora tangible |
| CMS de contenido | no evaluado | **evaluado y descartado** — no resuelve el cuello de botella real |

## Decisión que necesito de ti

¿Añadimos backend gratuito (Firebase o Supabase) para sincronizar progreso de verdad, en vez de quedarnos con el backup manual? Es el cambio de mayor impacto de todo este replanteamiento. Si dices que sí, también hay que elegir entre Firebase y Supabase — puedo investigar cuál encaja mejor con el resto del stack si quieres profundizar antes de decidir.
