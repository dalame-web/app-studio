// Actualización OTA del código de la app (JS/HTML/CSS) sin pasar por reinstalar
// el APK. Solo tiene efecto dentro de la app nativa (Capacitor) — en el navegador
// (PWA en Vercel) cada carga de página ya trae el código más reciente sin más.
//
// Mismo patrón que contentSync.js: manifest estático (BASE + app-bundle.json),
// comparación de versión en el cliente, fallo silencioso si no hay red.
//
// Seguridad: si el bundle nuevo falla al arrancar, CapacitorUpdater vuelve solo
// al anterior a los 10s (notifyAppReady() nunca llamado a tiempo → rollback).

const esNativo = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
const REMOTE_BASE = 'https://app-studio-pri.vercel.app/';
const MANIFEST_URL = `${REMOTE_BASE}app-bundle.json`;

// Devuelve un estado para que la UI (botón "Actualizar app") pueda informar:
// 'web' (no aplica, es la PWA) | 'sin-conexion' | 'sin-cambios' | 'actualizando' | 'error'
export async function checkAndApplyAppUpdate() {
  if (!esNativo) return 'web';

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

    // Confirma que el bundle actual arrancó bien — si esto no se llama a tiempo,
    // el plugin deshace la actualización anterior automáticamente.
    await CapacitorUpdater.notifyAppReady();

    if (!navigator.onLine) return 'sin-conexion';

    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) return 'error';
    const manifest = await res.json();

    if (!manifest?.version || manifest.version === __APP_VERSION__) return 'sin-cambios';

    const bundle = await CapacitorUpdater.download({
      version: manifest.version,
      url: manifest.url,
      checksum: manifest.checksum,
    });
    await CapacitorUpdater.set(bundle);
    // set() recarga la app de inmediato con el bundle nuevo — lo de después de
    // esta línea normalmente no llega a ejecutarse.
    return 'actualizando';
  } catch (e) {
    console.warn('[appUpdater] fallo comprobando actualización:', e.message);
    return 'error';
  }
}
