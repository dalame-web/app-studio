import { getContentVersion, setContentVersion, storeContent, getSyncedSubjects, clearContentForSubject } from './db';

// Dentro de la APK (Capacitor) los assets van empaquetados y no hay "red" local
// de la que descargar contenido nuevo — apuntamos siempre a la web publicada para
// poder seguir actualizando fichas sin publicar una APK nueva cada vez.
const REMOTE_BASE = 'https://app-studio-pri.vercel.app/';
const esNativo = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
const BASE = esNativo ? REMOTE_BASE : import.meta.env.BASE_URL;
const MANIFEST_URL  = `${BASE}manifest.json`;
const LEGACY_URL    = `${BASE}ejercicios.json`; // fallback pre-split

function splitContent(raw) {
  const fichas     = raw.fichas.map(({ ejercicios: _ex, ...rest }) => rest);
  const ejercicios = raw.fichas.flatMap(f => f.ejercicios ?? []);
  return { fichas, ejercicios };
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

// Devuelve true si descargó algo nuevo.
// public/content/{subject}/ es un directorio: index.json (lista ligera) + un
// .json por ficha (antes era un único content/{subject}.json con todas dentro).
async function syncSubject(subject, version) {
  const stored = await getContentVersion(`subject_${subject}`);
  if (stored?.version === version) return false;

  const indice = await fetchJSON(`${BASE}content/${subject}/index.json`, { cache: 'no-cache' });
  const fichas = await Promise.all(
    (indice.fichas ?? []).map(f => fetchJSON(`${BASE}content/${subject}/${f.id}.json`, { cache: 'no-cache' }))
  );
  const { fichas: fichasSinEjercicios, ejercicios } = splitContent({ fichas });
  await storeContent(fichasSinEjercicios, ejercicios);
  await setContentVersion(version, `subject_${subject}`);
  return true;
}

export async function checkAndSyncContent() {
  if (!navigator.onLine) return false;
  try {
    const manifest = await fetchJSON(MANIFEST_URL, { cache: 'no-cache' });

    // Arquitectura nueva: asignaturas separadas
    if (manifest.asignaturas) {
      let hayNuevo = false;
      const subjectsManifest = new Set(Object.keys(manifest.asignaturas));
      for (const [subject, info] of Object.entries(manifest.asignaturas)) {
        const actualizado = await syncSubject(subject, info.version);
        if (actualizado) hayNuevo = true;
      }

      // Asignaturas que ya estaban descargadas pero desaparecieron del manifest
      // (p.ej. tras "vaciar contenido") se borran localmente también.
      for (const subject of await getSyncedSubjects()) {
        if (!subjectsManifest.has(subject)) {
          await clearContentForSubject(subject);
          hayNuevo = true;
        }
      }

      return hayNuevo;
    }

    // Fallback: archivo único ejercicios.json (retrocompatibilidad)
    const stored = await getContentVersion();
    if (stored?.version === manifest.version) return false;
    const raw = await fetchJSON(LEGACY_URL, { cache: 'no-cache' });
    const { fichas, ejercicios } = splitContent(raw);
    await storeContent(fichas, ejercicios);
    await setContentVersion(manifest.version);
    return true;
  } catch (e) {
    console.warn('[contentSync] sync failed:', e.message);
    return false;
  }
}

export async function initContent() {
  const stored = await getContentVersion();
  if (!stored) {
    // Primera carga: intentar manifest para saber qué descargar
    try {
      const manifest = await fetchJSON(MANIFEST_URL).catch(() => null);
      if (manifest?.asignaturas) {
        for (const [subject, info] of Object.entries(manifest.asignaturas)) {
          await syncSubject(subject, info.version);
        }
      } else {
        // Fallback archivo único
        const raw = await fetchJSON(LEGACY_URL);
        const { fichas, ejercicios } = splitContent(raw);
        await storeContent(fichas, ejercicios);
        await setContentVersion(raw.version ?? '1.0.0');
      }
    } catch (e) {
      console.error('[contentSync] failed to load content:', e.message);
    }
  }
  // Siempre intentar sync en background
  checkAndSyncContent().catch(() => {});
}
