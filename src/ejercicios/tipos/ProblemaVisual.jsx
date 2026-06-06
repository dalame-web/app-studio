// G6: instrucción + G9: opciones más grandes
import { useState } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';

function VisualizadorEmoji({ visual }) {
  const { emoji = '🔵', cantidad = 5, operacion, cantidadOperacion = 0 } = visual;
  return (
    <div className="bg-amber-50 rounded-2xl p-4 text-center">
      <div className="flex flex-wrap justify-center gap-1 text-4xl mb-1">
        {Array.from({ length: cantidad }).map((_, i) => (
          <span key={i} className={
            operacion === 'resta' && i >= (cantidad - cantidadOperacion) ? 'opacity-25' : ''
          }>{emoji}</span>
        ))}
      </div>
      {operacion && (
        <p className="text-sm text-gray-500 font-medium mt-1">
          {operacion === 'resta' ? `${cantidad} − ${cantidadOperacion} = ?` :
           operacion === 'suma'  ? `${cantidad} + ${cantidadOperacion} = ?` : ''}
        </p>
      )}
    </div>
  );
}

function VisualizadorBarras({ barras }) {
  const max = Math.max(...barras.map(b => b.valor));
  const n = barras.length;
  const barW = Math.floor(220 / n) - 6;
  return (
    <div className="bg-amber-50 rounded-2xl p-4">
      <svg viewBox="0 0 260 140" className="w-full max-w-xs mx-auto">
        {barras.map((b, i) => {
          const h = Math.round((b.valor / max) * 95);
          const x = i * (barW + 6) + 10;
          return (
            <g key={i}>
              <rect x={x} y={100 - h} width={barW} height={h} fill={b.color} rx="3" />
              <text x={x + barW / 2} y={118} textAnchor="middle" fontSize="10" fill="#555">{b.label}</text>
              <text x={x + barW / 2} y={97 - h} textAnchor="middle" fontSize="11" fontWeight="bold" fill={b.color}>{b.valor}</text>
            </g>
          );
        })}
        <line x1="8" y1="100" x2="252" y2="100" stroke="#d1d5db" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function ProblemaVisual({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const [seleccionado, setSeleccionado] = useState(null);
  const [valor, setValor]               = useState('');
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';
  const esNumerico = ejercicio.esNumerico ?? false;

  function comprobarOpcion(op) {
    if (seleccionado) return;
    setSeleccionado(op);
    if (op === ejercicio.respuestaCorrecta) onCorrecto();
    else { onIncorrecto(); setTimeout(() => setSeleccionado(null), 700); }
  }

  function comprobarNumerico() {
    if (valor.trim() === String(ejercicio.respuestaCorrecta)) onCorrecto();
    else { onIncorrecto(); setValor(''); }
  }

  const pistaTexto = ejercicio.pista ?? 'Fíjate bien en el enunciado.';
  const pista = intentos === 1 ? pistaTexto : intentos >= 2 ? `Respuesta: ${ejercicio.respuestaCorrecta}` : null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-5">
        <BotonAudio texto={ejercicio.enunciado} idioma={idioma} />
        <p className={`text-base font-semibold text-gray-800 pr-12 leading-snug ${intentos === 1 ? 'text-amber-700' : ''}`}>
          {ejercicio.enunciado}
        </p>
        <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
        {/* G6 */}
        <ChipInstruccion tipo="ProblemaVisual" />
        {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
      </div>

      {ejercicio.visual?.tipo === 'barras'
        ? <VisualizadorBarras barras={ejercicio.visual.barras} />
        : ejercicio.visual && <VisualizadorEmoji visual={ejercicio.visual} />
      }

      {esNumerico ? (
        <div className="flex gap-3">
          <input
            type="number"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && comprobarNumerico()}
            className="flex-1 border-2 border-gray-300 rounded-2xl px-4 py-3 text-3xl text-center focus:outline-none focus:border-blue-400"
            placeholder="?"
          />
          <button
            onClick={comprobarNumerico}
            disabled={!valor}
            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow active:scale-95 transition-all"
          >
            Comprobar ✓
          </button>
        </div>
      ) : (
        // G9: opciones más grandes
        <div className="grid grid-cols-2 gap-3">
          {ejercicio.opciones?.map((op, i) => {
            const esSel = seleccionado === op;
            const esCorr = op === ejercicio.respuestaCorrecta;
            return (
              <button
                key={i}
                onClick={() => comprobarOpcion(op)}
                className={`py-5 rounded-2xl border-2 text-2xl font-bold transition-all active:scale-95 ${
                  esSel
                    ? (esCorr ? 'border-green-400 bg-green-100 text-green-800' : 'border-red-300 bg-red-50 text-red-700')
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                }`}
              >
                {op}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
