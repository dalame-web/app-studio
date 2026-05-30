// M2: título asignatura visual con emoji + color
// G5/L1: botón volver + modal confirmación
import { useState } from 'react';
import useSesionStore from '../store/sesionStore';
import BarraProgreso from '../components/BarraProgreso';
import MotorEjercicio from '../ejercicios/MotorEjercicio';
import Modal from '../components/Modal';
import { ASIGNATURAS } from './PantallaInicio';
import { BtnVolver } from './PantallaFichas';

export default function PantallaEjercicio() {
  const ejercicios   = useSesionStore(s => s.ejercicios);
  const ejercicioIdx = useSesionStore(s => s.ejercicioIdx);
  const correctas    = useSesionStore(s => s.correctas);
  const asignatura   = useSesionStore(s => s.asignaturaActual);
  const fichaActual  = useSesionStore(s => s.fichaActual);
  const volverAInicio = useSesionStore(s => s.volverAInicio);

  const [modalSalir, setModalSalir] = useState(false);

  const ejercicioActual = ejercicios[ejercicioIdx] ?? null;
  const meta = ASIGNATURAS.find(a => a.id === asignatura);

  if (!ejercicioActual) return null;

  function handleVolver() {
    window.speechSynthesis?.cancel?.();
    setModalSalir(true);
  }

  function confirmarSalida() {
    setModalSalir(false);
    volverAInicio();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          {/* G5: botón volver — G4 estilo */}
          <BtnVolver onClick={handleVolver} colorClass="text-gray-400 hover:bg-gray-100" />

          {/* M2: chip asignatura visual */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${meta?.bg ?? 'bg-gray-100'} ${meta?.text ?? 'text-gray-700'}`}>
            <span>{meta?.emoji}</span>
            <span className="truncate max-w-[160px]">{fichaActual?.titulo ?? meta?.nombre}</span>
          </div>

          <span className="ml-auto text-xs font-bold text-gray-400">
            {ejercicioIdx + 1}/{ejercicios.length}
          </span>
        </div>

        <BarraProgreso
          actual={ejercicioIdx}
          total={ejercicios.length}
          correctas={correctas}
        />
      </header>

      <main className="flex-1 flex flex-col px-4 py-2 overflow-y-auto">
        <MotorEjercicio
          ejercicio={ejercicioActual}
          asignatura={asignatura}
          fichaContenido={fichaActual?.contenido ?? ''}
        />
      </main>

      {/* G5: modal confirmación salida */}
      {modalSalir && (
        <Modal title="¿Abandonar la sesión?" onClose={() => setModalSalir(false)}>
          <p className="text-gray-600 text-sm mb-5">Si sales ahora perderás el progreso de esta sesión.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setModalSalir(false)}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors"
            >
              Seguir practicando 💪
            </button>
            <button
              onClick={confirmarSalida}
              className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold transition-colors"
            >
              Salir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
