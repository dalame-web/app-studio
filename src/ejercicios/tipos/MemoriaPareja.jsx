// G6: instrucción + G9: tarjetas más grandes
import { useState, useCallback } from 'react';
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

export default function MemoriaPareja({ ejercicio, asignatura, onCorrecto }) {
  const parejas = ejercicio.parejas ?? [];
  const [cartas] = useState(() => {
    const todas = parejas.flatMap((p, i) => [
      { id: `a-${i}`, grupoId: i, valor: p.a },
      { id: `b-${i}`, grupoId: i, valor: p.b },
    ]);
    return mezclar(todas);
  });
  const [volteadas, setVolteadas]     = useState(new Set());
  const [encontradas, setEncontradas] = useState(new Set());
  const [bloqueado, setBloqueado]     = useState(false);
  const [intentos, setIntentos]       = useState(0);
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  const voltear = useCallback((carta) => {
    if (bloqueado || volteadas.has(carta.id) || encontradas.has(carta.grupoId)) return;

    const nuevasVolteadas = new Set([...volteadas, carta.id]);
    const visibles = cartas.filter(c => nuevasVolteadas.has(c.id) && !encontradas.has(c.grupoId));

    if (visibles.length === 2) {
      setBloqueado(true);
      setIntentos(i => i + 1);
      if (visibles[0].grupoId === visibles[1].grupoId) {
        const nuevasEncontradas = new Set([...encontradas, visibles[0].grupoId]);
        setEncontradas(nuevasEncontradas);
        setVolteadas(new Set());
        setBloqueado(false);
        if (nuevasEncontradas.size === parejas.length) setTimeout(() => onCorrecto(), 500);
      } else {
        setVolteadas(nuevasVolteadas);
        setTimeout(() => { setVolteadas(new Set()); setBloqueado(false); }, 1000);
      }
    } else {
      setVolteadas(nuevasVolteadas);
    }
  }, [bloqueado, volteadas, encontradas, cartas, parejas.length, onCorrecto]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="relative bg-white rounded-2xl shadow-sm p-4">
        <BotonAudio texto={ejercicio.enunciado ?? 'Encuentra los pares'} idioma={idioma} />
        <p className="text-base font-semibold text-gray-600 pr-12">{ejercicio.enunciado ?? 'Encuentra los pares de tarjetas:'}</p>
        {/* G6 */}
        <ChipInstruccion tipo="MemoriaPareja" />
        <p className="text-xs text-gray-400 mt-1">Intentos: {intentos} · Pares: {encontradas.size}/{parejas.length}</p>
      </div>

      {/* G9: grid 3x4, tarjetas más grandes */}
      <div className="grid grid-cols-4 gap-2">
        {cartas.map(carta => {
          const visible = volteadas.has(carta.id) || encontradas.has(carta.grupoId);
          const acierto = encontradas.has(carta.grupoId);
          return (
            <button
              key={carta.id}
              onClick={() => voltear(carta)}
              className={`aspect-square flex items-center justify-center rounded-xl text-lg font-bold border-2 transition-all select-none min-h-[70px] ${
                acierto ? 'border-green-300 bg-green-50 text-green-800' :
                visible  ? 'border-blue-300 bg-blue-50 text-gray-800' :
                'border-gray-200 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-transparent'
              }`}
            >
              {visible ? carta.valor : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
