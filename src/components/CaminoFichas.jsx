/**
 * CaminoFichas — camino estilo Duolingo (sin línea, solo nodos).
 * - Ola suave centrada (28-72%)
 * - Sin carretera, los nodos marcan el camino visualmente
 * - Banners de unidad a ancho completo
 * - Nodo "EMPEZAR" en el primer pendiente
 * - Cada ficha ocupa 3 nodos consecutivos, uno por nivel de ejercicio (1/2/3):
 *   así el niño pasa por los 3 niveles generados en vez de que el selector
 *   descarte para siempre la mayoría del contenido de los otros niveles.
 */

import { useEffect, useState } from 'react';
import { getAllFichaProgress } from '../datos/db';
import { NIVELES_CAMINO } from '../datos/selector';
import NodoFicha from './NodoFicha';

// Clave del progreso de un nodo (ficha, nivel) en el mapa local
function claveNodo(fichaId, nivel) {
  return `${fichaId}_${nivel}`;
}

// Ola suave: máximo ±22% desde el centro (como Duolingo)
const WAVE_X_PCT = [50, 38, 28, 38, 50, 62, 72, 62];

// Altura por item (px)
const NODE_H  = 160;
const SEP_H   = 72;
const PAD_TOP = 130;

function hayRepasoHoy(fp) {
  if (!fp?.superada || !fp?.reviewDates?.length) return false;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  return fp.reviewDates.some((d, idx) => {
    if (idx < (fp.reviewsDone ?? 0)) return false;
    return new Date(d) <= hoy;
  });
}

// Extraer el número de unidad del string "Unidad 3: ..." → "3"
function labelCorto(label) {
  const m = label?.match(/\d+/);
  return m ? m[0] : '·';
}

export default function CaminoFichas({ fichas, meta, onSelectFicha, profileId }) {
  const [progreso, setProgreso] = useState({});

  useEffect(() => {
    if (!profileId) return;
    getAllFichaProgress(profileId).then(all => {
      const map = {};
      all.forEach(fp => { map[claveNodo(fp.fichaId, fp.nivel)] = fp; });
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

  // ── Construir lista de items con separadores ──────────────────────────────
  // Cada ficha aparece 3 veces seguidas (una por nivel de ejercicio).
  const items = [];
  let prevUnit = undefined;
  fichas.forEach(ficha => {
    const u = ficha.unidad ?? null;
    if (u !== null && u !== prevUnit) {
      items.push({ type: 'sep', label: u });
      prevUnit = u;
    }
    NIVELES_CAMINO.forEach(nivel => {
      items.push({ type: 'ficha', ficha, nivel });
    });
  });

  // ── Calcular posiciones ───────────────────────────────────────────────────
  let waveIdx = 0;
  let y = PAD_TOP;
  const positions = items.map(item => {
    if (item.type === 'sep') {
      const pos = { ...item, xPct: 50, y };
      y += SEP_H;
      return pos;
    }
    const xPct = WAVE_X_PCT[waveIdx % WAVE_X_PCT.length];
    const pos  = { ...item, xPct, y };
    y += NODE_H;
    waveIdx++;
    return pos;
  });

  const nodosFicha = items.filter(i => i.type === 'ficha');
  const todasSuperadas = nodosFicha.every(({ ficha, nivel }) => progreso[claveNodo(ficha.id, nivel)]?.superada);
  const finalY  = y + 20;
  const totalH  = finalY + (todasSuperadas ? NODE_H : 30);

  // Primer nodo no superado (para "EMPEZAR")
  const proximo = nodosFicha.find(({ ficha, nivel }) => !progreso[claveNodo(ficha.id, nivel)]?.superada);
  const proxKey = proximo ? claveNodo(proximo.ficha.id, proximo.nivel) : null;

  // Contador de fichas para pasar índice a NodoFicha
  let fichaCounter = 0;

  return (
    <div
      className="relative mx-auto w-full"
      style={{ maxWidth: 420, minHeight: totalH }}
    >
      {/* ── Items (fichas + separadores) ────────────────────────────────────── */}
      {positions.map((pos, i) => {
        if (pos.type === 'sep') {
          return (
            <div
              key={`sep-${i}`}
              className="absolute"
              style={{
                left: '5%',
                width: '90%',
                top: pos.y,
                transform: 'translateY(-50%)',
                zIndex: 3,
              }}
            >
              <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-sm border ${meta?.bg ?? 'bg-blue-50'} ${meta?.border ?? 'border-blue-200'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${
                  meta?.bg?.replace('bg-', 'bg-')?.replace('-50', '-500')?.replace('-100', '-500') ?? 'bg-blue-500'
                }`}>
                  {labelCorto(pos.label)}
                </span>
                <div>
                  <p className={`text-xs font-extrabold ${meta?.text ?? 'text-blue-800'} leading-tight`}>
                    {pos.label}
                  </p>
                </div>
              </div>
            </div>
          );
        }

        const ficha     = pos.ficha;
        const nivel     = pos.nivel;
        const fp        = progreso[claveNodo(ficha.id, nivel)];
        const estado    = !fp || fp.totalSessions === 0
          ? 'sin_empezar'
          : fp.superada ? 'superada' : 'en_progreso';
        const repaso    = hayRepasoHoy(fp);
        const esProximo = claveNodo(ficha.id, nivel) === proxKey;
        const fichaIdx  = fichaCounter++;

        return (
          <div
            key={claveNodo(ficha.id, nivel)}
            className="absolute"
            style={{
              left: `${pos.xPct}%`,
              top: pos.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            <NodoFicha
              ficha={ficha}
              nivel={nivel}
              fichaIdx={fichaIdx}
              estado={estado}
              fichaProgress={fp}
              meta={meta}
              repasoHoy={repaso}
              esProximo={esProximo}
              onClick={() => onSelectFicha(ficha, nivel, repaso ? 'repaso' : null)}
            />
          </div>
        );
      })}

      {/* ── Trofeo final ─────────────────────────────────────────────────── */}
      {todasSuperadas && (
        <div
          className="absolute"
          style={{
            left: '50%',
            top: finalY,
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 border-4 border-yellow-500 flex items-center justify-center text-5xl shadow-xl shadow-orange-200">
              🏆
            </div>
            <span className="text-sm font-extrabold text-orange-700 text-center leading-tight">
              ¡Camino<br/>completado!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
