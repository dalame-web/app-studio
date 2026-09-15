import { useState } from 'react';
import MotorEjercicio from '../ejercicios/MotorEjercicio';
import { Campo, NumberInput, Select, TextInput } from './campos';
import EditorEleccionMultiple from './tipos/EditorEleccionMultiple';
import EditorRellenarHueco from './tipos/EditorRellenarHueco';
import EditorArrastrarPalabras from './tipos/EditorArrastrarPalabras';
import EditorOrdenarFrase from './tipos/EditorOrdenarFrase';
import EditorUnirColumnas from './tipos/EditorUnirColumnas';
import EditorClasificarGrupos from './tipos/EditorClasificarGrupos';
import EditorCompletarSerie from './tipos/EditorCompletarSerie';
import EditorSopaLetras from './tipos/EditorSopaLetras';
import EditorMemoriaPareja from './tipos/EditorMemoriaPareja';
import EditorProblemaVisual from './tipos/EditorProblemaVisual';
import EditorComprensionLectora from './tipos/EditorComprensionLectora';

const EDITORES = {
  EleccionMultiple: EditorEleccionMultiple,
  RellenarHueco: EditorRellenarHueco,
  ArrastrarPalabras: EditorArrastrarPalabras,
  OrdenarFrase: EditorOrdenarFrase,
  UnirColumnas: EditorUnirColumnas,
  ClasificarGrupos: EditorClasificarGrupos,
  CompletarSerie: EditorCompletarSerie,
  SopaLetras: EditorSopaLetras,
  MemoriaPareja: EditorMemoriaPareja,
  ProblemaVisual: EditorProblemaVisual,
  ComprensionLectora: EditorComprensionLectora,
};

// Texto corto para identificar el ejercicio en la fila colapsada, sin tener
// que desplegarlo. Cada tipo guarda su enunciado en un campo distinto.
function resumenEjercicio(ejercicio) {
  const texto =
    ejercicio.enunciado ||
    ejercicio.fraseConHuecos ||
    ejercicio.texto ||
    ejercicio.fraseCorrecta ||
    (ejercicio.palabras && `Palabras: ${ejercicio.palabras.join(', ')}`) ||
    '';
  const limpio = String(texto).replace(/\s+/g, ' ').trim();
  return limpio ? (limpio.length > 80 ? limpio.slice(0, 80) + '…' : limpio) : '(sin enunciado todavía)';
}

export default function EditorEjercicio({ ejercicio, ficha, onChange, onEliminar, onSubir, onBajar, esPrimero, esUltimo, numero }) {
  const [expandido, setExpandido] = useState(false);
  const [verPreview, setVerPreview] = useState(true);
  const EditorTipo = EDITORES[ejercicio.tipo];

  function set(campo, val) {
    onChange({ ...ejercicio, [campo]: val });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      {/* Fila compacta, siempre visible — pulsar en ella expande/colapsa */}
      <button
        type="button"
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span className="text-xs text-gray-400 font-bold w-6 shrink-0">{numero}</span>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">{ejercicio.tipo}</span>
        <span className="text-sm text-gray-600 truncate flex-1">{resumenEjercicio(ejercicio)}</span>
        <span className="text-gray-300 shrink-0">{expandido ? '▲' : '▼'}</span>
      </button>

      {expandido && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" onClick={onSubir} disabled={esPrimero} title="Mover arriba" className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">↑</button>
              <button type="button" onClick={onBajar} disabled={esUltimo} title="Mover abajo" className="w-7 h-7 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30">↓</button>
              <button type="button" onClick={onEliminar} title="Eliminar ejercicio" className="w-7 h-7 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600">🗑️</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Campo label="Nivel" className="w-24">
              <Select value={String(ejercicio.nivel ?? 1)} onChange={v => set('nivel', Number(v))} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
            </Campo>
            <Campo label="Tiempo estimado (seg)" className="w-40">
              <NumberInput value={ejercicio.tiempoEstimado} onChange={v => set('tiempoEstimado', v)} />
            </Campo>
          </div>

          {/* Genérico para los 11 tipos — MediaRender.jsx ya lo pinta en el
              enunciado de todos ellos. NotebookLM no genera imágenes (es un
              chat de texto); esta es la vía para las que aportes tú a mano,
              guardadas en public/img/ (ej. diagramas de partes de una planta,
              del cuerpo humano...). Déjalo vacío si el ejercicio no necesita
              imagen — la mayoría no la necesitan. */}
          <Campo label="Imagen del enunciado (opcional — ruta en public/img/, ej. img/planta.png)">
            <TextInput value={ejercicio.imagenEnunciado ?? ''} onChange={v => set('imagenEnunciado', v || undefined)} placeholder="img/nombre-archivo.png" />
          </Campo>

          {EditorTipo ? (
            <EditorTipo ejercicio={ejercicio} onChange={onChange} />
          ) : (
            <p className="text-sm text-red-500">Tipo "{ejercicio.tipo}" no reconocido.</p>
          )}

          <button type="button" onClick={() => setVerPreview(v => !v)} className="text-xs font-semibold text-gray-500 hover:text-gray-700">
            {verPreview ? '🙈 Ocultar vista previa' : '👁 Ver vista previa'}
          </button>
          {verPreview && (
            <div className="bg-gray-50 rounded-xl p-3">
              {/* key con el contenido: algunos tipos (MemoriaPareja, ClasificarGrupos) guardan
                  su propio estado interno solo al montar y no lo vuelven a leer de las props —
                  sin esto, la vista previa se queda con datos viejos al editar. */}
              <MotorEjercicio key={JSON.stringify(ejercicio)} ejercicio={ejercicio} asignatura={ficha.subject} fichaContenido={ficha.contenido} preview />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
