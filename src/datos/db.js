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

export async function getContentVersion(key = 'current') {
  return (await getDB()).get('content_version', key);
}

export async function setContentVersion(version, key = 'current') {
  await (await getDB()).put('content_version', { id: key, version, descargadoEn: Date.now() });
}

// storeContent NO borra todo — hace upsert por ficha/ejercicio para no perder otras asignaturas
export async function storeContent(fichas, ejercicios) {
  const db = await getDB();
  const tx = db.transaction(['fichas', 'ejercicios'], 'readwrite');
  for (const f of fichas) await tx.objectStore('fichas').put(f);
  for (const e of ejercicios) await tx.objectStore('ejercicios').put(e);
  await tx.done;
}

export async function getSyncedSubjects() {
  const all = await (await getDB()).getAll('content_version');
  return all.filter(v => v.id.startsWith('subject_')).map(v => v.id.slice('subject_'.length));
}

// Borra fichas/ejercicios/versión SOLO de una asignatura (p.ej. si desaparece del manifest)
export async function clearContentForSubject(subject) {
  const db = await getDB();
  const tx = db.transaction(['fichas', 'ejercicios', 'content_version'], 'readwrite');

  const fichasStore = tx.objectStore('fichas');
  for (const f of await fichasStore.getAll()) {
    if (f.subject === subject) await fichasStore.delete(f.id);
  }

  const ejStore = tx.objectStore('ejercicios');
  for (const e of await ejStore.getAll()) {
    if (e.subject === subject) await ejStore.delete(e.id);
  }

  await tx.objectStore('content_version').delete(`subject_${subject}`);
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

  // Borrar ficha_progress
  const fpAll = await db.getAllFromIndex('ficha_progress', 'profileId', profileId);
  const tx1 = db.transaction('ficha_progress', 'readwrite');
  for (const fp of fpAll) await tx1.store.delete(fp.id);
  await tx1.done;

  // Borrar subject_stats del perfil
  const allStats = await db.getAll('subject_stats');
  const tx2 = db.transaction('subject_stats', 'readwrite');
  for (const s of allStats) {
    if (s.profileId === profileId) await tx2.store.delete(s.profileId_subject);
  }
  await tx2.done;

  // Resetear gamificacion a ceros
  await upsertGamificacion(profileId, {
    xpTotal: 0,
    rachaDias: 0,
    rachaMaxima: 0,
    ultimaSesionFecha: null,
    insignias: [],
  });
}

export async function clearContent() {
  const db = await getDB();

  // Borrar fichas y ejercicios
  const tx = db.transaction(['fichas', 'ejercicios'], 'readwrite');
  await tx.objectStore('fichas').clear();
  await tx.objectStore('ejercicios').clear();
  await tx.done;

  // Borrar TODOS los registros de versión (tanto 'current' como 'subject_*')
  // para que el próximo sync descargue de cero sin creer que ya está actualizado
  const allVersions = await db.getAll('content_version');
  if (allVersions.length > 0) {
    const tx2 = db.transaction('content_version', 'readwrite');
    for (const v of allVersions) await tx2.store.delete(v.id);
    await tx2.done;
  }
}

// Respaldo automático a almacenamiento nativo (Directory.Data) — más duradero
// que IndexedDB, que en el WebView de Android puede vaciarse bajo presión de
// espacio del sistema. Solo dentro de la app instalada; en la PWA no aplica
// (no hay almacenamiento nativo, y el export manual sigue disponible ahí).
// Falla en silencio: es una red de seguridad extra, nunca debe romper el guardado normal.
export async function respaldarProgresoNativo(profileId) {
  if (!window.Capacitor?.isNativePlatform?.()) return;
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const backup = await exportarProgreso(profileId);
    await Filesystem.writeFile({
      path: 'backup-progreso-auto.json',
      data: JSON.stringify(backup),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
  } catch (e) {
    console.warn('[db] respaldo automático falló:', e.message);
  }
}

// ── Backup de progreso (XP, racha, insignias, historial — NO contenido) ──────
// El contenido (fichas/ejercicios) ya vive en GitHub y se puede volver a descargar.
// Esto es solo lo que existe únicamente en este dispositivo.

export async function exportarProgreso(profileId) {
  const db = await getDB();
  const profile        = await db.get('profiles', profileId);
  const exerciseLog    = (await db.getAll('exercise_log')).filter(e => e.profileId === profileId);
  const sessions       = (await db.getAll('sessions')).filter(s => s.profileId === profileId);
  const subjectStats   = await getAllSubjectStats(profileId);
  const gamificacion   = await getGamificacion(profileId);
  const fichaProgress  = await getAllFichaProgress(profileId);

  return {
    tipo: 'backup-progreso-edu-app',
    version: 1,
    exportadoEn: new Date().toISOString(),
    profile: { nombre: profile?.nombre, avatar: profile?.avatar },
    exerciseLog,
    sessions,
    subjectStats,
    gamificacion,
    fichaProgress,
  };
}

export async function importarProgreso(profileId, backup) {
  if (backup?.tipo !== 'backup-progreso-edu-app') {
    throw new Error('Archivo no reconocido como backup de progreso de esta app.');
  }
  const db = await getDB();

  const tx1 = db.transaction('exercise_log', 'readwrite');
  for (const e of backup.exerciseLog ?? []) {
    const rest = { ...e, profileId };
    delete rest.id;
    await tx1.store.add(rest);
  }
  await tx1.done;

  const tx2 = db.transaction('sessions', 'readwrite');
  for (const s of backup.sessions ?? []) {
    const rest = { ...s, profileId };
    delete rest.id;
    await tx2.store.add(rest);
  }
  await tx2.done;

  for (const s of backup.subjectStats ?? []) {
    const rest = { ...s };
    delete rest.profileId_subject;
    delete rest.profileId;
    const { subject } = rest;
    delete rest.subject;
    await upsertSubjectStats(profileId, subject, rest);
  }

  if (backup.gamificacion) {
    const rest = { ...backup.gamificacion };
    delete rest.profileId;
    await upsertGamificacion(profileId, rest);
  }

  for (const fp of backup.fichaProgress ?? []) {
    const rest = { ...fp };
    delete rest.id;
    delete rest.profileId;
    const { fichaId } = rest;
    delete rest.fichaId;
    await upsertFichaProgress(profileId, fichaId, rest);
  }

  return {
    exerciseLog: backup.exerciseLog?.length ?? 0,
    sessions: backup.sessions?.length ?? 0,
    subjectStats: backup.subjectStats?.length ?? 0,
    fichaProgress: backup.fichaProgress?.length ?? 0,
  };
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
