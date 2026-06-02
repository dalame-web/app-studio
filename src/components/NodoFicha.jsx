/**
 * NodoFicha — nodo circular individual en el camino estilo Duolingo.
 * Estados: sin_empezar | en_progreso | superada
 */

export default function NodoFicha({ ficha, estado, fichaProgress, meta, onClick, repasoHoy }) {
  const accuracyPct = fichaProgress?.bestAccuracy
    ? Math.round(fichaProgress.bestAccuracy * 100)
    : 0;

  const circleStyle = {
    sin_empezar: `bg-white border-gray-300 text-gray-400`,
    en_progreso: `${meta?.bg ?? 'bg-blue-50'} ${meta?.border ? meta.border.replace('border-', 'border-') : 'border-blue-400'} text-gray-700 shadow-md`,
    superada:    `bg-gradient-to-br from-yellow-300 to-amber-400 border-yellow-500 text-gray-800 shadow-xl shadow-amber-200`,
  }[estado] ?? 'bg-white border-gray-300';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 active:scale-95 transition-transform group"
      aria-label={ficha.titulo}
    >
      {/* Indicador de repaso pendiente */}
      {repasoHoy && (
        <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2.5 py-1 rounded-full border border-orange-300 animate-pulse">
          🔄 Repasar
        </span>
      )}

      {/* Círculo principal — w-20 h-20 = 80px */}
      <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center text-4xl relative transition-all group-hover:scale-105 group-active:scale-90 ${circleStyle}`}>
        <span>{meta?.emoji ?? '📝'}</span>

        {/* Corona dorada en superada */}
        {estado === 'superada' && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg leading-none">⭐</span>
        )}

        {/* Nivel badge (solo nivel 2 y 3) */}
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

      {/* Título */}
      <span className="text-xs font-bold text-gray-700 text-center max-w-[96px] leading-tight">
        {ficha.titulo}
      </span>

      {/* Barra de precisión (en progreso) */}
      {estado === 'en_progreso' && (
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${accuracyPct}%` }}
          />
        </div>
      )}

      {/* Resultado (superada o en progreso) */}
      {estado !== 'sin_empezar' && (
        <span className={`text-[11px] font-semibold ${estado === 'superada' ? 'text-amber-600' : 'text-gray-400'}`}>
          {estado === 'superada' ? `${accuracyPct}% ✓` : `${accuracyPct}%`}
        </span>
      )}
    </button>
  );
}
