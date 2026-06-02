/**
 * NodoFicha — nodo circular estilo Duolingo.
 * Estados: sin_empezar | en_progreso | superada
 * Props: esProximo → primer nodo pendiente (muestra "EMPEZAR" + glow)
 */

function getEstrellas(accuracy, completada) {
  if (!completada) return [false, false, false];
  if (accuracy >= 0.9) return [true, true, true];
  if (accuracy >= 0.6) return [true, true, false];
  return [true, false, false];
}

export default function NodoFicha({ ficha, estado, fichaProgress, meta, onClick, repasoHoy, esProximo }) {
  const accuracy    = fichaProgress?.bestAccuracy ?? 0;
  const stars       = getEstrellas(accuracy, estado !== 'sin_empezar');

  // Colores del círculo según estado
  const circleStyle = {
    sin_empezar: 'bg-gray-200 border-gray-300 text-gray-400',
    en_progreso: `${meta?.bg ?? 'bg-blue-100'} ${meta?.border ?? 'border-blue-400'} text-gray-700 shadow-md`,
    superada:    'bg-green-500 border-green-600 text-white shadow-lg shadow-green-200',
  }[estado] ?? 'bg-gray-200 border-gray-300';

  // Estilo extra para el nodo próximo (brillo + scale)
  const proxStyle = esProximo
    ? 'ring-4 ring-offset-2 ring-white shadow-xl animate-pulse'
    : '';

  // Ícono dentro del círculo
  const icono = estado === 'superada'
    ? '✓'
    : esProximo
      ? '⭐'
      : meta?.emoji ?? '📝';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
      aria-label={ficha.titulo}
    >
      {/* Chip "EMPEZAR" (solo en próximo) */}
      {esProximo && (
        <span className="bg-white border-2 border-green-500 text-green-700 text-xs font-extrabold px-3 py-1 rounded-full shadow-md whitespace-nowrap mb-0.5">
          EMPEZAR
        </span>
      )}

      {/* Indicador de repaso */}
      {repasoHoy && !esProximo && (
        <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-300 animate-pulse whitespace-nowrap">
          🔄 Repasar
        </span>
      )}

      {/* Círculo principal — w-20 h-20 = 80px */}
      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center relative transition-all group-hover:scale-105 group-active:scale-90 ${circleStyle} ${proxStyle}`}>
        <span className={`${estado === 'superada' ? 'text-3xl font-black' : 'text-4xl'} leading-none select-none`}>
          {icono}
        </span>

        {/* Nivel badge (solo N2, N3) */}
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

      {/* Estrellas (siempre visibles: vacías o rellenas) */}
      <div className="flex gap-0.5 text-sm leading-none">
        {stars.map((full, i) => (
          <span key={i} className={full ? 'text-yellow-400' : 'text-gray-300'}>★</span>
        ))}
      </div>

      {/* Título */}
      <span className="text-xs font-bold text-gray-600 text-center max-w-[88px] leading-tight">
        {ficha.titulo}
      </span>
    </button>
  );
}
