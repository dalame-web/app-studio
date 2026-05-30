import { useState, useCallback } from 'react';
import useSesionStore from '../store/sesionStore';
import { logExercise } from '../datos/db';

import EleccionMultiple   from './tipos/EleccionMultiple';
import RellenarHueco      from './tipos/RellenarHueco';
import ArrastrarPalabras  from './tipos/ArrastrarPalabras';
import OrdenarFrase       from './tipos/OrdenarFrase';
import UnirColumnas       from './tipos/UnirColumnas';
import ClasificarGrupos   from './tipos/ClasificarGrupos';
import CompletarSerie     from './tipos/CompletarSerie';
import SopaLetras         from './tipos/SopaLetras';
import MemoriaPareja      from './tipos/MemoriaPareja';
import ProblemaVisual     from './tipos/ProblemaVisual';
import ComprensionLectora from './tipos/ComprensionLectora';

const COMPONENTES = {
  EleccionMultiple,
  RellenarHueco,
  ArrastrarPalabras,
  OrdenarFrase,
  UnirColumnas,
  ClasificarGrupos,
  CompletarSerie,
  SopaLetras,
  MemoriaPareja,
  ProblemaVisual,
  ComprensionLectora,
};

export default function MotorEjercicio({ ejercicio, asignatura, fichaContenido }) {
  const [intentos, setIntentos]  = useState(0);
  const [feedback, setFeedback]  = useState(null); // null | 'correcto' | 'incorrecto'
  const sesionId     = useSesionStore(s => s.sesionId);
  const profileId    = useSesionStore(s => s.profileId);
  const registrarCorrecto   = useSesionStore(s => s.registrarCorrecto);
  const registrarIncorrecto = useSesionStore(s => s.registrarIncorrecto);

  const handleCorrecto = useCallback(async () => {
    setFeedback('correcto');
    await logExercise({
      profileId,
      subject: ejercicio.subject ?? asignatura,
      exerciseId: ejercicio.id,
      exerciseType: ejercicio.tipo,
      fichaId: ejercicio.fichaId,
      correct: true,
      attemptsBeforeCorrect: intentos,
      sessionId: sesionId,
      nivel: ejercicio.nivel ?? 1,
    });
    setTimeout(() => {
      setFeedback(null);
      setIntentos(0);
      registrarCorrecto();
    }, 600);
  }, [ejercicio, intentos, profileId, sesionId, asignatura, registrarCorrecto]);

  const handleIncorrecto = useCallback(async (numIntentos = 1) => {
    const nuevosIntentos = intentos + 1;
    setIntentos(nuevosIntentos);
    setFeedback('incorrecto');

    if (nuevosIntentos >= 3) {
      await logExercise({
        profileId,
        subject: ejercicio.subject ?? asignatura,
        exerciseId: ejercicio.id,
        exerciseType: ejercicio.tipo,
        fichaId: ejercicio.fichaId,
        correct: false,
        attemptsBeforeCorrect: nuevosIntentos,
        sessionId: sesionId,
        nivel: ejercicio.nivel ?? 1,
      });
      setTimeout(() => {
        setFeedback(null);
        setIntentos(0);
        registrarIncorrecto();
      }, 2500);
    } else {
      setTimeout(() => setFeedback(null), 600);
    }
  }, [ejercicio, intentos, profileId, sesionId, asignatura, registrarIncorrecto]);

  const Componente = COMPONENTES[ejercicio.tipo];

  if (!Componente) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
        <div>
          <p className="text-4xl mb-2">🔧</p>
          <p>Tipo de ejercicio "<strong>{ejercicio.tipo}</strong>" pendiente de implementar.</p>
        </div>
      </div>
    );
  }

  // G8: feedback sin borde rojo — shake suave + emoji flotante
  return (
    <div className={`flex-1 flex flex-col relative ${
      feedback === 'incorrecto' ? 'animate-shake' : ''
    }`}>
      {/* Flash verde sutil en correcto */}
      {feedback === 'correcto' && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-green-200/40 animate-correcto-flash z-10" />
      )}
      {/* Emoji flotante en incorrecto */}
      {feedback === 'incorrecto' && (
        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 text-3xl z-20 animate-aparecer">
          😅
        </div>
      )}
      <Componente
        ejercicio={ejercicio}
        intentos={intentos}
        fichaContenido={fichaContenido}
        asignatura={asignatura}
        onCorrecto={handleCorrecto}
        onIncorrecto={handleIncorrecto}
      />
    </div>
  );
}
