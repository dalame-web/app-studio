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
import { NIVELES_CAMINO } from '../datos/selector';
import NodoFicha from './NodoFicha';

export default function RepasoSeccion({ fichas, curso, meta, profileId, onSelectFicha }) {
  const [abierto, setAbierto]     = useState(false);
  const [progreso, setProgreso]   = useState({});

  useEffect(() => {
    if (!profileId || !abierto) return;
    getAllFichaProgress(profileId).then(all => {
      // Agrupa por ficha: { fichaId: { 1: fp, 2: fp, 3: fp } }
      const map = {};
      all.forEach(fp => {
        if (!map[fp.fichaId]) map[fp.fichaId] = {};
        map[fp.fichaId][fp.nivel] = fp;
      });
      setProgreso(map);
    });
  }, [profileId, abierto]);

  if (fichas.length === 0) return null;

  // El repaso de cursos anteriores no expone los 3 niveles como nodos
  // separados (es un bloque secundario y colapsado) — al tocar la ficha se
  // empieza por el primer nivel que aún no esté superado.
  function primerNivelPendiente(fichaId) {
    const porNivel = progreso[fichaId] ?? {};
    return NIVELES_CAMINO.find(n => !porNivel[n]?.superada) ?? NIVELES_CAMINO[0];
  }

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
            const porNivel = progreso[ficha.id] ?? {};
            const fps      = NIVELES_CAMINO.map(n => porNivel[n]);
            const estado   = fps.every(fp => fp?.superada)
              ? 'superada'
              : fps.some(fp => (fp?.totalSessions ?? 0) > 0)
                ? 'en_progreso'
                : 'sin_empezar';
            const nivel = primerNivelPendiente(ficha.id);
            return (
              <NodoFicha
                key={ficha.id}
                ficha={ficha}
                nivel={nivel}
                estado={estado}
                fichaProgress={porNivel[nivel]}
                meta={meta}
                onClick={() => onSelectFicha(ficha, nivel, 'repaso')}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
