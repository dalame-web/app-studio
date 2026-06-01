/**
 * NodoFicha — nodo circular individual en el camino estilo Duolingo.
 * Estados: sin_empezar | en_progreso | superada
 */

export default function NodoFicha({ ficha, estado, fichaProgress, meta, onClick, repasoHoy }) {
  const accuracyPct = fichaProgress?.bestAccuracy
    ? Math.round(fichaProgress.bestAccuracy * 100)
    : 0;

  const circleStyle = {
    sin_empezar: 'bg-gray-100 border-gray-300 text-gray-400',
    en_progreso: `${meta?.bg ?? 'bg-blue-100'} border-blue-400 text-gray-700`,
    superada:    'bg-yellow-200 border-yellow-400 text-gray-800 shadow-lg shadow-yellow-200',
  }[estado] ?? 'bg-gray-100 border-gray-300';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group"
      aria-label={ficha.titulo}
    >
      {/* Indicador de repaso pendiente */}
      {repasoHoy && (
        <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full border border-orange-300 animate-pulse">
          🔄 Repasar
        </span>
      )}

      {/* Círculo principal */}
      <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center text-3xl relative transition-all group-active:scale-90 ${circleStyle}`}>
        <span>{meta?.emoji ?? '📝'}</span>

        {/* Estrella en superada */}
        {estado === 'superada' && (
          <span className="absolute -top-1.5 -right-1.5 text-base leading-none">⭐</span>
        )}

        {/* Nivel badge */}
        {ficha.nivel && ficha.nivel > 1 && (
          <span className={`absolute -bottom-1.5 -right-1.5 text-xs font-bold px-1 rounded-full border ${
            ficha.nivel === 2 ? 'bg-amber-100 border-amber-300 text-amber-700'
                              : 'bg-red-100 border-red-300 text-red-700'
          }`}>
            N{ficha.nivel}
          </span>
        )}
      </div>

      {/* Título */}
      <span className="text-xs font-semibold text-gray-700 text-center max-w-[80px] leading-tight">
        {ficha.titulo}
      </span>

      {/* Barra de progreso */}
      {estado === 'en_progreso' && (
        <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${accuracyPct}%` }}
          />
        </div>
      )}

      {/* Precisión */}
      {estado !== 'sin_empezar' && (
        <span className="text-[10px] text-gray-400 font-medium">
          {estado === 'superada' ? `${accuracyPct}% ✓` : `${accuracyPct}%`}
        </span>
      )}
    </button>
  );
}
