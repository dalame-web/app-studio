import { getContentVersion, setContentVersion, storeContent } from './db';

const BASE = import.meta.env.BASE_URL;
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

// Devuelve true si descargó algo nuevo
async function syncSubject(subject, version) {
  const stored = await getContentVersion(`subject_${subject}`);
  if (stored?.version === version) return false;

  const url = `${BASE}content/${subject}.json`;
  const raw = await fetchJSON(url, { cache: 'no-cache' });
  const { fichas, ejercicios } = splitContent(raw);
  await storeContent(fichas, ejercicios);
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
      for (const [subject, info] of Object.entries(manifest.asignaturas)) {
        const actualizado = await syncSubject(subject, info.version);
        if (actualizado) hayNuevo = true;
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
