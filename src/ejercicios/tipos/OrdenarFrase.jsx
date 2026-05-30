// G6: instrucción
import { useState } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function OrdenarFrase({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const [disponibles, setDisponibles] = useState(() => mezclar(ejercicio.palabrasDesordenadas ?? []));
  const [construida, setConstruida]   = useState([]);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  function agregar(palabra, idx) {
    setConstruida(prev => [...prev, palabra]);
    setDisponibles(prev => prev.filter((_, i) => i !== idx));
  }

  function quitar(idx) {
    const palabra = construida[idx];
    setDisponibles(prev => [...prev, palabra]);
    setConstruida(prev => prev.filter((_, i) => i !== idx));
  }

  function resetear() {
    setDisponibles(mezclar(ejercicio.palabrasDesordenadas ?? []));
    setConstruida([]);
  }

  function comprobar() {
    const frase = construida.join(' ');
    if (frase.toLowerCase() === ejercicio.fraseCorrecta?.trim().toLowerCase()) onCorrecto();
    else { onIncorrecto(); }
  }

  const pista = intentos >= 2 ? `Frase: ${ejercicio.fraseCorrecta}` : intentos === 1 ? 'Fíjate en qué palabra va primero.' : null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-5">
        <BotonAudio texto={ejercicio.enunciado ?? 'Ordena las palabras'} idioma={idioma} />
        <p className="text-base font-semibold text-gray-600 pr-12">{ejercicio.enunciado ?? 'Ordena las palabras para formar una frase:'}</p>
        {/* G6 */}
        <ChipInstruccion tipo="OrdenarFrase" />
        {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
      </div>

      {/* Línea de construcción */}
      <div className="min-h-16 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        {construida.length === 0
          ? <span className="text-blue-300 text-sm w-full text-center">Toca las palabras aquí abajo para ordenarlas</span>
          : construida.map((p, i) => (
            <button
              key={i}
              onClick={() => quitar(i)}
              className="bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold px-3 py-2 rounded-xl text-sm transition-colors active:scale-95"
            >
              {p} ×
            </button>
          ))
        }
      </div>

      {/* Banco */}
      <div className="flex flex-wrap gap-2 justify-center">
        {disponibles.map((p, i) => (
          <button
            key={i}
            onClick={() => agregar(p, i)}
            className="bg-white border-2 border-gray-200 hover:border-blue-400 text-gray-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 text-base"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={resetear} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-2xl transition-colors">
          🔄 Borrar
        </button>
        <button
          onClick={comprobar}
          disabled={construida.length < (ejercicio.palabrasDesordenadas?.length ?? 0)}
          className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow transition-all active:scale-95"
        >
          Comprobar ✓
        </button>
      </div>
    </div>
  );
}
