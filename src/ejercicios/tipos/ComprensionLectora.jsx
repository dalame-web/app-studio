// G6: instrucción
import { useState } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';
import EleccionMultiple from './EleccionMultiple';
import RellenarHueco from './RellenarHueco';

export default function ComprensionLectora({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const preguntas = ejercicio.preguntas ?? [];
  const [fase, setFase]               = useState('lectura');
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const [correctas, setCorrectas]     = useState(0);
  const [preguntaIdx, setPreguntaIdx] = useState(0);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  if (fase === 'lectura') {
    return (
      <div className="flex flex-col gap-4 py-4">
        <div className="relative bg-white rounded-2xl shadow-sm p-5">
          <BotonAudio texto={ejercicio.texto} idioma={idioma} />
          <p className="text-sm font-semibold text-indigo-600 mb-2 pr-12">Lee el siguiente texto:</p>
          <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
          {/* G6 */}
          <ChipInstruccion tipo="ComprensionLectora" />
          <p className="text-gray-800 text-base leading-relaxed mt-2">{ejercicio.texto}</p>
        </div>
        <button
          onClick={() => setFase('preguntas')}
          className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-2xl shadow active:scale-95 transition-all"
        >
          Ya lo he leído → Contestar preguntas
        </button>
      </div>
    );
  }

  if (fase === 'preguntas') {
    if (preguntaIdx >= preguntas.length) {
      const accuracy = preguntas.length > 0 ? correctas / preguntas.length : 1;
      setTimeout(() => { if (accuracy >= 0.5) onCorrecto(); else onIncorrecto(); }, 0);
      return null;
    }

    const pregunta = preguntas[preguntaIdx];
    const ejercicioAdaptado = {
      id: `${ejercicio.id}-p${preguntaIdx}`,
      fichaId: ejercicio.fichaId,
      subject: ejercicio.subject,
      tipo: pregunta.tipo,
      nivel: ejercicio.nivel,
      enunciado: pregunta.enunciado,
      opciones: pregunta.opciones,
      respuestaCorrecta: pregunta.respuestaCorrecta,
      tiempoEstimado: 30,
    };

    const avanzar = (correcto) => {
      if (correcto) setCorrectas(c => c + 1);
      setPreguntaIdx(i => i + 1);
    };

    return (
      <div className="flex flex-col gap-3 py-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400 font-medium">Pregunta {preguntaIdx + 1} de {preguntas.length}</p>
          <button
            onClick={() => setMostrarTexto(v => !v)}
            className="text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-50 transition-colors"
          >
            {mostrarTexto ? 'Ocultar texto' : '📖 Ver texto'}
          </button>
        </div>

        {mostrarTexto && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed">
            {ejercicio.texto}
          </div>
        )}

        {pregunta.tipo === 'EleccionMultiple' ? (
          <EleccionMultiple
            ejercicio={ejercicioAdaptado}
            intentos={intentos}
            fichaContenido={fichaContenido}
            asignatura={asignatura}
            onCorrecto={() => avanzar(true)}
            onIncorrecto={() => avanzar(false)}
          />
        ) : (
          <RellenarHueco
            ejercicio={ejercicioAdaptado}
            intentos={intentos}
            fichaContenido={fichaContenido}
            asignatura={asignatura}
            onCorrecto={() => avanzar(true)}
            onIncorrecto={() => avanzar(false)}
          />
        )}
      </div>
    );
  }

  return null;
}
