// G6: instrucción
import { useState, useRef } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';

function normalizar(s) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function RellenarHueco({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const [valor, setValor] = useState('');
  const inputRef = useRef(null);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';
  const partes = ejercicio.enunciado.split('[___]');

  function confirmar() {
    if (!valor.trim()) return;
    if (normalizar(valor) === normalizar(ejercicio.respuestaCorrecta)) {
      onCorrecto();
      setValor('');
    } else {
      onIncorrecto();
      setValor('');
      inputRef.current?.focus();
    }
  }

  const pistaTexto = ejercicio.pista ?? 'Pista: busca la respuesta en la ficha.';
  const pista = intentos === 1 ? pistaTexto : intentos >= 2 ? `Respuesta: ${ejercicio.respuestaCorrecta}` : null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-5">
        <BotonAudio texto={ejercicio.enunciado.replace('[___]', '...')} idioma={idioma} />
        <div className={`text-lg font-semibold text-gray-800 leading-relaxed pr-12 flex flex-wrap items-center gap-1 ${intentos === 1 ? 'text-amber-700' : ''}`}>
          <span>{partes[0]}</span>
          <input
            ref={inputRef}
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmar()}
            className="border-b-2 border-blue-400 outline-none px-1 text-blue-700 bg-transparent min-w-[80px] w-28 text-center font-bold focus:border-blue-600"
            placeholder="___"
            autoFocus
          />
          {partes[1] && <span>{partes[1]}</span>}
        </div>
        <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
        {/* G6 */}
        <ChipInstruccion tipo="RellenarHueco" />
        {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
        {intentos >= 3 && (
          <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">{fichaContenido}</p>
        )}
      </div>
      <button
        onClick={confirmar}
        disabled={!valor.trim()}
        className="py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl shadow transition-all active:scale-95"
      >
        Comprobar ✓
      </button>
    </div>
  );
}
