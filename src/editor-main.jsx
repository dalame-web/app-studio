import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EditorFichas from './editor/EditorFichas.jsx'

// Entrypoint SOLO de desarrollo local (editor.html) — no está enlazado desde
// index.html ni en rollupOptions.input, así que "npm run build" no lo genera.
// No registra Service Worker: es una herramienta de escritorio, no la PWA.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EditorFichas />
  </StrictMode>,
)
