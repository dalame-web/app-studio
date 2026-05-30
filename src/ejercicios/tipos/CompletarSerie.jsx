// G6: instrucción + G9: opciones más grandes
import { useState } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';

export default function CompletarSerie({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const [seleccionado, setSeleccionado] = useState(null);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  function elegir(op) {
    if (seleccionado) return;
    setSeleccionado(op);
    if (op === ejercicio.respuestaCorrecta) onCorrecto();
    else { onIncorrecto(); setTimeout(() => setSeleccionado(null), 700); }
  }

  const pista = intentos >= 2 ? `Respuesta: ${ejercicio.respuestaCorrecta}` : intentos === 1 ? 'Fíjate en el patrón de la serie.' : null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-5">
        <BotonAudio texto={ejercicio.enunciado ?? 'Completa la serie'} idioma={idioma} />
        <p className="text-base font-semibold text-gray-600 mb-3 pr-12">Completa la serie:</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {ejercicio.serie?.map((elemento, i) => (
            <div
              key={i}
              className={`w-14 h-14 flex items-center justify-center rounded-xl text-xl font-bold border-2 ${
                elemento === null
                  ? 'border-dashed border-blue-400 bg-blue-50 text-blue-400 text-2xl'
                  : 'border-gray-200 bg-gray-50 text-gray-700'
              }`}
            >
              {elemento ?? '?'}
            </div>
          ))}
        </div>
        {/* G6 */}
        <ChipInstruccion tipo="CompletarSerie" />
        {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
      </div>

      {/* G9: opciones más grandes */}
      <div className="flex gap-3 justify-center">
        {ejercicio.opciones?.map((op, i) => {
          const esCorrecta = op === ejercicio.respuestaCorrecta;
          const esSel = seleccionado === op;
          return (
            <button
              key={i}
              onClick={() => elegir(op)}
              className={`w-24 h-24 text-2xl font-bold rounded-2xl border-2 shadow transition-all active:scale-95 ${
                esSel
                  ? esCorrecta ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-50 border-red-300 text-red-600'
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
              }`}
            >
              {op}
            </button>
          );
        })}
      </div>
    </div>
  );
}
