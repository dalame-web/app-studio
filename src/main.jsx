import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Registrar Service Worker para PWA offline — SOLO en el navegador. Dentro de la
// app instalada (Capacitor) las actualizaciones van por appUpdater.js/CapacitorUpdater;
// tener los dos sistemas gestionando la misma caché de archivos causaba un bucle de
// pantalla en blanco al pulsar "Actualizar app".
const esNativo = window.Capacitor?.isNativePlatform?.();
if (!esNativo && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = import.meta.env.BASE_URL + 'sw.js';
    navigator.serviceWorker.register(swUrl, {
      scope: import.meta.env.BASE_URL,
    }).then(reg => {
      console.log('[SW] registrado, scope:', reg.scope);
    }).catch(err => {
      console.warn('[SW] registro fallido:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
