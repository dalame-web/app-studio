import { useEffect, useState } from 'react';
import useSesionStore from './store/sesionStore';
import useGamificacionStore from './store/gamificacionStore';
import PantallaInicio from './pantallas/PantallaInicio';
import PantallaFichas from './pantallas/PantallaFichas';
import PantallaEjercicio from './pantallas/PantallaEjercicio';
import PantallaResultado from './pantallas/PantallaResultado';
import PantallaAdmin from './pantallas/PantallaAdmin';
import VisorFicha from './components/VisorFicha';
import { getOrCreateDefaultProfile } from './datos/db';
import { initContent } from './datos/contentSync';

function Cargando() {
  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl mb-4 animate-bounce">📚</div>
        <p className="text-2xl font-bold text-sky-700">Cargando…</p>
      </div>
    </div>
  );
}

export default function App() {
  const pantallaActual = useSesionStore(s => s.pantallaActual);
  const setProfileId   = useSesionStore(s => s.setProfileId);
  const cargarGami     = useGamificacionStore(s => s.cargar);
  const [listo, setListo] = useState(false);

  // G2: cancelar voz al cambiar de pantalla
  useEffect(() => {
    window.speechSynthesis?.cancel?.();
  }, [pantallaActual]);

  useEffect(() => {
    async function init() {
      try {
        await initContent();
        const profile = await getOrCreateDefaultProfile();
        setProfileId(profile.id);
        await cargarGami(profile.id);
      } catch (e) {
        console.error('[App] init error:', e);
      } finally {
        setListo(true);
      }
    }
    init();
  }, []);

  if (!listo) return <Cargando />;

  return (
    <div className="min-h-screen">
      {pantallaActual === 'inicio'     && <PantallaInicio />}
      {pantallaActual === 'fichas'     && <PantallaFichas />}
      {pantallaActual === 'visorFicha' && <VisorFicha />}
      {pantallaActual === 'ejercicio'  && <PantallaEjercicio />}
      {pantallaActual === 'resultado'  && <PantallaResultado />}
      {pantallaActual === 'admin'      && <PantallaAdmin />}
    </div>
  );
}
