import { getEjerciciosByFicha, getExerciseLogForFicha, getSubjectStats } from './db';

const TIEMPO_CORTO_MAX = 7 * 60; // 7 min en segundos
const TIPOS_LARGOS = ['SopaLetras', 'MemoriaPareja', 'ComprensionLectora'];

function calcRecencyScore(lastTimestamp) {
  if (!lastTimestamp) return 1;
  const daysSince = (Date.now() - lastTimestamp) / 86400000;
  return 1 / (daysSince + 1);
}

function calcWeight(ejercicio, logMap) {
  const logs = logMap[ejercicio.id] ?? [];
  const accuracy = logs.length === 0 ? 0.5 : logs.filter(l => l.correct).length / logs.length;
  const lastLog = logs.sort((a, b) => b.timestamp - a.timestamp)[0];
  const recency = calcRecencyScore(lastLog?.timestamp);
  return (1 - accuracy) * 0.7 + recency * 0.3;
}

function weightedShuffle(items, weights) {
  const indexed = items.map((item, i) => ({ item, weight: weights[i] }));
  const result = [];
  while (indexed.length > 0) {
    const total = indexed.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < indexed.length; i++) {
      r -= indexed[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    result.push(indexed[idx].item);
    indexed.splice(idx, 1);
  }
  return result;
}

export async function seleccionarEjercicios(profileId, fichaId, subject, modo = 'corto') {
  const stats = await getSubjectStats(profileId, subject);
  const nivelActual = stats?.nivelActual ?? 1;

  let todos = await getEjerciciosByFicha(fichaId);
  if (todos.length === 0) return [];

  // Separate by level
  const delNivel = todos.filter(e => e.nivel === nivelActual);
  const buffer = todos.filter(e => e.nivel !== nivelActual);

  // 80% current level, 20% buffer
  const pool = [
    ...delNivel,
    ...buffer.slice(0, Math.max(1, Math.floor(delNivel.length * 0.25))),
  ];

  // Build log map for weighting
  const logs = await getExerciseLogForFicha(profileId, fichaId);
  const logMap = {};
  for (const log of logs) {
    if (!logMap[log.exerciseId]) logMap[log.exerciseId] = [];
    logMap[log.exerciseId].push(log);
  }

  const weights = pool.map(e => calcWeight(e, logMap));
  let candidatos = weightedShuffle(pool, weights);

  // Anti-repetition: no two same types consecutive
  const sinRepeticion = [];
  for (const e of candidatos) {
    const ultimo = sinRepeticion[sinRepeticion.length - 1];
    if (ultimo?.tipo !== e.tipo) {
      sinRepeticion.push(e);
    } else {
      sinRepeticion.splice(sinRepeticion.length - 1, 0, e);
    }
  }

  if (modo === 'largo') return sinRepeticion;

  // Modo corto: limit by time, max 1 long type
  let tiempoAcumulado = 0;
  let tiposLargosUsados = 0;
  const seleccionados = [];

  for (const e of sinRepeticion) {
    const esLargo = TIPOS_LARGOS.includes(e.tipo);
    if (esLargo && tiposLargosUsados >= 1) continue;
    if (tiempoAcumulado + (e.tiempoEstimado ?? 30) > TIEMPO_CORTO_MAX && seleccionados.length >= 3) break;

    seleccionados.push(e);
    tiempoAcumulado += e.tiempoEstimado ?? 30;
    if (esLargo) tiposLargosUsados++;
  }

  return seleccionados;
}

export async function actualizarNivel(profileId, subject, recentSessions) {
  if (recentSessions.length < 1) return null;
  const accuracies = recentSessions.map(s => (s.correctCount ?? 0) / Math.max(s.totalExercises ?? 1, 1));
  const media = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  const stats = await import('./db').then(m => m.getSubjectStats(profileId, subject));
  const nivelActual = stats?.nivelActual ?? 1;

  if (media > 0.80) return Math.min(nivelActual + 1, 3);
  if (media < 0.50) return Math.max(nivelActual - 1, 1);
  return nivelActual;
}
