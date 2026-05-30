// G6: instrucción
import { useState, useCallback } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';

export default function SopaLetras({ ejercicio, asignatura, onCorrecto }) {
  const cuadricula = ejercicio.cuadricula ?? [];
  const palabras   = ejercicio.palabras ?? [];
  const [encontradas, setEncontradas] = useState(new Set());
  const [selStart, setSelStart]       = useState(null);
  const [selActual, setSelActual]     = useState(new Set());
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  const celdaKey = (r, c) => `${r}-${c}`;

  function celdas(r1, c1, r2, c2) {
    const sel = new Set();
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    let r = r1, c = c1;
    while (true) {
      sel.add(celdaKey(r, c));
      if (r === r2 && c === c2) break;
      r += dr; c += dc;
    }
    return sel;
  }

  function letraSel(r1, c1, r2, c2) {
    const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
    let letras = '', r = r1, c = c1;
    while (true) {
      letras += cuadricula[r]?.[c] ?? '';
      if (r === r2 && c === c2) break;
      r += dr; c += dc;
    }
    return letras;
  }

  function pointerDown(r, c) {
    setSelStart({ r, c });
    setSelActual(new Set([celdaKey(r, c)]));
  }

  function pointerMove(r, c) {
    if (!selStart) return;
    setSelActual(celdas(selStart.r, selStart.c, r, c));
  }

  function pointerUp(r2, c2) {
    if (!selStart) return;
    const palabra = letraSel(selStart.r, selStart.c, r2, c2).toUpperCase();
    const invertida = letraSel(r2, c2, selStart.r, selStart.c).toUpperCase();
    const encontrada = palabras.find(p => p.toUpperCase() === palabra || p.toUpperCase() === invertida);
    if (encontrada && !encontradas.has(encontrada)) {
      const nuevas = new Set([...encontradas, encontrada]);
      setEncontradas(nuevas);
      if (nuevas.size === palabras.length) setTimeout(() => onCorrecto(), 500);
    }
    setSelStart(null);
    setSelActual(new Set());
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-4">
        <BotonAudio texto={ejercicio.enunciado ?? 'Encuentra las palabras'} idioma={idioma} />
        <p className="text-base font-semibold text-gray-600 pr-12">{ejercicio.enunciado ?? 'Encuentra las palabras:'}</p>
        {/* G6 */}
        <ChipInstruccion tipo="SopaLetras" />
      </div>

      <div className="flex gap-3">
        {/* Grid */}
        <div className="select-none" onMouseLeave={() => { if (selStart) pointerUp(selStart.r, selStart.c); }}>
          <table className="border-collapse">
            <tbody>
              {cuadricula.map((fila, r) => (
                <tr key={r}>
                  {fila.map((letra, c) => {
                    const key = celdaKey(r, c);
                    const enSel = selActual.has(key);
                    return (
                      <td
                        key={c}
                        onPointerDown={() => pointerDown(r, c)}
                        onPointerEnter={() => pointerMove(r, c)}
                        onPointerUp={() => pointerUp(r, c)}
                        className={`w-9 h-9 text-center font-bold text-sm cursor-pointer select-none border border-gray-100 rounded transition-colors ${
                          enSel ? 'bg-blue-300 text-blue-900' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {letra}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Word list */}
        <div className="flex flex-col gap-1 min-w-24">
          {palabras.map(p => (
            <span
              key={p}
              className={`text-sm font-semibold px-2 py-1 rounded-lg transition-all ${
                encontradas.has(p) ? 'line-through text-gray-400 bg-green-50' : 'text-gray-700'
              }`}
            >
              {encontradas.has(p) ? '✅ ' : '• '}{p}
            </span>
          ))}
          <p className="text-xs text-gray-400 mt-2">{encontradas.size}/{palabras.length}</p>
        </div>
      </div>

      {palabras.length > 0 && encontradas.size < palabras.length && (
        <button
          onClick={() => onCorrecto()}
          className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-2xl text-sm transition-colors"
        >
          Terminar sopa de letras →
        </button>
      )}
    </div>
  );
}
