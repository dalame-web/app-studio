import { getEjerciciosByFicha, getExerciseLogForFicha, getSubjectStats } from './db';

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

// Devuelve { ejercicios, baseLength }
// baseLength = nº de ejercicios "principales"; los siguientes son el repaso rápido (3 preguntas extra)
export async function seleccionarEjercicios(profileId, fichaId, subject) {
  const stats = await getSubjectStats(profileId, subject);
  const nivelActual = stats?.nivelActual ?? 1;

  const todos = await getEjerciciosByFicha(fichaId);
  if (todos.length === 0) return { ejercicios: [], baseLength: 0 };

  // 80% nivel actual, 20% buffer de otros niveles
  const delNivel = todos.filter(e => e.nivel === nivelActual);
  const buffer   = todos.filter(e => e.nivel !== nivelActual);
  const pool = [
    ...delNivel,
    ...buffer.slice(0, Math.max(1, Math.floor(delNivel.length * 0.25))),
  ];

  // Pesos por historial
  const logs = await getExerciseLogForFicha(profileId, fichaId);
  const logMap = {};
  for (const log of logs) {
    if (!logMap[log.exerciseId]) logMap[log.exerciseId] = [];
    logMap[log.exerciseId].push(log);
  }

  const weights  = pool.map(e => calcWeight(e, logMap));
  let candidatos = weightedShuffle(pool, weights);

  // Anti-repetición: no dos del mismo tipo consecutivos
  const base = [];
  for (const e of candidatos) {
    const ultimo = base[base.length - 1];
    if (ultimo?.tipo !== e.tipo) {
      base.push(e);
    } else {
      base.splice(base.length - 1, 0, e);
    }
  }

  // Repaso rápido: 3 preguntas extra elegidas al azar de las ya seleccionadas
  const repaso = [...base].sort(() => Math.random() - 0.5).slice(0, Math.min(3, base.length));

  return { ejercicios: [...base, ...repaso], baseLength: base.length };
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
