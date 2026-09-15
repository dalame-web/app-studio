/**
 * RepasoSeccion — bloque plegado con las fichas de un curso anterior, para
 * repasar sin mezclarlas con el camino del curso actual. Colapsada por
 * defecto para no forzar un scroll enorme.
 *
 * Componente aparte a propósito (no dentro de CaminoFichas): así el día que
 * se quiera cambiar cómo se ve el repaso (pestañas, otro sitio…) se toca
 * solo este archivo, sin tocar el camino principal.
 */
import { useEffect, useState } from 'react';
import { getAllFichaProgress } from '../datos/db';
import NodoFicha from './NodoFicha';

export default function RepasoSeccion({ fichas, curso, meta, profileId, onSelectFicha }) {
  const [abierto, setAbierto]     = useState(false);
  const [progreso, setProgreso]   = useState({});

  useEffect(() => {
    if (!profileId || !abierto) return;
    getAllFichaProgress(profileId).then(all => {
      const map = {};
      all.forEach(fp => { map[fp.fichaId] = fp; });
      setProgreso(map);
    });
  }, [profileId, abierto]);

  if (fichas.length === 0) return null;

  return (
    <div className="max-w-md mx-auto px-4 mt-4 mb-8">
      <button
        onClick={() => setAbierto(a => !a)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl shadow-sm border ${meta?.bg ?? 'bg-blue-50'} ${meta?.border ?? 'border-blue-200'}`}
      >
        <span className={`text-sm font-extrabold ${meta?.text ?? 'text-blue-800'}`}>
          📖 Repaso de {curso}º Primaria ({fichas.length} ficha{fichas.length === 1 ? '' : 's'})
        </span>
        <span className={`${meta?.text ?? 'text-blue-800'} transition-transform ${abierto ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {abierto && (
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 justify-items-center mt-4">
          {fichas.map(ficha => {
            const fp     = progreso[ficha.id];
            const estado = !fp || fp.totalSessions === 0
              ? 'sin_empezar'
              : fp.superada ? 'superada' : 'en_progreso';
            return (
              <NodoFicha
                key={ficha.id}
                ficha={ficha}
                estado={estado}
                fichaProgress={fp}
                meta={meta}
                onClick={() => onSelectFicha(ficha, 'repaso')}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
