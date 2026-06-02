/**
 * CaminoFichas — camino estilo Duolingo con nodos en zigzag izquierda/derecha.
 */

import { useEffect, useState } from 'react';
import { getAllFichaProgress } from '../datos/db';
import NodoFicha from './NodoFicha';

function hayRepasoHoy(fp) {
  if (!fp?.superada || !fp?.reviewDates?.length) return false;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return fp.reviewDates.some((d, idx) => {
    if (idx < (fp.reviewsDone ?? 0)) return false;
    return new Date(d) <= hoy;
  });
}

export default function CaminoFichas({ fichas, meta, onSelectFicha, profileId, modo }) {
  const [progreso, setProgreso] = useState({});

  useEffect(() => {
    if (!profileId) return;
    getAllFichaProgress(profileId).then(all => {
      const map = {};
      all.forEach(fp => { map[fp.fichaId] = fp; });
      setProgreso(map);
    });
  }, [profileId]);

  if (fichas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <span className="text-5xl">📭</span>
        <p className="text-center text-sm">Todavía no hay fichas para esta asignatura.</p>
      </div>
    );
  }

  const todasSuperadas = fichas.length > 0 && fichas.every(f => progreso[f.id]?.superada);

  return (
    <div className="py-6 px-2 max-w-md mx-auto w-full">
      {fichas.map((ficha, idx) => {
        const fp     = progreso[ficha.id];
        const estado = !fp || fp.totalSessions === 0
          ? 'sin_empezar'
          : fp.superada
            ? 'superada'
            : 'en_progreso';
        const repaso = hayRepasoHoy(fp);
        const isLeft = idx % 2 === 0;

        return (
          <div key={ficha.id}>
            {/* Conector entre nodos — línea vertical centrada */}
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <div className="h-10 w-1 border-l-[3px] border-dashed border-gray-300" />
              </div>
            )}

            {/* Fila del nodo — alterna izquierda/derecha */}
            <div className={`flex ${isLeft ? 'justify-start pl-8' : 'justify-end pr-8'}`}>
              <NodoFicha
                ficha={ficha}
                estado={estado}
                fichaProgress={fp}
                meta={meta}
                repasoHoy={repaso}
                onClick={() => onSelectFicha(ficha, repaso ? 'repaso' : modo)}
              />
            </div>
          </div>
        );
      })}

      {/* Conector + nodo final cuando todas superadas */}
      {todasSuperadas && (
        <>
          <div className="flex justify-center py-1">
            <div className="h-10 w-1 border-l-[3px] border-dashed border-yellow-400" />
          </div>
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 border-4 border-yellow-500 flex items-center justify-center text-5xl shadow-xl shadow-orange-200">
                🏆
              </div>
              <span className="text-base font-extrabold text-orange-700 text-center leading-tight">
                ¡Camino<br/>completado!
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
