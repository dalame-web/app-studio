// G6: instrucción + G9: iconos más grandes + I1: soporte imágenes/SVG
import { useState } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';

export default function EleccionMultiple({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const [seleccionado, setSeleccionado] = useState(null);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  function elegir(opcion) {
    if (seleccionado) return;
    setSeleccionado(opcion.texto);
    if (opcion.texto === ejercicio.respuestaCorrecta) {
      onCorrecto();
    } else {
      onIncorrecto();
    }
    setTimeout(() => setSeleccionado(null), 700);
  }

  const pista = intentos === 1
    ? 'Pista: busca la respuesta en la ficha.'
    : intentos >= 2
    ? `Respuesta correcta: ${ejercicio.respuestaCorrecta}`
    : null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-5">
        <BotonAudio texto={ejercicio.enunciado} idioma={idioma} />
        <p className={`text-lg font-semibold text-gray-800 pr-12 leading-snug ${intentos === 1 ? 'text-amber-700' : ''}`}>
          {ejercicio.enunciado}
        </p>
        {/* I1: imagen/SVG en el enunciado */}
        <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
        {/* G6 */}
        <ChipInstruccion tipo="EleccionMultiple" />
        {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
        {intentos >= 3 && (
          <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">{fichaContenido}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ejercicio.opciones?.map((op, i) => {
          const esCorrecta = op.texto === ejercicio.respuestaCorrecta;
          const esSeleccionada = seleccionado === op.texto;
          let clases = 'flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 shadow-sm text-center font-semibold transition-all active:scale-95 min-h-[100px]';
          if (esSeleccionada) {
            clases += esCorrecta ? ' bg-green-100 border-green-400 text-green-800' : ' bg-red-50 border-red-300 text-red-700';
          } else {
            clases += ' bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700';
          }
          return (
            <button key={i} onClick={() => elegir(op)} className={clases}>
              {/* G9: emoji + I1: imagen/SVG en opción */}
              {op.emoji && <span className="text-4xl leading-none">{op.emoji}</span>}
              {op.svg   && <span className="[&_svg]:max-h-16 [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: op.svg }} />}
              {op.imagen && <img src={op.imagen} alt={op.texto} className="max-h-16 object-contain" />}
              <span className="text-base leading-tight">{op.texto}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
