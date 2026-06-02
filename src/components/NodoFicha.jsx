/**
 * NodoFicha — nodo circular estilo Duolingo (sin línea de carretera).
 * Estados: sin_empezar | en_progreso | superada
 * Props: esProximo → primer nodo pendiente ("EMPEZAR")
 *        fichaIdx  → posición en el camino (para gradiente único)
 */

// Mapeo de palabras clave → emoji temático
const KW_EMOJI = {
  comunicación: '💬', comunicar: '💬', verbal: '💬', mensaje: '📨',
  animal: '🦁', animales: '🐾', mamífero: '🐘', ave: '🦅', reptil: '🦎',
  planta: '🌱', plantas: '🌿', árbol: '🌳', flor: '🌸', ecosistema: '🌍',
  agua: '💧', río: '🌊', mar: '🐚', clima: '⛅',
  suma: '➕', resta: '➖', multiplicación: '✖️', división: '➗',
  número: '🔢', fracción: '½', geometría: '📐', medida: '📏', ángulo: '📐',
  mapa: '🗺️', geografía: '🌐', continente: '🌍', país: '🏳️',
  historia: '📜', rey: '👑', guerra: '⚔️', civilización: '🏛️',
  cuerpo: '🫀', salud: '💊', sentido: '👁️', nutrición: '🥗',
  familia: '👨‍👩‍👧', sociedad: '🤝', norma: '📋', derecho: '⚖️',
  lectura: '📖', texto: '📄', frase: '✏️', párrafo: '📝',
  vocabulario: '🔤', palabra: '💬', abecedario: '🔡', sílaba: '🔊',
  música: '🎵', arte: '🎨', teatro: '🎭',
  espacio: '🚀', planeta: '🪐', estrella: '⭐', universo: '🌌',
  energía: '⚡', luz: '💡', fuerza: '💪', materia: '⚗️',
  tiempo: '⏰', fecha: '📅', estación: '🍂',
  inglés: '🗣️', verbo: '🔄', gramática: '📚',
};

// Gradientes por índice (cicla cada 8 nodos) — colores vivos
const GRADIENTS_NORMAL = [
  'from-blue-400   to-blue-600',
  'from-violet-400 to-purple-600',
  'from-teal-400   to-emerald-600',
  'from-orange-400 to-rose-500',
  'from-cyan-400   to-sky-600',
  'from-pink-400   to-fuchsia-600',
  'from-amber-400  to-orange-600',
  'from-lime-400   to-green-600',
];

function getIcono(ficha) {
  // 1. Campo explícito en el JSON
  if (ficha.icono) return ficha.icono;
  // 2. Buscar en palabras clave
  const kws = (ficha.palabrasClave ?? []).map(k => k.toLowerCase());
  const titulo = (ficha.titulo ?? '').toLowerCase();
  for (const [key, emoji] of Object.entries(KW_EMOJI)) {
    if (kws.some(k => k.includes(key)) || titulo.includes(key)) return emoji;
  }
  return null; // NodoFicha usará meta.emoji como fallback
}

function getEstrellas(accuracy, completada) {
  if (!completada) return [false, false, false];
  if (accuracy >= 0.9) return [true, true, true];
  if (accuracy >= 0.6) return [true, true, false];
  return [true, false, false];
}

export default function NodoFicha({ ficha, fichaIdx = 0, estado, fichaProgress, meta, onClick, repasoHoy, esProximo }) {
  const accuracy = fichaProgress?.bestAccuracy ?? 0;
  const stars    = getEstrellas(accuracy, estado !== 'sin_empezar');
  const icono    = getIcono(ficha) ?? meta?.emoji ?? '📝';
  const gradIdx  = fichaIdx % GRADIENTS_NORMAL.length;

  // Estilos del círculo según estado
  const circleStyle = {
    sin_empezar: 'bg-gray-200 border-gray-300 text-gray-400',
    en_progreso: `bg-gradient-to-br ${GRADIENTS_NORMAL[gradIdx]} border-transparent text-white shadow-lg`,
    superada:    `bg-gradient-to-br ${GRADIENTS_NORMAL[gradIdx]} border-white text-white shadow-lg opacity-80`,
  }[estado] ?? 'bg-gray-200 border-gray-300';

  // Nodo próximo: mismo gradiente pero con brillo extra
  const proxExtra = esProximo
    ? 'ring-4 ring-offset-2 ring-white shadow-xl scale-110'
    : '';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
      aria-label={ficha.titulo}
    >
      {/* Chip "EMPEZAR" */}
      {esProximo && (
        <span className="bg-white border-2 border-green-500 text-green-700 text-xs font-extrabold px-3 py-1 rounded-full shadow-md whitespace-nowrap mb-0.5">
          EMPEZAR ▶
        </span>
      )}

      {/* Indicador de repaso */}
      {repasoHoy && !esProximo && (
        <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-300 whitespace-nowrap">
          🔄 Repasar
        </span>
      )}

      {/* Círculo principal — 80px */}
      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center relative transition-all group-hover:scale-105 group-active:scale-90 ${circleStyle} ${proxExtra}`}>
        {estado === 'superada' ? (
          <span className="text-3xl font-black leading-none text-white drop-shadow">✓</span>
        ) : (
          <span className="text-4xl leading-none select-none drop-shadow-sm">{icono}</span>
        )}

        {/* Nivel badge N2/N3 */}
        {ficha.nivel && ficha.nivel > 1 && (
          <span className={`absolute -bottom-2 -right-2 text-xs font-extrabold px-1.5 py-0.5 rounded-full border-2 ${
            ficha.nivel === 2
              ? 'bg-amber-100 border-amber-400 text-amber-700'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            N{ficha.nivel}
          </span>
        )}
      </div>

      {/* Estrellas */}
      <div className="flex gap-0.5 text-sm leading-none">
        {stars.map((full, i) => (
          <span key={i} className={full ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        ))}
      </div>

      {/* Título */}
      <span className="text-xs font-bold text-gray-600 text-center max-w-[92px] leading-tight">
        {ficha.titulo}
      </span>
    </button>
  );
}
