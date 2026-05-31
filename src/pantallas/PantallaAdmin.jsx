import { useState, useEffect } from 'react';
import useSesionStore from '../store/sesionStore';
import useGamificacionStore from '../store/gamificacionStore';
import { getAllSubjectStats, getRecentSessions, exportarContenidoCompleto } from '../datos/db';
import { checkAndSyncContent } from '../datos/contentSync';
import { ASIGNATURAS } from './PantallaInicio';
import { BtnVolver } from './PantallaFichas';
import PantallaImportar from './PantallaImportar';

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
  const [importarAbierto, setImportarAbierto] = useState(false);
  const [exportEstado, setExportEstado] = useState(null); // null | 'copiado' | 'descargado' | 'error' | 'vacio'
  const [updateEstado, setUpdateEstado] = useState(null); // null | 'comprobando' | 'actualizado' | 'sinCambios' | 'offline' | 'error'

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

  async function handlePublicar() {
    try {
      const contenido = await exportarContenidoCompleto();
      if (!contenido.fichas || contenido.fichas.length === 0) {
        setExportEstado('vacio');
        setTimeout(() => setExportEstado(null), 3000);
        return;
      }
      const jsonStr = JSON.stringify(contenido, null, 2);

      // Intentar copiar al portapapeles
      try {
        await navigator.clipboard.writeText(jsonStr);
        setExportEstado('copiado');
      } catch {
        // Si falla clipboard, descargar como fichero
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ejercicios.json';
        a.click();
        URL.revokeObjectURL(url);
        setExportEstado('descargado');
      }
      setTimeout(() => setExportEstado(null), 6000);
    } catch (e) {
      console.error(e);
      setExportEstado('error');
      setTimeout(() => setExportEstado(null), 3000);
    }
  }

  // Si el import está abierto, mostrarlo a pantalla completa
  if (importarAbierto) {
    return <PantallaImportar onClose={() => { setImportarAbierto(false); recargarStats(); }} />;
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
        {/* Acciones de contenido */}
        <div className="flex gap-3">
          <button
            onClick={() => setImportarAbierto(true)}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-3 rounded-2xl shadow-md flex flex-col items-center gap-1 transition-all active:scale-95"
          >
            <span className="text-2xl">📥</span>
            <span className="text-sm">Importar</span>
          </button>

          <button
            onClick={handlePublicar}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-3 rounded-2xl shadow-md flex flex-col items-center gap-1 transition-all active:scale-95"
          >
            <span className="text-2xl">📤</span>
            <span className="text-sm">Publicar</span>
          </button>

          <button
            onClick={handleComprobarActualizacion}
            disabled={updateEstado === 'comprobando'}
            className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-3 rounded-2xl shadow-md flex flex-col items-center gap-1 transition-all active:scale-95"
          >
            <span className="text-2xl">{updateEstado === 'comprobando' ? '⏳' : '🔄'}</span>
            <span className="text-sm">{updateEstado === 'comprobando' ? 'Buscando…' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Resultado comprobación de actualización */}
        {updateEstado === 'actualizado' && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-3 text-sm text-green-800 font-semibold text-center animate-aparecer">
            ✅ ¡Contenido actualizado! Se han descargado nuevas fichas y ejercicios.
          </div>
        )}
        {updateEstado === 'sinCambios' && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm text-gray-600 text-center animate-aparecer">
            ✓ Ya tienes la versión más reciente del contenido.
          </div>
        )}
        {updateEstado === 'offline' && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-sm text-amber-700 text-center animate-aparecer">
            📡 Sin conexión. Conéctate a internet e inténtalo de nuevo.
          </div>
        )}
        {updateEstado === 'error' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700 text-center animate-aparecer">
            ❌ Error al comprobar actualizaciones. Inténtalo de nuevo.
          </div>
        )}

        {/* Estado exportación */}
        {exportEstado === 'copiado' && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-sm">
            <p className="font-bold text-emerald-800 mb-1">✅ JSON copiado al portapapeles</p>
            <p className="text-emerald-700">Ahora ve a Claude Code y escribe:</p>
            <code className="block mt-2 bg-white rounded-lg px-3 py-2 text-xs text-gray-800 border border-gray-200">
              "actualiza ejercicios con esto:" y pega el contenido
            </code>
            <p className="text-emerald-600 text-xs mt-2">Claude Code actualizará ejercicios.json y hará el push a GitHub automáticamente. Todos los dispositivos recibirán el contenido en ~1 minuto.</p>
          </div>
        )}
        {exportEstado === 'descargado' && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-4 text-sm">
            <p className="font-bold text-blue-800 mb-1">📁 Descargado ejercicios.json</p>
            <p className="text-blue-700">Arrastra el archivo descargado a Claude Code y escribe:</p>
            <code className="block mt-2 bg-white rounded-lg px-3 py-2 text-xs text-gray-800 border border-gray-200">
              "actualiza ejercicios con este archivo"
            </code>
          </div>
        )}
        {exportEstado === 'vacio' && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-sm text-amber-700">
            ⚠️ No hay fichas importadas todavía. Importa primero con el botón 📥.
          </div>
        )}
        {exportEstado === 'error' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-3 text-sm text-red-700">
            ❌ Error al exportar. Revisa la consola.
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
