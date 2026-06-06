// G6: instrucción
import { useState } from 'react';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';

function mezclar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function UnirColumnas({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const parejas   = ejercicio.parejas ?? [];
  const izquierda = parejas.map(p => p.izquierda);
  const [derecha] = useState(() => mezclar(parejas.map(p => p.derecha)));
  const [selIzq, setSelIzq]         = useState(null);
  const [conexiones, setConexiones] = useState({});
  const [validado, setValidado]     = useState(false);
  const [resultado, setResultado]   = useState(null);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  function clickIzq(item) { if (!validado) setSelIzq(item); }

  function clickDer(item) {
    if (validado || !selIzq) return;
    setConexiones(prev => ({ ...prev, [selIzq]: item }));
    setSelIzq(null);
  }

  function comprobar() {
    const correcto = parejas.every(p => conexiones[p.izquierda] === p.derecha);
    setValidado(true);
    setResultado(correcto);
    if (correcto) {
      setTimeout(() => onCorrecto(), 800);
    } else {
      setTimeout(() => {
        onIncorrecto();
        setConexiones({});
        setValidado(false);
        setResultado(null);
      }, 1200);
    }
  }

  const pistaTexto = ejercicio.pista ?? 'Fíjate bien en el significado.';
  const pista = intentos === 1 ? pistaTexto : intentos >= 2 ? 'Revisa las conexiones en la ficha.' : null;
  const todosConectados = parejas.every(p => conexiones[p.izquierda]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-5">
        <BotonAudio texto={ejercicio.enunciado ?? 'Une cada elemento con su par'} idioma={idioma} />
        <p className="text-base font-semibold text-gray-600 pr-12">{ejercicio.enunciado ?? 'Une cada elemento con su pareja:'}</p>
        <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
        {/* G6 */}
        <ChipInstruccion tipo="UnirColumnas" />
        {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
      </div>

      <div className="flex gap-3">
        {/* Columna izquierda */}
        <div className="flex-1 flex flex-col gap-2">
          {izquierda.map(item => {
            const conectado = conexiones[item];
            const esSel = selIzq === item;
            return (
              <button
                key={item}
                onClick={() => clickIzq(item)}
                className={`py-3 px-3 rounded-xl border-2 text-sm font-semibold text-left transition-all min-h-[52px] ${
                  esSel ? 'border-blue-500 bg-blue-50' :
                  conectado ? (validado
                    ? (resultado ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50')
                    : 'border-indigo-300 bg-indigo-50') :
                  'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                <span>{item}</span>
                {conectado && <span className="block text-xs text-indigo-500 mt-0.5 font-normal">→ {conectado}</span>}
              </button>
            );
          })}
        </div>

        {/* Columna derecha */}
        <div className="flex-1 flex flex-col gap-2">
          {derecha.map(item => {
            const yaUsado = Object.values(conexiones).includes(item);
            return (
              <button
                key={item}
                onClick={() => clickDer(item)}
                disabled={yaUsado && !validado}
                className={`py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-all min-h-[52px] ${
                  yaUsado ? 'border-gray-100 bg-gray-50 text-gray-400' :
                  selIzq ? 'border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50' :
                  'border-gray-200 bg-white'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={comprobar}
        disabled={!todosConectados || validado}
        className="py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl shadow transition-all active:scale-95"
      >
        Comprobar ✓
      </button>
    </div>
  );
}
