// G4: botón volver mejorado
// L2: color lengua sincronizado con PantallaInicio
// I2/I3: camino visual Duolingo + progreso por ficha
import { useState, useEffect } from 'react';
import useSesionStore from '../store/sesionStore';
import { getFichasBySubject } from '../datos/db';
import { ASIGNATURAS } from './PantallaInicio';
import CaminoFichas from '../components/CaminoFichas';

// G4: componente botón volver mejorado
function BtnVolver({ onClick, colorClass = 'text-gray-600 hover:bg-gray-100' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Volver"
      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all active:scale-90 ${colorClass}`}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="9" strokeOpacity="0.25" fill="white" fillOpacity="0.6" />
        <path d="M13 7l-4 4 4 4" />
      </svg>
    </button>
  );
}

export { BtnVolver };

export default function PantallaFichas() {
  const asignatura       = useSesionStore(s => s.asignaturaActual);
  const seleccionarFicha = useSesionStore(s => s.seleccionarFicha);
  const profileId        = useSesionStore(s => s.profileId);
  const irA              = useSesionStore(s => s.irA);

  const [fichas, setFichas]     = useState([]);
  const [cargando, setCargando] = useState(true);

  const meta = ASIGNATURAS.find(a => a.id === asignatura);

  useEffect(() => {
    if (!asignatura) return;
    getFichasBySubject(asignatura).then(f => {
      setFichas(f.sort((a, b) => a.nivel - b.nivel));
      setCargando(false);
    });
  }, [asignatura]);

  return (
    <div className={`min-h-screen flex flex-col ${meta?.bg ?? 'bg-gray-50'}`}>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-5 pb-3 bg-white/60 backdrop-blur-sm border-b border-black/5">
        <BtnVolver onClick={() => irA('inicio')} colorClass={`${meta?.text ?? 'text-gray-600'} hover:bg-black/5`} />
        <span className="text-3xl leading-none">{meta?.emoji}</span>
        <div>
          <h1 className={`text-xl font-extrabold ${meta?.text ?? 'text-gray-800'}`}>{meta?.nombre}</h1>
          <p className="text-gray-400 text-xs">{fichas.length} fichas disponibles</p>
        </div>
      </header>

      {/* Camino visual estilo Duolingo */}
      <main className="flex-1 overflow-y-auto pb-8">
        {cargando ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Cargando fichas…</div>
        ) : (
          <CaminoFichas
            fichas={fichas}
            meta={meta}
            profileId={profileId}
            onSelectFicha={seleccionarFicha}
          />
        )}
      </main>
    </div>
  );
}
