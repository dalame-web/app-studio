/**
 * CaminoFichas — camino serpentino estilo Duolingo.
 * Nodos posicionados absolutamente con patrón de ola,
 * conectados por líneas SVG diagonales.
 * Soporta separadores de unidad (campo `unidad` en ficha).
 */

import { useEffect, useState } from 'react';
import { getAllFichaProgress } from '../datos/db';
import NodoFicha from './NodoFicha';

// Patrón de ola: 8 posiciones X en % del contenedor
// Crea un camino serpentino natural de izquierda a derecha y vuelta
const WAVE_X = [12, 30, 50, 70, 88, 70, 50, 30];

// Altura reservada por cada item del camino (nodo o separador) en px
const NODE_H  = 170;
const SEP_H   = 80;

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

  // ── Construir lista de items (fichas + separadores de unidad) ──────────────
  const items = [];
  let prevUnit = undefined;

  fichas.forEach(ficha => {
    const unit = ficha.unidad ?? null;
    if (unit && unit !== prevUnit && prevUnit !== undefined) {
      items.push({ type: 'separator', label: unit });
    }
    items.push({ type: 'ficha', ficha });
    if (prevUnit === undefined && unit) prevUnit = unit;
    else if (unit) prevUnit = unit;
  });

  // ── Calcular posiciones de cada item ──────────────────────────────────────
  let waveIdx  = 0;   // índice en WAVE_X (solo avanza en fichas)
  let yOffset  = 60;  // px desde el top

  const positions = items.map(item => {
    if (item.type === 'separator') {
      const pos = { type: 'separator', label: item.label, y: yOffset, x: 50 };
      yOffset += SEP_H;
      return pos;
    }
    const x = WAVE_X[waveIdx % WAVE_X.length];
    const pos = { type: 'ficha', ficha: item.ficha, x, y: yOffset };
    yOffset += NODE_H;
    waveIdx++;
    return pos;
  });

  // Nodo final si todas superadas
  const todasSuperadas = fichas.every(f => progreso[f.id]?.superada);
  const finalY = yOffset + 20;
  const totalHeight = finalY + (todasSuperadas ? NODE_H : 40);

  // ── Solo posiciones de fichas para dibujar las líneas SVG ─────────────────
  const fichaPositions = positions.filter(p => p.type === 'ficha');

  return (
    <div
      className="relative w-full mx-auto overflow-visible"
      style={{ maxWidth: 400, height: totalHeight }}
    >
      {/* ── SVG: líneas conectoras entre nodos ─────────────────────────────── */}
      <svg
        className="absolute inset-0 pointer-events-none overflow-visible"
        width="100%"
        height={totalHeight}
        style={{ zIndex: 0 }}
      >
        {fichaPositions.map((pos, i) => {
          if (i === 0) return null;
          const prev = fichaPositions[i - 1];
          return (
            <line
              key={i}
              x1={`${prev.x}%`} y1={prev.y}
              x2={`${pos.x}%`}  y2={pos.y}
              stroke="#d1d5db"
              strokeWidth="4"
              strokeDasharray="10,7"
              strokeLinecap="round"
            />
          );
        })}

        {/* Línea hacia el nodo final 🏆 si todas superadas */}
        {todasSuperadas && fichaPositions.length > 0 && (
          <line
            x1={`${fichaPositions[fichaPositions.length - 1].x}%`}
            y1={fichaPositions[fichaPositions.length - 1].y}
            x2="50%"
            y2={finalY}
            stroke="#fcd34d"
            strokeWidth="4"
            strokeDasharray="10,7"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* ── Renderizar items (fichas + separadores) ──────────────────────────── */}
      {positions.map((pos, i) => {
        if (pos.type === 'separator') {
          return (
            <div
              key={`sep-${i}`}
              className="absolute flex items-center justify-center"
              style={{ left: '50%', top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 1 }}
            >
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm ${meta?.bg ?? 'bg-blue-50'} ${meta?.border ?? 'border-blue-300'} ${meta?.text ?? 'text-blue-800'}`}>
                <span>{meta?.emoji}</span>
                <span>{pos.label}</span>
              </div>
            </div>
          );
        }

        const ficha  = pos.ficha;
        const fp     = progreso[ficha.id];
        const estado = !fp || fp.totalSessions === 0
          ? 'sin_empezar'
          : fp.superada ? 'superada' : 'en_progreso';
        const repaso = hayRepasoHoy(fp);

        return (
          <div
            key={ficha.id}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top:  pos.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 2,
            }}
          >
            <NodoFicha
              ficha={ficha}
              estado={estado}
              fichaProgress={fp}
              meta={meta}
              repasoHoy={repaso}
              onClick={() => onSelectFicha(ficha, repaso ? 'repaso' : modo)}
            />
          </div>
        );
      })}

      {/* ── Nodo final 🏆 ─────────────────────────────────────────────────── */}
      {todasSuperadas && (
        <div
          className="absolute"
          style={{ left: '50%', top: finalY, transform: 'translate(-50%, -50%)', zIndex: 2 }}
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
