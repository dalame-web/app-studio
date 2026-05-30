import { getContentVersion, setContentVersion, storeContent } from './db';

// Base URL respeta el `base` configurado en vite.config.js
// En GitHub Pages = '/app-studio/', en dev = '/'
const BASE = import.meta.env.BASE_URL;
const MANIFEST_URL = `${BASE}manifest.json`;
const CONTENT_URL  = `${BASE}ejercicios.json`;

function splitContent(raw) {
  const fichas = raw.fichas.map(({ ejercicios: _ex, ...rest }) => rest);
  const ejercicios = raw.fichas.flatMap(f => f.ejercicios);
  return { fichas, ejercicios };
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

export async function checkAndSyncContent() {
  if (!navigator.onLine) return false;
  try {
    const manifest = await fetchJSON(MANIFEST_URL, { cache: 'no-cache' });
    const stored = await getContentVersion();
    if (stored?.version === manifest.version) return false;

    const raw = await fetchJSON(CONTENT_URL, { cache: 'no-cache' });
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
    try {
      const raw = await fetchJSON(CONTENT_URL);
      const { fichas, ejercicios } = splitContent(raw);
      await storeContent(fichas, ejercicios);
      await setContentVersion(raw.version ?? '1.0.0');
    } catch (e) {
      console.error('[contentSync] failed to load bundled content:', e.message);
    }
  }
  // Always try a network sync (no-op if version matches)
  checkAndSyncContent().catch(() => {});
}
