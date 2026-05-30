// Importación manual de fichas generadas en Claude Project
import { useState } from 'react';
import { validarImportacion } from '../datos/validacion';
import { importarFichas } from '../datos/db';
import { ASIGNATURAS } from './PantallaInicio';
import { BtnVolver } from './PantallaFichas';

const PLACEHOLDER = `Pega aquí el bloque JSON que te ha devuelto Claude.

Acepta formatos:
[ { "id": "len-001", ... }, { ... } ]
o
{ "fichas": [ ... ] }
o una ficha suelta:
{ "id": "len-001", "subject": "lengua", ... }`;

export default function PantallaImportar({ onClose }) {
  const [asignatura, setAsignatura] = useState('matematicas');
  const [modo, setModo]             = useState('añadir');
  const [texto, setTexto]           = useState('');
  const [validacion, setValidacion] = useState(null); // { valida, errores, fichas, stats } | null
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado]   = useState(null); // { fichasImportadas, ... } | null
  const [errorParseo, setErrorParseo] = useState(null);

  function handleValidar() {
    setErrorParseo(null);
    setResultado(null);
    if (!texto.trim()) {
      setValidacion({ valida: false, errores: ['Pega algún JSON primero.'], fichas: [] });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(texto);
    } catch (e) {
      // Intentar extraer JSON de un bloque ```json ... ```
      const match = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try {
          parsed = JSON.parse(match[1]);
        } catch (e2) {
          setErrorParseo(`No es JSON válido: ${e2.message}`);
          setValidacion(null);
          return;
        }
      } else {
        setErrorParseo(`No es JSON válido: ${e.message}`);
        setValidacion(null);
        return;
      }
    }
    const res = validarImportacion(parsed, asignatura);
    setValidacion(res);
  }

  async function handleImportar() {
    if (!validacion?.valida) return;
    setImportando(true);
    try {
      const res = await importarFichas(asignatura, validacion.fichas, modo);
      setResultado(res);
      setTexto('');
      setValidacion(null);
    } catch (e) {
      setErrorParseo(`Error al importar: ${e.message}`);
    } finally {
      setImportando(false);
    }
  }

  const meta = ASIGNATURAS.find(a => a.id === asignatura);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 bg-white border-b shadow-sm">
        <BtnVolver onClick={onClose} colorClass="text-gray-500 hover:bg-gray-100" />
        <h1 className="text-xl font-extrabold text-gray-800">📥 Importar contenido</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-4">

        {/* Asignatura */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Asignatura destino</label>
          <div className="grid grid-cols-3 gap-2">
            {ASIGNATURAS.map(a => (
              <button
                key={a.id}
                onClick={() => { setAsignatura(a.id); setValidacion(null); setResultado(null); }}
                className={`flex flex-col items-center py-2 rounded-xl border-2 transition-all ${
                  asignatura === a.id
                    ? `${a.bg} ${a.border} ${a.text} font-bold shadow`
                    : 'bg-gray-50 border-transparent text-gray-500'
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs mt-1">{a.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modo */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">¿Cómo importar?</label>
          <div className="flex gap-2">
            <button
              onClick={() => setModo('añadir')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                modo === 'añadir' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-transparent text-gray-500'
              }`}
            >
              ➕ Añadir
              <span className="block text-xs font-normal mt-0.5">Mantiene lo existente. Sustituye fichas con mismo ID.</span>
            </button>
            <button
              onClick={() => setModo('reemplazar')}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                modo === 'reemplazar' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-gray-50 border-transparent text-gray-500'
              }`}
            >
              🔁 Reemplazar todo
              <span className="block text-xs font-normal mt-0.5">Borra TODAS las fichas de {meta?.nombre} y mete las nuevas.</span>
            </button>
          </div>
        </div>

        {/* Textarea JSON */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            JSON de fichas para <span className={meta?.text}>{meta?.emoji} {meta?.nombre}</span>
          </label>
          <textarea
            value={texto}
            onChange={e => { setTexto(e.target.value); setValidacion(null); setErrorParseo(null); }}
            placeholder={PLACEHOLDER}
            rows={12}
            className="w-full font-mono text-xs border-2 border-gray-200 rounded-xl p-3 focus:outline-none focus:border-blue-400 resize-y"
          />
          {errorParseo && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              <strong>❌ Error de parseo:</strong> {errorParseo}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleValidar}
            disabled={!texto.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow transition-all active:scale-95"
          >
            🔎 Validar
          </button>
          <button
            onClick={handleImportar}
            disabled={!validacion?.valida || importando}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow transition-all active:scale-95"
          >
            {importando ? '⏳ Importando...' : '✅ Importar'}
          </button>
        </div>

        {/* Resultado validación */}
        {validacion && !resultado && (
          <>
            {validacion.valida ? (
              <div className="rounded-2xl border-2 bg-green-50 border-green-300 p-4">
                <p className="font-bold text-green-800 mb-1">✅ Validación correcta</p>
                <p className="text-sm text-green-700">
                  Se importarán <strong>{validacion.stats.numFichas}</strong> fichas con{' '}
                  <strong>{validacion.stats.numEjercicios}</strong> ejercicios.
                </p>
                <ul className="mt-2 text-xs text-green-700 list-disc list-inside">
                  {validacion.fichas.map(f => (
                    <li key={f.id}>
                      <strong>{f.id}</strong> — {f.titulo} ({f.ejercicios?.length ?? 0} ejercicios, nivel {f.nivel})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border-2 bg-red-50 border-red-300 p-4">
                <p className="font-bold text-red-800 mb-2">
                  ❌ {validacion.errores.length} error{validacion.errores.length === 1 ? '' : 'es'} crítico{validacion.errores.length === 1 ? '' : 's'} (impide importar)
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1 max-h-72 overflow-y-auto">
                  {validacion.errores.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {validacion.warnings?.length > 0 && (
              <div className="rounded-2xl border-2 bg-amber-50 border-amber-300 p-4">
                <p className="font-bold text-amber-800 mb-2">
                  ⚠️ {validacion.warnings.length} aviso{validacion.warnings.length === 1 ? '' : 's'} (no bloquea importación, pero revisa)
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
                  {validacion.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Resultado import */}
        {resultado && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4">
            <p className="font-bold text-emerald-800 text-lg mb-2">🎉 ¡Importación completada!</p>
            <p className="text-sm text-emerald-700">
              Fichas importadas: <strong>{resultado.fichasImportadas}</strong><br />
              Ejercicios importados: <strong>{resultado.ejerciciosImportados}</strong>
              {resultado.sustituidas.length > 0 && (
                <>
                  <br />Fichas sustituidas: {resultado.sustituidas.length}
                </>
              )}
            </p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
            >
              Volver al panel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
