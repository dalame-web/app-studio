import { useEffect, useState } from 'react';
import useSesionStore from '../store/sesionStore';
import useGamificacionStore from '../store/gamificacionStore';
import Confeti from '../components/Confeti';
import {
  updateSession,
  upsertSubjectStats,
  getSubjectStats,
  logExercise,
  countTotalExercises,
  getSessionsForSubjectCount,
  getRecentSessions,
  getFichaProgress,
  upsertFichaProgress,
} from '../datos/db';
import { actualizarNivel } from '../datos/selector';

const INSIGNIAS = [
  { id: 'primera-sesion',       check: ({ totalSesiones }) => totalSesiones >= 1,         emoji: '🏅', nombre: 'Primera sesión' },
  { id: 'racha-3',              check: ({ racha }) => racha >= 3,                          emoji: '🔥', nombre: 'Racha de 3 días' },
  { id: 'racha-7',              check: ({ racha }) => racha >= 7,                          emoji: '🌟', nombre: 'Racha de 7 días' },
  { id: '100-ejercicios',       check: ({ totalEjercicios }) => totalEjercicios >= 100,    emoji: '💯', nombre: '100 ejercicios' },
  { id: 'todas-asignaturas',    check: ({ sesionesAsig }) => sesionesAsig >= 6,            emoji: '🎓', nombre: 'Todas las asignaturas' },
  { id: 'nivel-2',              check: ({ nivelNuevo }) => nivelNuevo >= 2,                emoji: '⬆️',  nombre: 'Nivel 2' },
  { id: 'nivel-3',              check: ({ nivelNuevo }) => nivelNuevo >= 3,                emoji: '🚀', nombre: 'Nivel 3' },
];

function estrellas(accuracy) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.6) return 2;
  return 1;
}

export default function PantallaResultado() {
  const { sesionId, ejercicios, correctas, incorrectas, profileId, asignaturaActual, fichaActual, nivelAnterior, nivelNuevo: nivelNuevoStore } = useSesionStore();
  const setNivelResultado = useSesionStore(s => s.setNivelResultado);
  const volverAInicio     = useSesionStore(s => s.volverAInicio);
  const irA               = useSesionStore(s => s.irA);

  const { actualizarRacha, agregarXP, desbloquearInsignia, calcularXPSesion, rachaDias, insignias } = useGamificacionStore();

  const [confeti, setConfeti]           = useState(false);
  const [insigniasNuevas, setInsigniasNuevas] = useState([]);
  const [nivelInfo, setNivelInfo]       = useState(null);
  const [xpGanado, setXpGanado]         = useState(0);
  const [guardado, setGuardado]         = useState(false);

  const total    = ejercicios.length;
  const accuracy = total > 0 ? correctas / total : 0;
  const stars    = estrellas(accuracy);

  useEffect(() => {
    if (guardado || !sesionId || !profileId) return;
    setGuardado(true);
    guardarSesion();
  }, []);

  async function guardarSesion() {
    // Update session record
    await updateSession(sesionId, {
      endTime: Date.now(),
      correctCount: correctas,
      incorrectCount: incorrectas,
      totalExercises: total,
    });

    // Update subject stats
    const prevStats = await getSubjectStats(profileId, asignaturaActual);
    const prevNivel = prevStats?.nivelActual ?? 1;
    const prevTotal = prevStats?.totalAttempts ?? 0;
    const prevCorrect = prevStats?.correctAttempts ?? 0;

    await upsertSubjectStats(profileId, asignaturaActual, {
      totalAttempts: prevTotal + total,
      correctAttempts: prevCorrect + correctas,
      accuracy: (prevCorrect + correctas) / (prevTotal + total),
      lastSessionDate: Date.now(),
    });

    // Adaptive level
    const recentSessions = await getRecentSessions(profileId, asignaturaActual, 2);
    const nuevoNivel = await actualizarNivel(profileId, asignaturaActual, recentSessions);
    if (nuevoNivel !== null && nuevoNivel !== prevNivel) {
      await upsertSubjectStats(profileId, asignaturaActual, { nivelActual: nuevoNivel });
      setNivelResultado(prevNivel, nuevoNivel);
      setNivelInfo({ anterior: prevNivel, nuevo: nuevoNivel });
      if (nuevoNivel > prevNivel) setConfeti(true);
    }

    // Gamification
    const racha = await actualizarRacha(profileId);
    const xp    = calcularXPSesion(correctas, total, 0);
    await agregarXP(profileId, xp);
    setXpGanado(xp);

    // Badges
    const totalEjercicios = await countTotalExercises(profileId);
    const totalSesiones   = await getSessionsForSubjectCount(profileId, asignaturaActual);

    // Count distinct subjects with sessions (rough approximation)
    const sesionesAsig = 1; // will be properly counted in Phase 4

    const ctx = { racha, totalEjercicios, totalSesiones, sesionesAsig, nivelNuevo: nuevoNivel ?? prevNivel };
    const nuevas = [];
    for (const insignia of INSIGNIAS) {
      if (!insignias.includes(insignia.id) && insignia.check(ctx)) {
        const desbloqueada = await desbloquearInsignia(profileId, insignia.id);
        if (desbloqueada) nuevas.push(insignia);
      }
    }
    if (nuevas.length > 0) { setInsigniasNuevas(nuevas); setConfeti(true); }

    if (stars === 3) setConfeti(true);

    // I2: guardar progreso de la ficha individual
    if (fichaActual?.id) {
      const prevFP   = await getFichaProgress(profileId, fichaActual.id);
      const nuevaAcc = Math.max(prevFP?.bestAccuracy ?? 0, accuracy);
      const esSuperada = nuevaAcc >= 0.7;
      const updates = {
        totalSessions: (prevFP?.totalSessions ?? 0) + 1,
        bestAccuracy:  nuevaAcc,
        superada:      esSuperada,
      };
      if (esSuperada && !prevFP?.superada) {
        // Primera vez superada → programar repasos espaciados
        const hoy = new Date();
        updates.firstCompletedDate = hoy.toISOString();
        updates.reviewDates = [
          new Date(hoy.getTime() + 3  * 86400000).toISOString(),
          new Date(hoy.getTime() + 7  * 86400000).toISOString(),
          new Date(hoy.getTime() + 14 * 86400000).toISOString(),
        ];
        updates.reviewsDone = 0;
      }
      await upsertFichaProgress(profileId, fichaActual.id, updates);
    }
  }

  const mensajeNivel = nivelInfo
    ? nivelInfo.nuevo > nivelInfo.anterior
      ? '¡Estás subiendo de nivel! 🎉'
      : 'Vamos a practicar más los fundamentos. ¡Tú puedes! 💪'
    : null;

  const mensajeAccuracy = accuracy >= 0.9 ? '¡Excelente trabajo! 🌟' : accuracy >= 0.6 ? '¡Muy bien! Sigue así 👏' : 'Sigue practicando, ¡mejorarás! 📚';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex flex-col items-center justify-center p-6">
      <Confeti activo={confeti} onFin={() => setConfeti(false)} />

      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center animate-aparecer">
        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3].map(n => (
            <span key={n} className={`text-5xl transition-all ${n <= stars ? 'opacity-100' : 'opacity-20'}`}>⭐</span>
          ))}
        </div>

        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">
          {mensajeNivel ?? mensajeAccuracy}
        </h1>

        <p className="text-gray-500 text-base mb-6">
          {correctas} de {total} correctas · {Math.round(accuracy * 100)}%
        </p>

        {/* XP badge */}
        {xpGanado > 0 && (
          <div className="inline-flex items-center gap-2 bg-yellow-100 border border-yellow-300 rounded-full px-4 py-2 mb-4">
            <span className="text-xl">⭐</span>
            <span className="font-bold text-yellow-700">+{xpGanado} XP</span>
          </div>
        )}

        {/* New badges */}
        {insigniasNuevas.length > 0 && (
          <div className="mb-4 flex flex-col items-center gap-2">
            {insigniasNuevas.map(ins => (
              <div key={ins.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2 animate-insignia">
                <span className="text-2xl">{ins.emoji}</span>
                <span className="font-semibold text-indigo-700 text-sm">¡Nueva insignia: {ins.nombre}!</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => irA('fichas')}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-lg font-bold rounded-2xl shadow transition-all"
          >
            Practicar otra ficha
          </button>
          <button
            onClick={volverAInicio}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-2xl transition-all"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
