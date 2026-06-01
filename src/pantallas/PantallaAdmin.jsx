import { useState, useEffect } from 'react';
import useSesionStore from '../store/sesionStore';
import useGamificacionStore from '../store/gamificacionStore';
import { getAllSubjectStats, getRecentSessions, resetAllProgress } from '../datos/db';
import { checkAndSyncContent } from '../datos/contentSync';
import { ASIGNATURAS } from './PantallaInicio';
import { BtnVolver } from './PantallaFichas';

function Semaforo({ accuracy }) {
  if (accuracy === null || accuracy === undefined) return <span className="text-gray-300 text-2xl">⚪</span>;
  if (accuracy >= 0.75) return <span className="text-2xl">🟢</span>;
  if (accuracy >= 0.50) return <span className="text-2xl">🟡</span>;
  return <span className="text-2xl">🔴</span>;
}

function BarraSVG({ valor, max, color }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <svg width="100%" height="20" aria-hidden="true">
      <rect x={0} y={4} width="100%" height={12} rx={6} fill="#e5e7eb" />
      <rect x={0} y={4} width={`${pct}%`} height={12} rx={6} fill={color} />
    </svg>
  );
}

const INSIGNIAS_META = {
  'primera-sesion':    { emoji: '🏅', nombre: 'Primera sesión' },
  'racha-3':           { emoji: '🔥', nombre: 'Racha 3 días' },
  'racha-7':           { emoji: '🌟', nombre: 'Racha 7 días' },
  '100-ejercicios':    { emoji: '💯', nombre: '100 ejercicios' },
  'todas-asignaturas': { emoji: '🎓', nombre: 'Todas las asig.' },
  'nivel-2':           { emoji: '⬆️',  nombre: 'Nivel 2' },
  'nivel-3':           { emoji: '🚀', nombre: 'Nivel 3' },
};

export default function PantallaAdmin() {
  const profileId     = useSesionStore(s => s.profileId);
  const irA           = useSesionStore(s => s.irA);
  const { xpTotal, rachaDias, rachaMaxima, insignias } = useGamificacionStore();

  const [stats, setStats]               = useState([]);
  const [detalle, setDetalle]           = useState(null);
  const [detalleStats, setDetalleStats] = useState(null);
  const [updateEstado, setUpdateEstado] = useState(null);
  const [resetEstado, setResetEstado]   = useState(null); // null | 'confirm' | 'done'

  useEffect(() => {
    if (!profileId) return;
    getAllSubjectStats(profileId).then(setStats);
  }, [profileId]);

  async function abrirDetalle(s) {
    setDetalle(s.subject);
    const sessions = await getRecentSessions(profileId, s.subject, 5);
    setDetalleStats({ stats: s, sessions });
  }

  function recargarStats() {
    getAllSubjectStats(profileId).then(setStats);
  }

  async function handleComprobarActualizacion() {
    if (!navigator.onLine) {
      setUpdateEstado('offline');
      setTimeout(() => setUpdateEstado(null), 4000);
      return;
    }
    setUpdateEstado('comprobando');
    try {
      const hayNuevo = await checkAndSyncContent();
      setUpdateEstado(hayNuevo ? 'actualizado' : 'sinCambios');
      if (hayNuevo) recargarStats();
    } catch {
      setUpdateEstado('error');
    }
    setTimeout(() => setUpdateEstado(null), 5000);
  }

  async function handleResetProgreso() {
    if (resetEstado !== 'confirm') { setResetEstado('confirm'); return; }
    await resetAllProgress(profileId);
    setResetEstado('done');
    setTimeout(() => setResetEstado(null), 3000);
  }

  const meta = (id) => ASIGNATURAS.find(a => a.id === id);

  if (detalle && detalleStats) {
    const { stats: s, sessions } = detalleStats;
    const m = meta(detalle);
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-4 bg-white border-b">
          <BtnVolver onClick={() => { setDetalle(null); setDetalleStats(null); }} colorClass="text-gray-500 hover:bg-gray-100" />
          <span className="text-2xl">{m?.emoji}</span>
          <h1 className="text-xl font-bold">{m?.nombre}</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full">
          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-4 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-indigo-700">{s.nivelActual ?? 1}</p>
              <p className="text-xs text-gray-400">Nivel actual</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-green-600">{s.accuracy != null ? Math.round(s.accuracy * 100) : '—'}%</p>
              <p className="text-xs text-gray-400">Precisión</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-700">{s.totalAttempts ?? 0}</p>
              <p className="text-xs text-gray-400">Intentos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-yellow-600">{s.correctAttempts ?? 0}</p>
              <p className="text-xs text-gray-400">Correctos</p>
            </div>
          </div>

          {/* Accuracy bar */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">Precisión global</p>
            <BarraSVG valor={s.accuracy ?? 0} max={1} color={s.accuracy >= 0.75 ? '#22c55e' : s.accuracy >= 0.5 ? '#eab308' : '#ef4444'} />
            <p className="text-right text-xs text-gray-400 mt-1">{s.accuracy != null ? Math.round(s.accuracy * 100) : 0}%</p>
          </div>

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-sm font-semibold text-gray-600 mb-3">Últimas sesiones</p>
              <div className="space-y-2">
                {sessions.map(ses => (
                  <div key={ses.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{new Date(ses.startTime).toLocaleDateString('es-ES')}</span>
                    <span className="font-medium">{ses.correctCount ?? 0}/{ses.totalExercises ?? 0} ✅</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 bg-white border-b shadow-sm">
        <BtnVolver onClick={() => irA('inicio')} colorClass="text-gray-500 hover:bg-gray-100" />
        <h1 className="text-xl font-extrabold text-gray-800">Panel de administración</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-4">
        {/* Actualización de contenido */}
        <button
          onClick={handleComprobarActualizacion}
          disabled={updateEstado === 'comprobando'}
          className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-5 rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <span className="text-2xl">{updateEstado === 'comprobando' ? '⏳' : '🔄'}</span>
          <span>{updateEstado === 'comprobando' ? 'Buscando actualizaciones…' : 'Comprobar contenido nuevo'}</span>
        </button>

        {updateEstado === 'actualizado' && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-3 text-sm text-green-800 font-semibold text-center animate-aparecer">
            ✅ ¡Contenido actualizado! Nuevas fichas y ejercicios descargados.
          </div>
        )}
        {updateEstado === 'sinCambios' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm text-gray-600 text-center animate-aparecer">
            ✓ Ya tienes la versión más reciente del contenido.
          </div>
        )}
        {updateEstado === 'offline' && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-sm text-amber-700 text-center animate-aparecer">
            📡 Sin conexión. Conéctate e inténtalo de nuevo.
          </div>
        )}
        {updateEstado === 'error' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 text-center animate-aparecer">
            ❌ Error al comprobar. Inténtalo de nuevo.
          </div>
        )}

        {/* Reiniciar progreso */}
        <button
          onClick={handleResetProgreso}
          className={`w-full font-bold py-4 px-5 rounded-2xl shadow-md flex items-center justify-center gap-3 transition-all active:scale-95 ${
            resetEstado === 'confirm'
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <span className="text-2xl">🗑️</span>
          <span>
            {resetEstado === 'confirm'
              ? '¿Seguro? Toca de nuevo para confirmar'
              : 'Reiniciar progreso del camino'}
          </span>
        </button>
        {resetEstado === 'done' && (
          <div className="bg-green-50 border border-green-300 rounded-2xl p-3 text-sm text-green-800 text-center animate-aparecer">
            ✅ Progreso reiniciado. Las fichas vuelven a gris.
          </div>
        )}

        {/* Global summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 justify-around">
          <div className="text-center">
            <p className="text-3xl font-extrabold text-orange-500">🔥 {rachaDias}</p>
            <p className="text-xs text-gray-400">Racha actual</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-yellow-600">⭐ {xpTotal}</p>
            <p className="text-xs text-gray-400">XP total</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-extrabold text-purple-600">{rachaMaxima}</p>
            <p className="text-xs text-gray-400">Racha máxima</p>
          </div>
        </div>

        {/* Insignias */}
        {insignias.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">Insignias desbloqueadas</p>
            <div className="flex flex-wrap gap-2">
              {insignias.map(id => {
                const ins = INSIGNIAS_META[id];
                return ins ? (
                  <span key={id} className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 text-sm" title={ins.nombre}>
                    {ins.emoji} <span className="text-indigo-700 text-xs">{ins.nombre}</span>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Subject traffic lights */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 px-1">Asignaturas</p>
          {ASIGNATURAS.map(asig => {
            const s = stats.find(x => x.subject === asig.id);
            const accuracy = s?.accuracy ?? null;
            const nivel    = s?.nivelActual ?? 1;

            return (
              <div key={asig.id} className={`${asig.bg} border ${asig.border} rounded-2xl p-4 flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{asig.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-800">{asig.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Nivel {nivel} · {accuracy != null ? `${Math.round(accuracy * 100)}%` : 'Sin datos'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Semaforo accuracy={accuracy} />
                  {s && (
                    <button
                      onClick={() => abrirDetalle(s)}
                      className="text-xs bg-white/80 border border-gray-200 px-2 py-1 rounded-lg hover:bg-white transition-colors text-gray-600"
                    >
                      Ver detalle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
