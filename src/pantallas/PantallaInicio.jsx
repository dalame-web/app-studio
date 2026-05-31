import { useState, useEffect } from 'react';
import useSesionStore from '../store/sesionStore';
import useGamificacionStore from '../store/gamificacionStore';
import { getAllSubjectStats } from '../datos/db';
import Modal from '../components/Modal';

export const ASIGNATURAS = [
  { id: 'matematicas', nombre: 'Matemáticas',       emoji: '🔢', bg: 'bg-blue-100',   border: 'border-blue-300',   text: 'text-blue-800'   },
  { id: 'lengua',      nombre: 'Lengua',             emoji: '📚', bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-800'  }, // L2
  { id: 'ciencias',   nombre: 'Ciencias Naturales', emoji: '🌿', bg: 'bg-green-100',  border: 'border-green-300',  text: 'text-green-800'  },
  { id: 'social',     nombre: 'Ciencias Sociales',  emoji: '🌍', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  { id: 'ingles',     nombre: 'Inglés',             emoji: '🇬🇧', bg: 'bg-red-100',    border: 'border-red-300',    text: 'text-red-800'    },
  { id: 'valores',    nombre: 'Valores Cívicos',    emoji: '🤝', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
];

function semaforo(accuracy) {
  if (accuracy === null || accuracy === undefined) return null;
  if (accuracy >= 0.75) return '🟢';
  if (accuracy >= 0.50) return '🟡';
  return '🔴';
}

const PIN_CORRECTO = '1234';

export default function PantallaInicio() {
  const seleccionarAsignatura = useSesionStore(s => s.seleccionarAsignatura);
  const profileId             = useSesionStore(s => s.profileId);
  const irA                   = useSesionStore(s => s.irA);
  const { rachaDias, xpTotal } = useGamificacionStore();

  const [stats, setStats]       = useState({});
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin]           = useState('');
  const [pinError, setPinError] = useState(false);

  // PWA install prompt
  const [installEvt, setInstallEvt]       = useState(null);
  const [yaInstalada, setYaInstalada]     = useState(false);
  const [modalInstalar, setModalInstalar] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    getAllSubjectStats(profileId).then(all => {
      const map = {};
      all.forEach(s => { map[s.subject] = s; });
      setStats(map);
    });
  }, [profileId]);

  useEffect(() => {
    // Guardar prompt nativo si llega (no llega en Family Link)
    const handler = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener('beforeinstallprompt', handler);

    // Detectar si ya está instalada como app standalone
    const instalada = window.matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
    setYaInstalada(instalada);

    const onInstall = () => setYaInstalada(true);
    window.addEventListener('appinstalled', onInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstall);
    };
  }, []);

  async function handleInstalar() {
    if (installEvt) {
      // Navegador soporta prompt nativo (PC, Android sin Family Link)
      installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      if (outcome === 'accepted') setYaInstalada(true);
      setInstallEvt(null);
    } else {
      // Family Link u otro navegador: mostrar instrucciones manuales
      setModalInstalar(true);
    }
  }

  function abrirAdmin() { setPinModal(true); setPin(''); setPinError(false); }

  function comprobarPin() {
    if (pin === PIN_CORRECTO) { setPinModal(false); irA('admin'); }
    else { setPinError(true); setPin(''); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-blue-200 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-2">
        <div className="flex items-center gap-3">
          {rachaDias > 0 && (
            <span className="flex items-center gap-1 bg-orange-100 border border-orange-300 rounded-full px-3 py-1 text-sm font-bold text-orange-700">
              🔥 {rachaDias} {rachaDias === 1 ? 'día' : 'días'}
            </span>
          )}
          {xpTotal > 0 && (
            <span className="flex items-center gap-1 bg-yellow-100 border border-yellow-300 rounded-full px-3 py-1 text-sm font-bold text-yellow-700">
              ⭐ {xpTotal} XP
            </span>
          )}
        </div>
        <button
          onClick={abrirAdmin}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-300/50 transition-colors text-xl"
          aria-label="Administración"
        >
          ⚙️
        </button>
      </header>

      {/* Title */}
      <div className="text-center px-4 py-6">
        <h1 className="text-4xl font-extrabold text-blue-900 drop-shadow-sm">¡A aprender!</h1>
        <p className="text-blue-700 mt-1 text-lg">¿Qué asignatura practicamos hoy?</p>

        {/* Botón instalar PWA — visible siempre que no esté instalada */}
        {!yaInstalada && (
          <button
            onClick={handleInstalar}
            className="mt-4 inline-flex items-center gap-2 bg-white border-2 border-blue-300 text-blue-700 font-bold px-5 py-2.5 rounded-2xl shadow-md hover:bg-blue-50 active:scale-95 transition-all animate-aparecer"
          >
            <span className="text-xl">📲</span>
            Instalar app
          </button>
        )}
      </div>

      {/* Subject grid */}
      <main className="flex-1 px-4 pb-8">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {ASIGNATURAS.map(asig => {
            const s     = stats[asig.id];
            const luz   = s ? semaforo(s.accuracy) : null;
            const nivel = s?.nivelActual ?? 1;

            return (
              <button
                key={asig.id}
                onClick={() => seleccionarAsignatura(asig.id)}
                className={`${asig.bg} border-2 ${asig.border} rounded-2xl p-5 flex flex-col items-center gap-2 shadow-md hover:shadow-xl active:scale-95 transition-all duration-150`}
              >
                <span className="text-5xl leading-none">{asig.emoji}</span>
                <span className={`text-base font-bold ${asig.text} text-center leading-tight`}>
                  {asig.nombre}
                </span>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {luz && <span>{luz}</span>}
                  <span>Nivel {nivel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Modal instrucciones instalación manual (Family Link / Safari) */}
      {modalInstalar && (
        <Modal title="Instalar app 📲" onClose={() => setModalInstalar(false)}>
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">Añade la app a la pantalla de inicio siguiendo estos pasos:</p>

            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <p className="font-bold text-blue-800">En Chrome (Android):</p>
              <ol className="space-y-2 text-blue-700">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Toca el menú <span className="font-mono bg-white px-1 rounded">⋮</span> (arriba a la derecha)</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> Pulsa <strong>"Añadir"</strong> para confirmar</li>
              </ol>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="font-bold text-gray-700">En Safari (iPhone/iPad):</p>
              <ol className="space-y-2 text-gray-600">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Toca el botón <span className="font-mono bg-white px-1 rounded border">⬆️</span> (compartir, abajo)</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Selecciona <strong>"Añadir a inicio"</strong></li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> Pulsa <strong>"Añadir"</strong></li>
              </ol>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Si la tablet tiene control parental activo,<br/>es posible que necesites aprobación del adulto.
            </p>

            <button
              onClick={() => setModalInstalar(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors"
            >
              Entendido ✓
            </button>
          </div>
        </Modal>
      )}

      {/* PIN Modal */}
      {pinModal && (
        <Modal title="Acceso de administrador" onClose={() => setPinModal(false)}>
          <div className="text-center">
            <p className="text-gray-600 mb-4">Introduce el PIN de 4 dígitos:</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={e => e.key === 'Enter' && comprobarPin()}
              className="border-2 border-gray-300 rounded-xl px-4 py-3 text-3xl text-center w-36 mb-3 focus:outline-none focus:border-blue-400 tracking-widest"
              placeholder="····"
              autoFocus
            />
            {pinError && (
              <p className="text-red-500 text-sm mb-3">PIN incorrecto. Inténtalo de nuevo.</p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setPinModal(false)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={comprobarPin}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
              >
                Entrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

