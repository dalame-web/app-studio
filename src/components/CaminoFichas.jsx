/**
 * CaminoFichas — camino estilo Duolingo con nodos en zigzag.
 * Muestra fichas de una asignatura con estado visual de progreso.
 */

import { useEffect, useState } from 'react';
import { getAllFichaProgress } from '../datos/db';
import NodoFicha from './NodoFicha';

// Offsets horizontales en % para crear efecto zigzag (4 posiciones cíclicas)
const ZIGZAG = [8, 35, 62, 35];

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
        <p className="text-center text-sm">
          Todavía no hay fichas para esta asignatura.
        </p>
      </div>
    );
  }

  const todasSuperadas = fichas.every(f => progreso[f.id]?.superada);

  return (
    <div className="py-6 px-4 max-w-sm mx-auto">
      {fichas.map((ficha, idx) => {
        const fp     = progreso[ficha.id];
        const estado = !fp || fp.totalSessions === 0
          ? 'sin_empezar'
          : fp.superada
            ? 'superada'
            : 'en_progreso';
        const repaso = hayRepasoHoy(fp);
        const offset = ZIGZAG[idx % ZIGZAG.length];

        return (
          <div key={ficha.id} className="relative mb-8">
            {/* Línea conectora con nodo anterior */}
            {idx > 0 && (
              <div
                className="absolute w-0.5 border-l-2 border-dashed border-gray-300"
                style={{
                  top: '-2rem',
                  height: '2rem',
                  left: `calc(${ZIGZAG[(idx - 1) % ZIGZAG.length]}% + 2rem)`,
                }}
              />
            )}

            {/* Nodo */}
            <div style={{ marginLeft: `${offset}%` }}>
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

      {/* Nodo final: Repaso completo (solo si todas superadas) */}
      {todasSuperadas && (
        <div className="flex justify-center mt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-0.5 h-8 border-l-2 border-dashed border-yellow-300 mx-auto" />
            <div className="bg-gradient-to-b from-yellow-300 to-orange-400 rounded-full w-20 h-20 flex items-center justify-center text-4xl shadow-lg shadow-orange-200 border-4 border-yellow-400">
              🏆
            </div>
            <span className="text-sm font-bold text-orange-700 text-center">
              ¡Camino<br/>completado!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
