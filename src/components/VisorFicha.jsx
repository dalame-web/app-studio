import useSesionStore from '../store/sesionStore';
import BotonAudio from './BotonAudio';
import { seleccionarEjercicios } from '../datos/selector';
import { createSession } from '../datos/db';
import { BtnVolver } from '../pantallas/PantallaFichas';

export default function VisorFicha() {
  const ficha = useSesionStore(s => s.fichaActual);
  const profileId = useSesionStore(s => s.profileId);
  const asignatura = useSesionStore(s => s.asignaturaActual);
  const modo = useSesionStore(s => s.modoSesion);
  const iniciarSesion = useSesionStore(s => s.iniciarSesion);
  const irA = useSesionStore(s => s.irA);

  if (!ficha) return null;

  async function handleEmpezar() {
    const ejercicios = await seleccionarEjercicios(profileId, ficha.id, asignatura, modo);
    if (ejercicios.length === 0) {
      alert('No hay ejercicios disponibles para esta ficha todavía.');
      return;
    }
    const sesionId = await createSession({
      profileId,
      subject: asignatura,
      fichaId: ficha.id,
      modo,
      startTime: Date.now(),
      totalExercises: ejercicios.length,
      correctCount: 0,
      incorrectCount: 0,
    });
    iniciarSesion(sesionId, ejercicios);
  }

  const textoFicha = [ficha.titulo, ficha.contenido, ...(ficha.ejemplos ?? [])].join('. ');

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">
      {/* G4: botón volver mejorado */}
      <div className="p-4 flex items-center gap-2">
        <BtnVolver onClick={() => irA('fichas')} colorClass="text-indigo-500 hover:bg-indigo-100" />
        <span className="text-indigo-400 text-sm font-medium">{asignatura}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 max-w-2xl mx-auto w-full">
        <div className="relative bg-white rounded-2xl shadow-md p-6 mb-4">
          <BotonAudio texto={textoFicha} />
          <h1 className="text-2xl font-bold text-indigo-800 mb-3 pr-10">{ficha.titulo}</h1>
          <p className="text-gray-700 text-base leading-relaxed mb-4">{ficha.contenido}</p>

          {ficha.ejemplos?.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-indigo-700 mb-2">Ejemplos:</p>
              <ul className="space-y-1">
                {ficha.ejemplos.map((ej, i) => (
                  <li key={i} className="text-indigo-900 text-sm">• {ej}</li>
                ))}
              </ul>
            </div>
          )}

          {ficha.palabrasClave?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {ficha.palabrasClave.map(p => (
                <span key={p} className="bg-indigo-100 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full">
        <button
          onClick={handleEmpezar}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xl font-bold rounded-2xl shadow-lg transition-all"
        >
          ¡Ya estoy listo! 🚀
        </button>
        <p className="text-center text-gray-400 text-sm mt-2">
          Modo: {modo === 'corto' ? '⚡ Sesión corta (5-10 min)' : '📖 Repaso largo'}
        </p>
      </div>
    </div>
  );
}
