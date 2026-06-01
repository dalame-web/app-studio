import { openDB } from 'idb';

const DB_NAME = 'edu-app';
const DB_VERSION = 2;

let _db = null;

export async function getDB() {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('profiles', { keyPath: 'id', autoIncrement: true });

        const logStore = db.createObjectStore('exercise_log', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('profileSubject', ['profileId', 'subject']);
        logStore.createIndex('profileFicha', ['profileId', 'fichaId']);
        logStore.createIndex('session', 'sessionId');

        const sessStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessStore.createIndex('profileSubject', ['profileId', 'subject']);

        db.createObjectStore('subject_stats', { keyPath: 'profileId_subject' });
        db.createObjectStore('gamificacion', { keyPath: 'profileId' });
        db.createObjectStore('content_version', { keyPath: 'id' });

        const fichasStore = db.createObjectStore('fichas', { keyPath: 'id' });
        fichasStore.createIndex('subject', 'subject');

        const exStore = db.createObjectStore('ejercicios', { keyPath: 'id' });
        exStore.createIndex('fichaId', 'fichaId');
        exStore.createIndex('subjectNivel', ['subject', 'nivel']);
      }
      if (oldVersion < 2) {
        // v2: rastreo de progreso por ficha individual
        const fpStore = db.createObjectStore('ficha_progress', { keyPath: 'id' });
        fpStore.createIndex('profileId', 'profileId');
        fpStore.createIndex('fichaId', 'fichaId');
      }
    },
  });
  return _db;
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function getAllProfiles() {
  return (await getDB()).getAll('profiles');
}

export async function getProfile(id) {
  return (await getDB()).get('profiles', id);
}

export async function createProfile(nombre, avatar = '⭐') {
  const db = await getDB();
  const id = await db.add('profiles', { nombre, avatar, creadoEn: Date.now() });
  return db.get('profiles', id);
}

export async function getOrCreateDefaultProfile() {
  const profiles = await getAllProfiles();
  if (profiles.length > 0) return profiles[0];
  return createProfile('Alumno', '⭐');
}

// ── Exercise log ──────────────────────────────────────────────────────────────

export async function logExercise(data) {
  return (await getDB()).add('exercise_log', { ...data, timestamp: Date.now() });
}

export async function getExerciseLogForFicha(profileId, fichaId) {
  return (await getDB()).getAllFromIndex('exercise_log', 'profileFicha', [profileId, fichaId]);
}

export async function getExerciseLogForSubject(profileId, subject) {
  return (await getDB()).getAllFromIndex('exercise_log', 'profileSubject', [profileId, subject]);
}

export async function countTotalExercises(profileId) {
  const db = await getDB();
  const all = await db.getAll('exercise_log');
  return all.filter(e => e.profileId === profileId).length;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(data) {
  const db = await getDB();
  const id = await db.add('sessions', data);
  return id;
}

export async function updateSession(id, updates) {
  const db = await getDB();
  const session = await db.get('sessions', id);
  await db.put('sessions', { ...session, ...updates });
}

export async function getRecentSessions(profileId, subject, limit = 2) {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'profileSubject', [profileId, subject]);
  return all.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0)).slice(0, limit);
}

export async function getSessionsForSubjectCount(profileId, subject) {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'profileSubject', [profileId, subject]);
  return all.length;
}

// ── Subject stats ─────────────────────────────────────────────────────────────

const defaultStats = (profileId, subject) => ({
  profileId_subject: `${profileId}_${subject}`,
  profileId,
  subject,
  nivelActual: 1,
  totalAttempts: 0,
  correctAttempts: 0,
  accuracy: null,
  weakTypes: [],
  lastSessionDate: null,
  streakDays: 0,
});

export async function getSubjectStats(profileId, subject) {
  return (await getDB()).get('subject_stats', `${profileId}_${subject}`);
}

export async function upsertSubjectStats(profileId, subject, updates) {
  const db = await getDB();
  const existing = (await db.get('subject_stats', `${profileId}_${subject}`)) ?? defaultStats(profileId, subject);
  await db.put('subject_stats', { ...existing, ...updates });
}

export async function getAllSubjectStats(profileId) {
  const all = await (await getDB()).getAll('subject_stats');
  return all.filter(s => s.profileId === profileId);
}

// ── Gamification ──────────────────────────────────────────────────────────────

const defaultGami = (profileId) => ({
  profileId,
  xpTotal: 0,
  rachaDias: 0,
  rachaMaxima: 0,
  ultimaSesionFecha: null,
  insignias: [],
});

export async function getGamificacion(profileId) {
  return (await getDB()).get('gamificacion', profileId);
}

export async function upsertGamificacion(profileId, updates) {
  const db = await getDB();
  const existing = (await db.get('gamificacion', profileId)) ?? defaultGami(profileId);
  await db.put('gamificacion', { ...existing, ...updates });
}

// ── Content ───────────────────────────────────────────────────────────────────

export async function getContentVersion() {
  return (await getDB()).get('content_version', 'current');
}

export async function setContentVersion(version) {
  await (await getDB()).put('content_version', { id: 'current', version, descargadoEn: Date.now() });
}

export async function storeContent(fichas, ejercicios) {
  const db = await getDB();
  const tx = db.transaction(['fichas', 'ejercicios'], 'readwrite');
  await tx.objectStore('fichas').clear();
  await tx.objectStore('ejercicios').clear();
  for (const f of fichas) await tx.objectStore('fichas').put(f);
  for (const e of ejercicios) await tx.objectStore('ejercicios').put(e);
  await tx.done;
}

export async function getFichasBySubject(subject) {
  return (await getDB()).getAllFromIndex('fichas', 'subject', subject);
}

export async function getFicha(id) {
  return (await getDB()).get('fichas', id);
}

export async function getEjerciciosByFicha(fichaId) {
  return (await getDB()).getAllFromIndex('ejercicios', 'fichaId', fichaId);
}

export async function getAllEjerciciosBySubject(subject) {
  const db = await getDB();
  const all = await db.getAll('ejercicios');
  return all.filter(e => e.subject === subject);
}

// ── Ficha progress ────────────────────────────────────────────────────────────

const defaultFichaProgress = (profileId, fichaId) => ({
  id: `${profileId}_${fichaId}`,
  profileId,
  fichaId,
  firstCompletedDate: null,
  bestAccuracy: 0,
  totalSessions: 0,
  superada: false,
  reviewDates: [],   // ISO strings: +3d, +7d, +14d desde primera vez superada
  reviewsDone: 0,
});

export async function getFichaProgress(profileId, fichaId) {
  return (await getDB()).get('ficha_progress', `${profileId}_${fichaId}`);
}

export async function upsertFichaProgress(profileId, fichaId, updates) {
  const db = await getDB();
  const existing = (await db.get('ficha_progress', `${profileId}_${fichaId}`))
    ?? defaultFichaProgress(profileId, fichaId);
  await db.put('ficha_progress', { ...existing, ...updates });
}

export async function getAllFichaProgress(profileId) {
  return (await getDB()).getAllFromIndex('ficha_progress', 'profileId', profileId);
}

export async function resetAllProgress(profileId) {
  const db = await getDB();
  const all = await db.getAllFromIndex('ficha_progress', 'profileId', profileId);
  const tx = db.transaction('ficha_progress', 'readwrite');
  for (const fp of all) await tx.store.delete(fp.id);
  await tx.done;
}

// ── Export (genera ejercicios.json completo desde IndexedDB) ─────────────────

/**
 * Lee todas las fichas + ejercicios de IndexedDB y devuelve el JSON completo
 * listo para reemplazar public/ejercicios.json.
 */
export async function exportarContenidoCompleto() {
  const db = await getDB();
  const fichas = await db.getAll('fichas');
  const ejercicios = await db.getAll('ejercicios');

  // Agrupar ejercicios por fichaId
  const ejPorFicha = {};
  for (const ej of ejercicios) {
    if (!ejPorFicha[ej.fichaId]) ejPorFicha[ej.fichaId] = [];
    ejPorFicha[ej.fichaId].push(ej);
  }

  // Reconstruir fichas con ejercicios embebidos
  const fichasConEjercicios = fichas
    .sort((a, b) => a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id))
    .map(f => ({
      ...f,
      ejercicios: (ejPorFicha[f.id] ?? []).sort((a, b) => (a.nivel ?? 1) - (b.nivel ?? 1)),
    }));

  const fecha = new Date().toISOString().slice(0, 10);
  const version = `${fecha}-${Date.now().toString(36)}`;

  return {
    version,
    fecha,
    fichas: fichasConEjercicios,
  };
}

// ── Import (manual upload from admin) ───────────────────────────────────────

/**
 * Importa fichas validadas en IndexedDB.
 * @param {string} asignatura - id de la asignatura
 * @param {Array} fichas - array de fichas con ejercicios embebidos
 * @param {'añadir'|'reemplazar'} modo
 * @returns {Promise<{fichasImportadas:number, ejerciciosImportados:number, sustituidas:string[]}>}
 */
export async function importarFichas(asignatura, fichas, modo = 'añadir') {
  const db = await getDB();
  const tx = db.transaction(['fichas', 'ejercicios', 'content_version'], 'readwrite');
  const fichasStore = tx.objectStore('fichas');
  const ejStore     = tx.objectStore('ejercicios');

  const sustituidas = [];

  if (modo === 'reemplazar') {
    const todasFichas = await fichasStore.getAll();
    for (const f of todasFichas) {
      if (f.subject === asignatura) {
        await fichasStore.delete(f.id);
        sustituidas.push(f.id);
      }
    }
    const todosEj = await ejStore.getAll();
    for (const e of todosEj) {
      if (e.subject === asignatura) await ejStore.delete(e.id);
    }
  }

  let fichasImportadas = 0;
  let ejerciciosImportados = 0;

  for (const ficha of fichas) {
    const { ejercicios = [], ...fichaSinEjercicios } = ficha;

    if (modo === 'añadir') {
      const existente = await fichasStore.get(ficha.id);
      if (existente) {
        // Sustituimos la ficha y sus ejercicios viejos
        sustituidas.push(ficha.id);
        const todosEj = await ejStore.getAll();
        for (const e of todosEj) {
          if (e.fichaId === ficha.id) await ejStore.delete(e.id);
        }
      }
    }

    await fichasStore.put(fichaSinEjercicios);
    fichasImportadas++;

    for (const ej of ejercicios) {
      await ejStore.put({ ...ej, fichaId: ficha.id, subject: ficha.subject });
      ejerciciosImportados++;
    }
  }

  // Bump content_version (timestamp) para reflejar el cambio
  const versionStore = tx.objectStore('content_version');
  await versionStore.put({
    id: 'current',
    version: `manual-${Date.now()}`,
    descargadoEn: Date.now(),
  });

  await tx.done;
  return { fichasImportadas, ejerciciosImportados, sustituidas };
}
