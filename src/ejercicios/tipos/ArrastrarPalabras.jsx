// G6: instrucción + G7: elementos drag más pequeños
import { useState } from 'react';
import { DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import BotonAudio from '../../components/BotonAudio';
import ChipInstruccion from '../ChipInstruccion';
import MediaRender from '../MediaRender';

function Draggable({ id, children, usado }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled: usado });
  const style = {
    touchAction: 'none',
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
  };
  return (
    // G7: padding reducido, texto más pequeño
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-2 py-1 rounded-lg border-2 text-xs font-semibold cursor-grab active:cursor-grabbing select-none transition-all ${
        usado ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' :
        isDragging ? 'border-blue-400 bg-blue-50 shadow-md z-10 scale-105' :
        'border-gray-300 bg-white hover:border-blue-300 shadow-sm'
      }`}
    >
      {children}
    </div>
  );
}

function Droppable({ id, children, lleno }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <span
      ref={setNodeRef}
      className={`inline-flex items-center px-3 py-1 min-w-[70px] rounded-lg border-2 border-dashed text-sm font-bold transition-colors ${
        lleno ? 'border-indigo-400 bg-indigo-50 text-indigo-800' :
        isOver ? 'border-blue-500 bg-blue-100' :
        'border-gray-300 bg-white text-gray-400'
      }`}
    >
      {children ?? '___'}
    </span>
  );
}

export default function ArrastrarPalabras({ ejercicio, intentos, fichaContenido, asignatura, onCorrecto, onIncorrecto }) {
  const respuestasCorrectas = ejercicio.respuestasCorrectas ?? [];
  const numRanuras = respuestasCorrectas.length;
  const [ranuras, setRanuras] = useState(() => Array(numRanuras).fill(null));
  const idioma = asignatura === 'ingles' ? 'en-US' : 'es-ES';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } }),
  );
  const partes = ejercicio.fraseConHuecos?.split('[___]') ?? [''];

  function handleDragEnd({ active, over }) {
    if (!over) return;
    const ranuraid = parseInt(over.id.replace('ranura-', ''), 10);
    const palabra = active.id;
    setRanuras(prev => {
      const nuevo = [...prev];
      const prevIdx = nuevo.indexOf(palabra);
      if (prevIdx !== -1) nuevo[prevIdx] = null;
      nuevo[ranuraid] = palabra;
      return nuevo;
    });
  }

  function comprobar() {
    const correcto = respuestasCorrectas.every((r, i) => ranuras[i] === r);
    if (correcto) onCorrecto();
    else { onIncorrecto(); setRanuras(Array(numRanuras).fill(null)); }
  }

  const usadas = new Set(ranuras.filter(Boolean));
  const todoLleno = ranuras.every(r => r !== null);
  const pistaTexto = ejercicio.pista ?? 'Fíjate en el orden de la frase.';
  const pista = intentos === 1 ? pistaTexto : intentos >= 2 ? `Orden: ${respuestasCorrectas.join(', ')}` : null;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 py-4">
        <div className="relative bg-white rounded-2xl shadow-sm p-5">
          <BotonAudio texto={ejercicio.fraseConHuecos?.replace(/\[___\]/g, '...')} idioma={idioma} />
          <p className="text-sm font-semibold text-gray-500 mb-2 pr-12">Arrastra las palabras:</p>
          <div className="flex flex-wrap items-center gap-1.5 text-gray-800 text-base leading-relaxed">
            {partes.map((parte, i) => (
              <span key={i} className="contents">
                <span>{parte}</span>
                {i < numRanuras && (
                  <Droppable id={`ranura-${i}`} lleno={!!ranuras[i]}>
                    {ranuras[i]}
                  </Droppable>
                )}
              </span>
            ))}
          </div>
          <MediaRender imagen={ejercicio.imagenEnunciado} svg={ejercicio.svgEnunciado} />
          {/* G6 */}
          <ChipInstruccion tipo="ArrastrarPalabras" />
          {pista && <p className="mt-2 text-sm text-amber-600 font-medium">{pista}</p>}
        </div>

        {/* G7: banco compacto */}
        <div className="flex flex-wrap gap-1.5 justify-center">
          {ejercicio.banco?.map(p => (
            <Draggable key={p} id={p} usado={usadas.has(p)}>{p}</Draggable>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setRanuras(Array(numRanuras).fill(null))}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-2xl"
          >
            🔄 Borrar
          </button>
          <button
            onClick={comprobar}
            disabled={!todoLleno}
            className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-2xl shadow active:scale-95"
          >
            Comprobar ✓
          </button>
        </div>
      </div>
    </DndContext>
  );
}
