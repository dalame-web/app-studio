// G1: seleccionar mejor voz disponible (menos robótica)
// G2: cancelar voz al navegar (manejado en App.jsx)
import { useCallback, useRef, useEffect, useState } from 'react';

let mejorVozES = null;
let mejorVozEN = null;

function cargarMejoresVoces() {
  if (!window.speechSynthesis) return;
  const voces = window.speechSynthesis.getVoices();
  if (voces.length === 0) return;

  // ES: priorizar voces naturales/premium femeninas
  const preferenciasES = [
    v => v.lang === 'es-ES' && /google|microsoft|neural|premium/i.test(v.name),
    v => v.lang === 'es-ES' && /mónica|mónica|laura|elena|marisol|paulina/i.test(v.name),
    v => v.lang === 'es-ES',
    v => v.lang.startsWith('es'),
  ];
  for (const pred of preferenciasES) {
    const v = voces.find(pred);
    if (v) { mejorVozES = v; break; }
  }

  // EN: similar para inglés
  const preferenciasEN = [
    v => v.lang === 'en-US' && /google|microsoft|neural|premium/i.test(v.name),
    v => v.lang === 'en-US' && /samantha|karen|victoria|siri/i.test(v.name),
    v => v.lang === 'en-US',
    v => v.lang.startsWith('en'),
  ];
  for (const pred of preferenciasEN) {
    const v = voces.find(pred);
    if (v) { mejorVozEN = v; break; }
  }
}

// Voces se cargan async en algunos navegadores
if (typeof window !== 'undefined') {
  cargarMejoresVoces();
  window.speechSynthesis?.addEventListener?.('voiceschanged', cargarMejoresVoces);
}

export default function BotonAudio({ texto, idioma = 'es-ES' }) {
  const [hablando, setHablando] = useState(false);

  const hablar = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(texto);
    u.lang = idioma;
    // G1: configuración más natural para niños
    u.rate = 0.82;
    u.pitch = idioma.startsWith('es') ? 1.1 : 1.0;

    const vozSeleccionada = idioma.startsWith('es') ? mejorVozES : mejorVozEN;
    if (vozSeleccionada) u.voice = vozSeleccionada;

    u.onstart  = () => setHablando(true);
    u.onend    = () => setHablando(false);
    u.onerror  = () => setHablando(false);

    window.speechSynthesis.speak(u);
  }, [texto, idioma]);

  return (
    <button
      onClick={hablar}
      className={`absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-full shadow transition-all ${
        hablando
          ? 'bg-blue-100 text-blue-600 scale-110'
          : 'bg-white/90 hover:bg-white text-gray-500 hover:text-blue-500'
      }`}
      aria-label="Escuchar enunciado"
      title="Escuchar"
    >
      {hablando ? '🔊' : '🔈'}
    </button>
  );
}
