// Herramienta LOCAL para crear/editar fichas con vista previa interactiva y
// validación en vivo. No forma parte de la PWA (no se registra ni se construye
// en `npm run build` / `npm run build:capacitor` — solo existe vía `npm run dev`
// abriendo /editor.html). No toca IndexedDB ni la app del niño.
//
// Flujo: lee el JSON ya publicado de public/content/{asignatura}/{fichaId}.json
// (misma fuente que usa git — un archivo por ficha, no todas mezcladas), edita
// una ficha con campos visuales (no JSON a mano) y
// el motor de ejercicios real en modo preview, valida con el validador real,
// y al terminar descarga un .json listo para "npm run publicar -- ese-archivo.json"
// (commit + push a git, igual que el flujo normal de contenido generado con Claude).
//
// Navegación: Inicio (botones por asignatura) → Asignatura (fichas agrupadas
// por nivel) → Ficha (edición). "+ Nueva ficha" vive solo en Inicio.
import { useEffect, useMemo, useRef, useState } from 'react';
import { validarFicha, TIPOS_VALIDOS } from '../datos/validacion';
import { rebalancearPosicionesEM } from '../datos/rebalanceo';
import { ASIGNATURAS } from '../pantallas/PantallaInicio';
import { Campo, TextInput, TextArea, Select, ListaTextos } from './campos';
import { nuevoEjercicio } from './plantillas';
import EditorEjercicio from './EditorEjercicio';
import { CURSO_ACTUAL } from '../config';

const PLANTILLA_FICHA = (subject) => ({
  id: '',
  subject,
  titulo: '',
  nivel: 1,
  curso: CURSO_ACTUAL,
  contenido: '',
  ejemplos: [],
  palabrasClave: [],
  ejercicios: [],
});

// public/content/{subject}/ es un directorio: index.json (lista ligera:
// id/titulo/nivel/numEjercicios) + un .json por ficha. Aquí solo hace falta
// lo ligero — la ficha completa (con ejercicios) se carga al pulsar "Editar".
async function cargarIndiceAsignatura(subjectId) {
  try {
    const res = await fetch(`/content/${subjectId}/index.json`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.fichas ?? [];
  } catch {
    return [];
  }
}

async function cargarFichaCompleta(subjectId, fichaId) {
  const res = await fetch(`/content/${subjectId}/${fichaId}.json`);
  if (!res.ok) throw new Error(`No se pudo cargar ${subjectId}/${fichaId}.json`);
  return res.json();
}

export default function EditorFichas() {
  const [porAsignatura, setPorAsignatura] = useState(null); // null = cargando
  const [asignaturaActual, setAsignaturaActual] = useState(null); // id de asignatura | null
  const [editando, setEditando] = useState(null); // ficha en edición | null
  const [creandoEn, setCreandoEn] = useState(''); // id de asignatura elegida en "+ Nueva ficha"
  const [cargandoFicha, setCargandoFicha] = useState(false);
  // Id de la última petición de "abrir ficha" lanzada — si dos clics se solapan
  // (doble clic, o clic en otra fila antes de que responda la anterior), la
  // respuesta que llegue más tarde por red ganaba sin importar cuál se pidió
  // al final. Con esto, una respuesta de una petición ya superada se ignora.
  const peticionFichaRef = useRef(0);

  // Iba directamente en el cuerpo del componente (sin useEffect): en desarrollo
  // React ejecuta el cuerpo dos veces (StrictMode), así que pedía el índice de
  // cada asignatura por duplicado en cada arranque.
  useEffect(() => {
    let cancelado = false;
    Promise.all(ASIGNATURAS.map(async a => ({ ...a, fichas: await cargarIndiceAsignatura(a.id) })))
      .then(datos => { if (!cancelado) setPorAsignatura(datos); });
    return () => { cancelado = true; };
  }, []);

  if (porAsignatura === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Cargando fichas de public/content/…
      </div>
    );
  }

  async function abrirFicha(f) {
    const idPeticion = ++peticionFichaRef.current;
    setCargandoFicha(true);
    try {
      const completa = await cargarFichaCompleta(asignaturaActual, f.id);
      if (idPeticion !== peticionFichaRef.current) return; // otro clic más reciente ya está en marcha
      setEditando(completa);
    } finally {
      if (idPeticion === peticionFichaRef.current) setCargandoFicha(false);
    }
  }
  function crearFicha(subjectId) {
    setAsignaturaActual(subjectId);
    setEditando(PLANTILLA_FICHA(subjectId));
    setCreandoEn('');
  }

  if (cargandoFicha) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
        Cargando ficha…
      </div>
    );
  }

  if (editando) {
    return (
      <EditorFicha
        fichaInicial={editando}
        onVolver={() => setEditando(null)}
      />
    );
  }

  const asignatura = asignaturaActual ? porAsignatura.find(a => a.id === asignaturaActual) : null;

  if (asignatura) {
    const porNivel = { 1: [], 2: [], 3: [] };
    for (const f of asignatura.fichas) {
      (porNivel[f.nivel] ?? porNivel[1]).push(f);
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-4 bg-white border-b">
          <button onClick={() => setAsignaturaActual(null)} className="text-gray-500 hover:bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center">←</button>
          <h1 className="text-lg font-bold text-gray-800">{asignatura.emoji} {asignatura.nombre}</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-5">
          {asignatura.fichas.length === 0 && <p className="text-sm text-gray-400">Esta asignatura no tiene fichas todavía.</p>}
          {[1, 2, 3].map(nivel => (
            porNivel[nivel].length === 0 ? null : (
              <div key={nivel}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Nivel {nivel}</p>
                <div className="space-y-2">
                  {porNivel[nivel].map(f => (
                    <button
                      key={f.id}
                      onClick={() => abrirFicha(f)}
                      className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-blue-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{f.titulo}</p>
                        <p className="text-xs text-gray-400">{f.id} · {f.numEjercicios ?? 0} ejercicios</p>
                      </div>
                      <span className="text-gray-300 shrink-0 ml-2">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-4 py-4 bg-white border-b">
        <h1 className="text-lg font-bold text-gray-800">Editor de fichas (local)</h1>
        <p className="text-xs text-gray-400 mt-1">
          Lee de public/content/*/*.json (una ficha por archivo). No toca la app ni IndexedDB — al
          guardar descarga un .json para <code>npm run publicar</code>.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-4">
        {creandoEn === '' ? (
          <button
            onClick={() => setCreandoEn(ASIGNATURAS[0].id)}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            + Nueva ficha
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-3">
            <Select value={creandoEn} onChange={setCreandoEn} options={ASIGNATURAS.map(a => ({ value: a.id, label: `${a.emoji} ${a.nombre}` }))} className="flex-1" />
            <button onClick={() => crearFicha(creandoEn)} className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors">Crear</button>
            <button onClick={() => setCreandoEn('')} className="text-sm text-gray-400 hover:text-gray-600 px-2">Cancelar</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {porAsignatura.map(a => (
            <button
              key={a.id}
              onClick={() => setAsignaturaActual(a.id)}
              className="flex flex-col items-center gap-1 bg-white border border-gray-200 rounded-xl py-5 hover:border-blue-300 transition-colors"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-sm font-semibold text-gray-700">{a.nombre}</span>
              <span className="text-xs text-gray-400">{a.fichas.length} ficha{a.fichas.length === 1 ? '' : 's'}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function EditorFicha({ fichaInicial, onVolver }) {
  const [ficha, setFicha] = useState(fichaInicial);
  const [tipoNuevo, setTipoNuevo] = useState(TIPOS_VALIDOS[0]);
  const [validacion, setValidacion] = useState(null);
  const [verJson, setVerJson] = useState(false);
  const [guardandoLocal, setGuardandoLocal] = useState(false);
  const [guardadoLocalOk, setGuardadoLocalOk] = useState(false);

  // Los ejercicios embebidos siempre deben apuntar a la ficha que los contiene —
  // si el id/subject de la ficha cambia, se corrige aquí en vez de dejar que se
  // desincronice silenciosamente (eso rompía validarFicha con errores confusos).
  const fichaNormalizada = useMemo(() => ({
    ...ficha,
    ejercicios: (ficha.ejercicios ?? []).map(ej => ({ ...ej, fichaId: ficha.id, subject: ficha.subject })),
  }), [ficha]);

  const meta = ASIGNATURAS.find(a => a.id === ficha.subject);
  const ejercicios = ficha.ejercicios ?? [];

  function set(campo, val) {
    setFicha(f => ({ ...f, [campo]: val }));
    setValidacion(null);
  }
  function setEjercicio(i, nuevoEj) {
    const next = ejercicios.map((ej, idx) => (idx === i ? nuevoEj : ej));
    set('ejercicios', next);
  }
  function eliminarEjercicio(i) {
    set('ejercicios', ejercicios.filter((_, idx) => idx !== i));
  }
  function moverEjercicio(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= ejercicios.length) return;
    const next = [...ejercicios];
    [next[i], next[j]] = [next[j], next[i]];
    set('ejercicios', next);
  }
  function añadirEjercicio() {
    set('ejercicios', [...ejercicios, nuevoEjercicio(tipoNuevo, ficha, ejercicios.length)]);
  }

  function handleValidar() {
    setValidacion(validarFicha(fichaNormalizada));
  }

  function handleDescargar() {
    const [rebalanceada] = rebalancearPosicionesEM([fichaNormalizada]);
    const blob = new Blob([JSON.stringify(rebalanceada, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ficha.id || 'ficha-nueva'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Escribe la ficha directamente en public/content/{subject}/ del disco (vía el
  // servidor de "npm run dev", ver vite.config.js) — SIN pasar por git/publicar.
  // Así se puede ver en la app real (localhost:5173/) haciendo "Borrar contenido
  // y recargar" en el admin, para probar cambios antes de publicarlos de verdad.
  async function handleGuardarLocal() {
    setGuardandoLocal(true);
    setGuardadoLocalOk(false);
    try {
      const [rebalanceada] = rebalancearPosicionesEM([fichaNormalizada]);
      const res = await fetch('/__editor-api/guardar-ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rebalanceada),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error desconocido');
      setGuardadoLocalOk(true);
    } catch (e) {
      alert(`No se pudo guardar en local: ${e.message}`);
    } finally {
      setGuardandoLocal(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center gap-3 px-4 py-4 bg-white border-b">
        <button onClick={onVolver} className="text-gray-500 hover:bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center">←</button>
        <h1 className="text-lg font-bold text-gray-800">
          {meta ? <>{meta.emoji} {meta.nombre}</> : 'Editar ficha'}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-4">
        {/* Cabecera de la ficha */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex gap-3">
            <Campo label="ID de la ficha" className="flex-1">
              <TextInput value={ficha.id} onChange={v => set('id', v)} placeholder="ej. mat-013" />
            </Campo>
            <Campo label="Nivel" className="w-24">
              <Select value={String(ficha.nivel ?? 1)} onChange={v => set('nivel', Number(v))} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
            </Campo>
            <Campo label="Curso" className="w-24">
              <Select value={String(ficha.curso ?? CURSO_ACTUAL)} onChange={v => set('curso', Number(v))} options={[{ value: '3', label: '3º' }, { value: '4', label: '4º' }, { value: '5', label: '5º' }, { value: '6', label: '6º' }]} />
            </Campo>
          </div>
          <Campo label="Título">
            <TextInput value={ficha.titulo} onChange={v => set('titulo', v)} />
          </Campo>
          <Campo label="Contenido / explicación (lo que lee el niño antes de empezar)">
            <TextArea value={ficha.contenido} onChange={v => set('contenido', v)} rows={4} />
          </Campo>
          <Campo label="Ejemplos">
            <ListaTextos items={ficha.ejemplos} onChange={v => set('ejemplos', v)} placeholder="Ejemplo..." />
          </Campo>
          <Campo label="Palabras clave">
            <ListaTextos items={ficha.palabrasClave} onChange={v => set('palabrasClave', v)} placeholder="palabra" />
          </Campo>
          <Campo label="Vídeo explicación (opcional — enlace de YouTube)">
            <TextInput value={ficha.videoExplicacion} onChange={v => set('videoExplicacion', v || undefined)} placeholder="https://youtu.be/..." />
          </Campo>
        </div>

        {/* Ejercicios */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 px-1">Ejercicios ({ejercicios.length})</p>
          {ejercicios.map((ej, i) => (
            <EditorEjercicio
              key={ej.id || i}
              numero={i + 1}
              ejercicio={ej}
              ficha={fichaNormalizada}
              onChange={nuevoEj => setEjercicio(i, nuevoEj)}
              onEliminar={() => eliminarEjercicio(i)}
              onSubir={() => moverEjercicio(i, -1)}
              onBajar={() => moverEjercicio(i, 1)}
              esPrimero={i === 0}
              esUltimo={i === ejercicios.length - 1}
            />
          ))}
          <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-2">
            <Select value={tipoNuevo} onChange={setTipoNuevo} options={TIPOS_VALIDOS} className="flex-1" />
            <button
              onClick={añadirEjercicio}
              className="text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl px-4 py-2 transition-colors whitespace-nowrap"
            >
              + Añadir ejercicio
            </button>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleValidar}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow transition-all active:scale-95"
          >
            🔎 Validar
          </button>
          <button
            onClick={handleGuardarLocal}
            disabled={validacion?.valida !== true || guardandoLocal}
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow transition-all active:scale-95"
          >
            {guardandoLocal ? '⏳ Guardando...' : '📲 Ver en la app'}
          </button>
          <button
            onClick={handleDescargar}
            disabled={validacion?.valida !== true}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow transition-all active:scale-95"
          >
            ⬇️ Descargar JSON
          </button>
        </div>

        {guardadoLocalOk && (
          <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-3 text-sm text-indigo-800">
            ✅ Guardado en tu ordenador (public/content/{ficha.subject}/{ficha.id}.json). Para verla:
            en la app real (<code>localhost:5173/</code>) → Administración → <strong>"Borrar contenido y recargar desde cero"</strong>.
            No borra el progreso del niño, solo vuelve a descargar el contenido.
          </div>
        )}

        <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-3 text-xs text-sky-800">
          "Ver en la app" guarda en tu disco pero NO en git — sigue sin publicarse. "Descargar JSON"
          te da el archivo para publicarlo de verdad:
          <code className="block mt-1 bg-white/70 rounded px-2 py-1">npm run publicar -- ruta/al/archivo.json</code>
        </div>

        {validacion && (
          <>
            {validacion.valida ? (
              <div className="rounded-2xl border-2 bg-green-50 border-green-300 p-4">
                <p className="font-bold text-green-800">✅ Validación correcta</p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 bg-red-50 border-red-300 p-4">
                <p className="font-bold text-red-800 mb-2">
                  ❌ {validacion.errores.length} error{validacion.errores.length === 1 ? '' : 'es'} crítico{validacion.errores.length === 1 ? '' : 's'}
                </p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1 max-h-72 overflow-y-auto">
                  {validacion.errores.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
            {validacion.warnings?.length > 0 && (
              <div className="rounded-2xl border-2 bg-amber-50 border-amber-300 p-4">
                <p className="font-bold text-amber-800 mb-2">
                  ⚠️ {validacion.warnings.length} aviso{validacion.warnings.length === 1 ? '' : 's'}
                </p>
                <ul className="text-sm text-amber-700 list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
                  {validacion.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
          </>
        )}

        {/* JSON generado, para quien quiera verlo/copiarlo */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <button onClick={() => setVerJson(v => !v)} className="text-sm font-semibold text-gray-600 hover:text-gray-800">
            {verJson ? '▼' : '▶'} Ver JSON generado
          </button>
          {verJson && (
            <pre className="mt-2 text-xs bg-gray-50 rounded-xl p-3 overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(fichaNormalizada, null, 2)}
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}
